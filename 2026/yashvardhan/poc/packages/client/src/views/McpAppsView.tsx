import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, Text, Group, Stack, Badge, Button, Box, Code, NavLink, TextInput,
  ThemeIcon, Modal, Divider,
} from '@mantine/core';
import {
  Monitor, Play, AlertTriangle, Globe, Wrench, ArrowRight,
  ChevronRight, Layout, AppWindow,
} from 'lucide-react';
import type { ServerCapabilities, ToolInfo, InvokeResponse, JsonRpcLogEntry, AppApiCheck } from '@mcp-suite/shared';
import { api } from '../services/api';
import { parseToolArgs } from '../utils/parseToolArgs';
import IframePreview from '../components/IframePreview';
import MessageLog from '../components/MessageLog';
import ValidationPanel from '../components/ValidationPanel';

// ================================================================
// Helpers
// ================================================================

/** Get the ui:// resource URI from a tool's _meta (stored in annotations), if declared */
function getUiResourceUri(tool: ToolInfo): string | null {
  const ui = (tool.annotations as Record<string, unknown> | undefined)?.ui as Record<string, unknown> | undefined;
  const uri = ui?.resourceUri;
  return typeof uri === 'string' ? uri : null;
}

/** Check if a tool's visibility includes "model" (user-facing UI tool) vs "app"-only (iframe-internal) */
function isModelVisible(tool: ToolInfo): boolean {
  const ui = (tool.annotations as Record<string, unknown> | undefined)?.ui as Record<string, unknown> | undefined;
  const visibility = ui?.visibility;
  if (!Array.isArray(visibility)) return true; // default to visible if not specified
  return visibility.includes('model');
}

const INITIAL_CHECKS: AppApiCheck[] = [
  { name: 'Iframe sandbox enforced', status: 'pass', description: 'allow-scripts enabled, allow-same-origin blocked' },
  { name: 'UI resource loaded', status: 'pending', description: 'HTML content fetched from ui:// resource and rendered in iframe' },
  { name: 'Tool result delivered to UI', status: 'pending', description: 'Host sends ui/notifications/tool-result to iframe after invoke' },
  { name: 'UI-initiated tool call', status: 'pending', description: 'Iframe sends tools/call request to host via postMessage' },
  { name: 'Tool call approval', status: 'pending', description: 'Host shows approval dialog before forwarding iframe tool call' },
  { name: 'Model context update', status: 'pending', description: 'Iframe sends ui/update-model-context to host' },
];

function isValidJsonRpc(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.jsonrpc === '2.0' && (typeof d.method === 'string' || d.result !== undefined || d.error !== undefined);
}

function extractHtmlFromContents(contents: unknown[]): string | null {
  for (const item of contents) {
    if (typeof item !== 'object' || item === null) continue;
    const { text, mimeType } = item as Record<string, unknown>;
    if (typeof text === 'string' && (
      (typeof mimeType === 'string' && mimeType.includes('html')) ||
      text.includes('<!DOCTYPE html') || text.includes('<html')
    )) {
      return text;
    }
  }
  return null;
}

// ================================================================
// McpAppsView
// ================================================================

export default function McpAppsView({ capabilities }: { capabilities: ServerCapabilities }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Classify tools:
  // UI Tools: have _meta.ui.resourceUri AND visibility includes "model" (user-facing)
  // Standard Tools: no _meta.ui, or tools without resourceUri
  // App-only tools (visibility: ["app"]) are hidden — they're called by iframes via tools/call
  const uiTools = capabilities.tools.filter(t => getUiResourceUri(t) !== null && isModelVisible(t));
  const standardTools = capabilities.tools.filter(t => getUiResourceUri(t) === null);

  // Fallback: resources with ui:// prefix or HTML mimeType (for servers without annotations)
  const uiResources = capabilities.resources.filter(r =>
    r.uri.startsWith('ui://') || r.mimeType?.includes('html')
  );

  // Selection state
  const [selectedUiTool, setSelectedUiTool] = useState<ToolInfo | null>(null);
  const [selectedStandardTool, setSelectedStandardTool] = useState<ToolInfo | null>(null);
  const [selectedResourceUri, setSelectedResourceUri] = useState<string | null>(null);

  // Iframe state
  const [loadingResource, setLoadingResource] = useState(false);
  const [iframeContent, setIframeContent] = useState<string | null>(null);
  const [activeResourceUri, setActiveResourceUri] = useState<string | null>(null);

  // Tool invocation state
  const [toolArgs, setToolArgs] = useState<Record<string, string>>({});
  const [invoking, setInvoking] = useState(false);
  const [invokeResult, setInvokeResult] = useState<InvokeResponse | null>(null);

  // Message log & validation
  const [messageLog, setMessageLog] = useState<JsonRpcLogEntry[]>([]);
  const [checks, setChecks] = useState<AppApiCheck[]>(INITIAL_CHECKS);
  const [pendingCall, setPendingCall] = useState<{ method: string; params: Record<string, unknown>; id: unknown } | null>(null);

  // Pending delivery for chaining between resources
  const pendingDelivery = useRef<{ report: unknown; selections: unknown } | null>(null);
  // Persists across resource switches — re-delivered to each new iframe
  const lastDeliveredData = useRef<unknown>(null);
  const [hasPendingData, setHasPendingData] = useState(false);

  const activeTool = selectedStandardTool;

  // ---- Shared state updaters ----

  const updateCheck = useCallback((name: string, status: 'pass' | 'fail') => {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, status } : c));
  }, []);

  const addLogEntry = useCallback((entry: Omit<JsonRpcLogEntry, 'id' | 'timestamp'>) => {
    setMessageLog(prev => [{
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  // ---- postMessage listener ----

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      const data = event.data;
      const valid = isValidJsonRpc(data);
      const method = typeof data?.method === 'string' ? data.method : undefined;

      addLogEntry({
        direction: 'iframe-to-host',
        method,
        jsonrpcId: data?.id,
        payload: data,
        isValid: valid,
        validationError: valid ? undefined : 'Not a valid JSON-RPC 2.0 message',
      });

      if (method === 'tools/call') {
        updateCheck('UI-initiated tool call', 'pass');
        setPendingCall({ method, params: data.params ?? {}, id: data.id });
      } else if (method === 'ui/update-model-context') {
        updateCheck('Model context update', 'pass');
        // Send acknowledgment back — the iframe awaits a response for this request
        if (data.id !== undefined && iframeRef.current?.contentWindow) {
          const ack = { jsonrpc: '2.0', id: data.id, result: {} };
          iframeRef.current.contentWindow.postMessage(ack, '*');
          addLogEntry({
            direction: 'host-to-iframe',
            method: 'response to ui/update-model-context',
            jsonrpcId: data.id,
            payload: ack,
            isValid: true,
          });
        }
      } else if (method === 'ui/download-file' && data.id !== undefined && iframeRef.current?.contentWindow) {
        // Handle file download from sandboxed iframe
        const contents = (data.params?.contents ?? []) as Array<Record<string, unknown>>;
        let downloaded = false;
        for (const item of contents) {
          const resource = item.resource as Record<string, unknown> | undefined;
          if (resource?.blob && typeof resource.blob === 'string') {
            try {
              const byteChars = atob(resource.blob);
              const bytes = new Uint8Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
              const blob = new Blob([bytes], { type: (resource.mimeType as string) ?? 'application/octet-stream' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = ((resource.uri as string) ?? 'download').replace(/^file:\/\/\//, '');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              downloaded = true;
            } catch (e) {
              console.error('Download failed:', e);
            }
            break;
          }
        }
        const ack = { jsonrpc: '2.0', id: data.id, result: downloaded ? {} : { isError: true } };
        iframeRef.current.contentWindow.postMessage(ack, '*');
        addLogEntry({
          direction: 'host-to-iframe',
          method: 'response to ui/download-file',
          jsonrpcId: data.id,
          payload: ack,
          isValid: true,
        });
      } else if (data.id !== undefined && iframeRef.current?.contentWindow) {
        // Generic acknowledgment for any other request methods
        const ack = { jsonrpc: '2.0', id: data.id, result: {} };
        iframeRef.current.contentWindow.postMessage(ack, '*');
        addLogEntry({
          direction: 'host-to-iframe',
          method: `response to ${method ?? 'unknown'}`,
          jsonrpcId: data.id,
          payload: ack,
          isValid: true,
        });
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addLogEntry, updateCheck]);

  // ---- Load UI resource ----

  async function loadResource(uri: string) {
    setLoadingResource(true);
    setIframeContent(null);
    setMessageLog([]);
    setChecks(INITIAL_CHECKS);
    setInvokeResult(null);
    setPendingCall(null);

    try {
      const result = await api.readResource(uri);
      const html = extractHtmlFromContents(result.contents);
      if (html) {
        setIframeContent(html);
        setActiveResourceUri(uri);
        updateCheck('UI resource loaded', 'pass');
      } else {
        setIframeContent(null);
        setActiveResourceUri(null);
      }
    } catch (e: unknown) {
      console.error('Failed to load resource:', e);
    } finally {
      setLoadingResource(false);
    }
  }

  // ---- UI Tool click: load resource + invoke tool if it has params ----

  async function handleSelectUiTool(tool: ToolInfo) {
    setSelectedUiTool(tool);
    const uri = getUiResourceUri(tool);
    if (uri) {
      setSelectedResourceUri(uri);
      await loadResource(uri);
    }

    // If this tool has input parameters and we have data from a previous step,
    // invoke the tool to generate its output (e.g. PDF generation, visualization).
    const hasParams = Object.keys((tool.inputSchema?.properties ?? {}) as Record<string, unknown>).length > 0;
    const prevData = lastDeliveredData.current as Record<string, unknown> | null;

    if (hasParams && prevData) {
      try {
        const result = await api.invoke(tool.name, prevData);
        if (result.structuredContent) {
          // Store tool output for delivery to the iframe
          pendingDelivery.current = result.structuredContent as { report: unknown; selections: unknown };
          lastDeliveredData.current = result.structuredContent;
          setHasPendingData(true);
          // Deliver immediately if iframe is already loaded
          if (iframeRef.current?.contentWindow) {
            const message = {
              jsonrpc: '2.0',
              method: 'ui/notifications/tool-input',
              params: { structuredContent: result.structuredContent },
            };
            setTimeout(() => {
              iframeRef.current?.contentWindow?.postMessage(message, '*');
              addLogEntry({ direction: 'host-to-iframe', method: 'ui/notifications/tool-input', payload: message, isValid: true });
              updateCheck('Tool result delivered to UI', 'pass');
            }, 500);
            pendingDelivery.current = null;
            setHasPendingData(false);
          }
        }
      } catch (e) {
        console.error('Failed to invoke UI tool:', e);
      }
    }
  }

  // ---- Resource click (fallback mode) ----

  function handleSelectResource(uri: string) {
    setSelectedResourceUri(uri);
    setSelectedUiTool(null);
    loadResource(uri);
  }

  // ---- Standard tool selection ----

  function handleSelectStandardTool(tool: ToolInfo) {
    setSelectedStandardTool(tool);
    setToolArgs({});
    setInvokeResult(null);
  }

  // ---- Tool invocation ----

  async function handleInvoke() {
    if (!activeTool) return;
    setInvoking(true);
    setInvokeResult(null);

    try {
      const props = (activeTool.inputSchema?.properties ?? {}) as Record<string, { type?: string }>;
      const parsed = parseToolArgs(toolArgs, props);
      const result = await api.invoke(activeTool.name, parsed);
      setInvokeResult(result);

      // Deliver result to iframe if one is loaded
      if (iframeRef.current?.contentWindow && iframeContent) {
        // Prefer structuredContent from the API response; fall back to parsing text content
        let deliveryContent: unknown = result.structuredContent;
        if (!deliveryContent && Array.isArray(result.result)) {
          for (const item of result.result as Array<Record<string, unknown>>) {
            if (item.type === 'text' && typeof item.text === 'string') {
              try { deliveryContent = JSON.parse(item.text); } catch { deliveryContent = item.text; }
              break;
            }
          }
        }

        const selections: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(toolArgs)) {
          if (v === '') continue;
          const t = props[k]?.type;
          if (t === 'array' || t === 'object') {
            try { selections[k] = JSON.parse(v); } catch { selections[k] = v; }
          } else {
            selections[k] = v;
          }
        }

        const message = {
          jsonrpc: '2.0',
          method: 'ui/notifications/tool-input',
          params: { structuredContent: deliveryContent ?? { report: deliveryContent, selections } },
        };
        iframeRef.current.contentWindow.postMessage(message, '*');
        addLogEntry({ direction: 'host-to-iframe', method: 'ui/notifications/tool-input', payload: message, isValid: true });
        updateCheck('Tool result delivered to UI', 'pass');
        lastDeliveredData.current = message.params.structuredContent;
      }
    } catch (e: unknown) {
      setInvokeResult({ result: e instanceof Error ? e.message : 'Error', isError: true, latencyMs: 0 });
    } finally {
      setInvoking(false);
    }
  }

  // ---- Iframe onLoad (deliver pending data) ----

  function handleIframeLoad() {
    // Deliver fresh pending data, or re-deliver last known data to the new iframe
    const dataToDeliver = pendingDelivery.current ?? lastDeliveredData.current;
    if (dataToDeliver && iframeRef.current?.contentWindow) {
      const message = {
        jsonrpc: '2.0',
        method: 'ui/notifications/tool-input',
        params: { structuredContent: dataToDeliver },
      };
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(message, '*');
        addLogEntry({ direction: 'host-to-iframe', method: 'ui/notifications/tool-input', payload: message, isValid: true });
        updateCheck('Tool result delivered to UI', 'pass');
      }, 300);
      // Save for re-delivery to subsequent iframes, then clear pending
      lastDeliveredData.current = dataToDeliver;
      pendingDelivery.current = null;
      setHasPendingData(false);
    }
  }

  // ---- Tool call approval flow (from iframe) ----

  async function handleApproveCall() {
    if (!pendingCall) return;
    updateCheck('Tool call approval', 'pass');

    const params = pendingCall.params as { name?: string; arguments?: Record<string, unknown> };
    const callId = pendingCall.id;
    setPendingCall(null);

    try {
      const result = await api.invoke(params.name ?? '', params.arguments ?? {});

      if (iframeRef.current?.contentWindow) {
        const response = {
          jsonrpc: '2.0',
          id: callId,
          result: {
            content: result.result,
            structuredContent: result.structuredContent,
          },
        };
        iframeRef.current.contentWindow.postMessage(response, '*');
        addLogEntry({
          direction: 'host-to-iframe',
          method: `response to tools/call (${params.name})`,
          jsonrpcId: callId as string | number | undefined,
          payload: response,
          isValid: true,
        });
      }

      // Store result for chaining — prefer structuredContent if available
      let parsed: unknown = result.structuredContent ?? null;
      if (!parsed && Array.isArray(result.result)) {
        for (const item of result.result as Array<Record<string, unknown>>) {
          if (item.type === 'text' && typeof item.text === 'string') {
            try { parsed = JSON.parse(item.text); } catch { parsed = item.text; }
            break;
          }
        }
      }
      if (parsed) {
        pendingDelivery.current = { report: parsed, selections: params.arguments ?? {} };
        setHasPendingData(true);
      }
    } catch (e: unknown) {
      if (iframeRef.current?.contentWindow) {
        const errResponse = {
          jsonrpc: '2.0', id: callId,
          error: { code: -32000, message: e instanceof Error ? e.message : 'Tool call failed' },
        };
        iframeRef.current.contentWindow.postMessage(errResponse, '*');
        addLogEntry({
          direction: 'host-to-iframe',
          method: `error response (${params.name})`,
          jsonrpcId: callId as string | number | undefined,
          payload: errResponse,
          isValid: true,
        });
      }
    }
  }

  function handleRejectCall() {
    if (!pendingCall) return;
    if (iframeRef.current?.contentWindow) {
      const errResponse = {
        jsonrpc: '2.0', id: pendingCall.id,
        error: { code: -32001, message: 'Tool call rejected by user' },
      };
      iframeRef.current.contentWindow.postMessage(errResponse, '*');
      addLogEntry({
        direction: 'host-to-iframe',
        method: 'rejected tools/call',
        jsonrpcId: pendingCall.id as string | number | undefined,
        payload: errResponse,
        isValid: true,
      });
    }
    setPendingCall(null);
  }

  // ---- Render ----

  const hasUiContent = uiTools.length > 0 || uiResources.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', height: '100%' }}
    >
      {/* ── Explorer sidebar (left) ── */}
      <Box w={260} style={{ flexShrink: 0, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-raised)', overflow: 'auto' }}>
        <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Group gap="sm">
            <AppWindow size={12} style={{ color: '#8b5cf6' }} />
            <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">MCP Apps Explorer</Text>
          </Group>
        </Box>

        <Stack gap={0} py="xs">
          {/* UI Tools section */}
          {uiTools.length > 0 && (
            <>
              <Group px="md" py={6} gap={6}>
                <Layout size={12} style={{ color: '#8b5cf6' }} />
                <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="dimmed" flex={1}>UI Tools</Text>
                <Badge size="xs" variant="light" color="violet" radius="sm">{uiTools.length}</Badge>
              </Group>
              {uiTools.map(tool => (
                <NavLink key={tool.name}
                  label={<Text size="sm" fw={selectedUiTool?.name === tool.name ? 600 : 400} truncate>{tool.name}</Text>}
                  active={selectedUiTool?.name === tool.name}
                  onClick={() => handleSelectUiTool(tool)}
                  leftSection={
                    <ThemeIcon size={18} radius="sm" variant="light" color="violet">
                      <Monitor size={10} />
                    </ThemeIcon>
                  }
                  rightSection={
                    <Group gap={4}>
                      <Badge size="xs" variant="light" color="violet" radius="sm" tt="none">ui</Badge>
                      {selectedUiTool?.name === tool.name && <ChevronRight size={12} style={{ color: '#8b5cf6' }} />}
                    </Group>
                  }
                  styles={{
                    root: {
                      borderRadius: 0,
                      borderLeft: selectedUiTool?.name === tool.name ? '2px solid #8b5cf6' : '2px solid transparent',
                      background: selectedUiTool?.name === tool.name ? 'rgba(139,92,246,0.06)' : 'transparent',
                      color: selectedUiTool?.name === tool.name ? '#8b5cf6' : 'var(--text-secondary)',
                    },
                  }}
                />
              ))}
            </>
          )}

          {/* Resources fallback (when no UI tools, show resources directly) */}
          {uiTools.length === 0 && uiResources.length > 0 && (
            <>
              <Group px="md" py={6} gap={6}>
                <Globe size={12} style={{ color: '#8b5cf6' }} />
                <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="dimmed" flex={1}>UI Resources</Text>
                <Badge size="xs" variant="light" color="violet" radius="sm">{uiResources.length}</Badge>
              </Group>
              {uiResources.map(r => (
                <NavLink key={r.uri}
                  label={<Text size="sm" fw={selectedResourceUri === r.uri ? 600 : 400} truncate>{r.name}</Text>}
                  active={selectedResourceUri === r.uri}
                  onClick={() => handleSelectResource(r.uri)}
                  description={<Text size="xs" c="dimmed" truncate>{r.uri}</Text>}
                  leftSection={
                    <ThemeIcon size={18} radius="sm" variant="light" color="violet">
                      <Globe size={10} />
                    </ThemeIcon>
                  }
                  styles={{
                    root: {
                      borderRadius: 0,
                      borderLeft: selectedResourceUri === r.uri ? '2px solid #8b5cf6' : '2px solid transparent',
                      background: selectedResourceUri === r.uri ? 'rgba(139,92,246,0.06)' : 'transparent',
                    },
                  }}
                />
              ))}
            </>
          )}

          {/* Divider */}
          {hasUiContent && standardTools.length > 0 && (
            <Divider my="xs" color="var(--border-subtle)" />
          )}

          {/* Standard Tools section */}
          {standardTools.length > 0 && (
            <>
              <Group px="md" py={6} gap={6}>
                <Wrench size={12} style={{ color: 'var(--accent)' }} />
                <Text size="xs" fw={700} tt="uppercase" lts="0.1em" c="dimmed" flex={1}>Standard Tools</Text>
                <Badge size="xs" variant="light" color="cyan" radius="sm">{standardTools.length}</Badge>
              </Group>
              {standardTools.map(tool => (
                <NavLink key={tool.name}
                  label={<Text size="sm" fw={selectedStandardTool?.name === tool.name ? 600 : 400} truncate>{tool.name}</Text>}
                  active={selectedStandardTool?.name === tool.name}
                  onClick={() => handleSelectStandardTool(tool)}
                  leftSection={<Box w={5} h={5} style={{ borderRadius: '50%', background: selectedStandardTool?.name === tool.name ? 'var(--accent)' : 'var(--text-muted)' }} />}
                  rightSection={selectedStandardTool?.name === tool.name ? <ChevronRight size={12} style={{ color: 'var(--accent)' }} /> : null}
                  styles={{
                    root: {
                      borderRadius: 0,
                      borderLeft: selectedStandardTool?.name === tool.name ? '2px solid var(--accent)' : '2px solid transparent',
                      background: selectedStandardTool?.name === tool.name ? 'var(--accent-muted)' : 'transparent',
                      color: selectedStandardTool?.name === tool.name ? 'var(--accent)' : 'var(--text-secondary)',
                    },
                  }}
                />
              ))}
            </>
          )}

          {/* Empty state */}
          {!hasUiContent && standardTools.length === 0 && (
            <Box px="md" py="xl">
              <Text size="xs" c="dimmed" ta="center">No tools or UI resources found on this server.</Text>
            </Box>
          )}
        </Stack>
      </Box>

      {/* ── Center workspace ── */}
      <Box flex={1} style={{ overflow: 'auto' }}>
        <Box p="lg" maw={900} mx="auto">
          {/* Header */}
          <Group gap="md" mb="lg">
            <ThemeIcon size={40} radius="lg" variant="light" color="violet">
              <Monitor size={20} />
            </ThemeIcon>
            <div>
              <Text size="lg" fw={700} c="var(--text-primary)" style={{ letterSpacing: '-0.01em' }}>MCP Apps Tester</Text>
              <Text size="sm" c="dimmed">Test interactive UI resources and tool communication</Text>
            </div>
          </Group>

          {/* Pending data banner */}
          {hasPendingData && (
            <Card radius="xl" p="md" mb="md" bg="rgba(139,92,246,0.06)" withBorder style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
              <Group gap="sm">
                <ArrowRight size={16} style={{ color: '#8b5cf6' }} />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={600} c="#8b5cf6">Tool data ready to deliver</Text>
                  <Text size="xs" c="dimmed">Select a UI resource to load — data will be auto-delivered to the iframe.</Text>
                </div>
              </Group>
            </Card>
          )}

          {/* Loading indicator */}
          {loadingResource && (
            <Card radius="xl" p="xl" mb="md" bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-subtle)', textAlign: 'center' }}>
              <Text size="sm" c="dimmed">Loading UI resource...</Text>
            </Card>
          )}

          {/* Iframe preview */}
          <AnimatePresence>
            {iframeContent && activeResourceUri && (
              <Box mb="md">
                <IframePreview
                  ref={iframeRef}
                  html={iframeContent}
                  resourceUri={activeResourceUri}
                  onLoad={handleIframeLoad}
                />
              </Box>
            )}
          </AnimatePresence>

          {/* Empty state for center workspace */}
          {!iframeContent && !loadingResource && (
            <Card radius="xl" p={48} mb="md" bg="var(--bg-raised)" withBorder
              style={{ borderColor: 'var(--border-subtle)', borderStyle: 'dashed', textAlign: 'center' }}>
              <Stack align="center" gap="md">
                <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                  <Monitor size={24} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={500} c="dimmed">
                    {hasUiContent
                      ? 'Select a UI tool or resource from the explorer to load its interface'
                      : 'No UI tools or resources available on this server'}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {hasUiContent
                      ? 'The iframe will render the MCP App UI here'
                      : 'Connect to a server that implements the MCP Apps extension'}
                  </Text>
                </div>
              </Stack>
            </Card>
          )}

          {/* Tool invoker panel (below iframe, for sending data to loaded iframe) */}
          {activeTool && (
            <Card radius="xl" p="lg" bg="var(--bg-raised)" withBorder style={{ borderColor: 'var(--border-default)' }}>
              <Stack gap="md">
                <Group gap="sm">
                  <ThemeIcon size={24} radius="sm" variant="light" color="cyan">
                    <Wrench size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={600} c="var(--text-primary)">{activeTool.name}</Text>
                  {iframeContent && (
                    <Text size="10px" c="dimmed">(result delivered to iframe)</Text>
                  )}
                </Group>

                {activeTool.description && (
                  <Text size="xs" c="dimmed" lineClamp={2}>{activeTool.description}</Text>
                )}

                {Object.keys((activeTool.inputSchema?.properties ?? {}) as Record<string, unknown>).length > 0 && (
                  Object.entries(
                    (activeTool.inputSchema?.properties ?? {}) as Record<string, { type?: string; description?: string }>
                  ).map(([name, schema]) => (
                    <TextInput
                      key={name}
                      label={name}
                      placeholder={schema.description ?? `${schema.type ?? 'any'}`}
                      value={toolArgs[name] ?? ''}
                      onChange={(e) => setToolArgs({ ...toolArgs, [name]: e.target.value })}
                      styles={{
                        label: { fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 },
                        input: { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: 10 },
                      }}
                    />
                  ))
                )}

                <Button
                  variant="light" color="cyan" radius="lg" size="sm"
                  leftSection={invoking ? null : <Play size={13} />}
                  onClick={handleInvoke} disabled={invoking || !activeTool}
                  loading={invoking}
                  styles={{ root: { fontWeight: 600 } }}
                >
                  {invoking ? 'Invoking...' : iframeContent ? 'Invoke & Deliver to UI' : 'Invoke Tool'}
                </Button>

                {invokeResult && (
                  <>
                    <Divider color="var(--border-subtle)" />
                    <Group gap="sm">
                      <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">Tool Response</Text>
                      <Badge size="xs" variant="light" color={invokeResult.isError ? 'red' : 'green'} radius="sm">
                        {invokeResult.isError ? 'ERROR' : 'SUCCESS'}
                      </Badge>
                    </Group>
                    <Code block styles={{ root: { background: 'var(--bg-surface)', borderRadius: 10, padding: 12, fontSize: 11, maxHeight: 200, overflow: 'auto' } }}>
                      {JSON.stringify(invokeResult.result, null, 2)}
                    </Code>
                  </>
                )}
              </Stack>
            </Card>
          )}
        </Box>
      </Box>

      {/* ── Right panel: Validation + Message log ── */}
      <Box w={360} style={{ flexShrink: 0, borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-raised)', overflow: 'auto' }}>
        <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed">App API Inspector</Text>
        </Box>
        <Box p="md">
          <Stack gap="md">
            <ValidationPanel checks={checks} />
            <MessageLog entries={messageLog} />
          </Stack>
        </Box>
      </Box>

      {/* ── Tool call approval modal ── */}
      <Modal
        opened={!!pendingCall}
        onClose={handleRejectCall}
        title={
          <Group gap="sm">
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            <Text fw={600}>Tool Call Approval Required</Text>
          </Group>
        }
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            The iframe is requesting to invoke a server tool. This requires your approval before execution.
          </Text>
          <Card radius="md" p="md" bg="var(--bg-surface)" withBorder style={{ borderColor: 'var(--border-subtle)' }}>
            <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" mb={4}>Tool</Text>
            <Text size="sm" fw={600}>{(pendingCall?.params as Record<string, unknown>)?.name as string ?? 'unknown'}</Text>
            {(pendingCall?.params as Record<string, unknown>)?.arguments != null && (
              <>
                <Text size="10px" fw={700} tt="uppercase" lts="0.12em" c="dimmed" mt="sm" mb={4}>Arguments</Text>
                <Code block styles={{ root: { fontSize: 11, borderRadius: 8, maxHeight: 200, overflow: 'auto' } }}>
                  {JSON.stringify((pendingCall?.params as Record<string, unknown>).arguments, null, 2)}
                </Code>
              </>
            )}
          </Card>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" radius="md" onClick={handleRejectCall}>Reject</Button>
            <Button variant="gradient" gradient={{ from: 'green.5', to: 'teal.5', deg: 135 }} radius="md" onClick={handleApproveCall}>
              Approve & Execute
            </Button>
          </Group>
        </Stack>
      </Modal>
    </motion.div>
  );
}
