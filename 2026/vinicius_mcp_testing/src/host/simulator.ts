/**
 * HostSimulator — Minimal MCP Apps host powered by Playwright.
 *
 * Acts as a headless host that:
 * 1. Fetches UI HTML from the MCP server via resources/read
 * 2. Renders it in a sandboxed iframe inside a real Chromium browser
 * 3. Implements the host-side postMessage bridge (ui/initialize, tools/call, etc.)
 * 4. Provides test handles for assertions (DOM queries, bridge state, console errors)
 *
 * This simulates what VS Code or Claude Desktop does when rendering MCP Apps —
 * making it possible to test the full lifecycle: rendering, bridge communication,
 * and the text → rich UI transition.
 */

import type { Browser, BrowserContext, Page, FrameLocator } from "playwright";
import { MCPClient } from "../client.js";
import { PostMessageBridge } from "./bridge.js";
import { buildHostPage } from "./host-page.js";

// ── Types ──

export interface SimulatorOptions {
  /** Run browser in headed mode for debugging. Default: true (headless). */
  headless?: boolean;
  /** CSS custom properties to inject as hostContext. */
  hostContext?: Record<string, string>;
}

export interface AppSession {
  /** Playwright page (host wrapper). */
  page: Page;
  /** The bridge instance for this session — inspect for test assertions. */
  bridge: PostMessageBridge;
  /** Playwright FrameLocator for the sandboxed iframe. */
  iframe: FrameLocator;
  /** JS console errors captured from the iframe. */
  consoleErrors: string[];
  /** All console messages (log, warn, info) from the page. */
  consoleMessages: string[];

  /** Wait for the app to complete the ui/initialize handshake. */
  waitForHandshake(timeoutMs?: number): Promise<void>;

  /**
   * Send a ui/notifications/tool-input notification to the iframe.
   * This simulates the host pushing tool result data to the app.
   */
  sendToolInput(structuredContent: unknown): Promise<void>;

  /**
   * Send a ui/notifications/tool-result notification to the iframe.
   * This simulates the host pushing a tool result to the app.
   */
  sendToolResult(structuredContent: unknown): Promise<void>;

  /** Close this session's page. */
  close(): Promise<void>;
}

// ── Simulator ──

export class HostSimulator {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  constructor(
    private mcpClient: MCPClient,
    private options: SimulatorOptions = {}
  ) {}

  /** Launch the Chromium browser. */
  async launch(): Promise<void> {
    // Dynamic import — Playwright is only loaded when the host suite runs
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({
      headless: this.options.headless ?? true,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
  }

  /**
   * Load an MCP App by its ui:// resource URI.
   *
   * Fetches the HTML from the server, wraps it in the host page,
   * wires the postMessage bridge, and returns an AppSession handle.
   */
  async loadApp(resourceUri: string): Promise<AppSession> {
    if (!this.context) throw new Error("Simulator not launched. Call launch() first.");

    // 1. Fetch HTML from the MCP server
    const contents = await this.mcpClient.readResource(resourceUri);
    if (!contents.length || !contents[0].text) {
      throw new Error(`No HTML content returned for ${resourceUri}`);
    }
    const appHtml = contents[0].text as string;

    // 2. Build host wrapper page
    const hostHtml = buildHostPage({
      appHtml,
      hostContext: this.options.hostContext,
    });

    // 3. Create a new page and wire the bridge
    const page = await this.context.newPage();
    const bridge = new PostMessageBridge(this.mcpClient, this.options.hostContext);
    const consoleErrors: string[] = [];
    const consoleMessages: string[] = [];

    // Capture console output
    page.on("console", (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    // Expose the bridge function to the browser
    await page.exposeFunction("__hostBridge", async (msgStr: string) => {
      return bridge.handleMessage(msgStr);
    });

    // 4. Navigate to the host page
    await page.setContent(hostHtml, { waitUntil: "load" });

    // Wait for the iframe to load
    const iframe = page.frameLocator("#app-frame");

    // Build the session handle
    const session: AppSession = {
      page,
      bridge,
      iframe,
      consoleErrors,
      consoleMessages,

      waitForHandshake: (timeoutMs?: number) => bridge.waitForHandshake(timeoutMs),

      sendToolInput: async (structuredContent: unknown) => {
        const msg = JSON.stringify({
          jsonrpc: "2.0",
          method: "ui/notifications/tool-input",
          params: { structuredContent },
        });
        await page.evaluate((m) => (window as any).__sendToIframe(m), msg);
      },

      sendToolResult: async (structuredContent: unknown) => {
        const msg = JSON.stringify({
          jsonrpc: "2.0",
          method: "ui/notifications/tool-result",
          params: { structuredContent },
        });
        await page.evaluate((m) => (window as any).__sendToIframe(m), msg);
      },

      close: async () => {
        await page.close();
      },
    };

    return session;
  }

  /** Close the browser and all sessions. */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }
}
