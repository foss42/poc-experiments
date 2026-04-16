import { describe, it, expect, vi, beforeEach } from "vitest";
import { TOOLS, handleCallTool } from "../src/index.js";

// Mock global fetch
global.fetch = vi.fn();

describe("MCP Server Tool Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have the correct tools defined", () => {
    expect(TOOLS).toHaveLength(3);
    expect(TOOLS.map(t => t.name)).toContain("open_eval_dashboard");
    expect(TOOLS.map(t => t.name)).toContain("test_sales_analytics_mcp");
    expect(TOOLS.map(t => t.name)).toContain("run_quick_eval");
  });

  describe("handleCallTool", () => {
    it("should return the correct resource for open_eval_dashboard", async () => {
      const result = await handleCallTool("open_eval_dashboard", {});
      expect((result.content[1] as any).resource.uri).toContain("eval-dashboard.html");
      expect(result.isError).toBeUndefined();
    });

    it("should return the correct resource for test_sales_analytics_mcp", async () => {
      const result = await handleCallTool("test_sales_analytics_mcp", {});
      expect((result.content[1] as any).resource.uri).toContain("sales-analytics-test.html");
      expect(result.isError).toBeUndefined();
    });

    it("should call the backend for run_quick_eval and return success", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ job_id: "test_job_123" }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await handleCallTool("run_quick_eval", {
        dataset: "mmlu_tiny",
        modality: "text",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/eval/run"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("mmlu_tiny"),
        })
      );
      expect(result.content[0].text).toContain("test_job_123");
      expect(result.isError).toBeUndefined();
    });

    it("should handle backend errors in run_quick_eval", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Database connection failed",
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await handleCallTool("run_quick_eval", {
        dataset: "mmlu_tiny",
        modality: "text",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Database connection failed");
    });

    it("should return an error for unknown tools", async () => {
      const result = await handleCallTool("invalid_tool", {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool not found");
    });
  });
});
