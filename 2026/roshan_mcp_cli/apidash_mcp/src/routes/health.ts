import { Router, Request, Response } from "express";

const router = Router();

const SERVER_NAME = "apidash-mcp";

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: SERVER_NAME,
    version: "2.0.0",
    tools: 13,
    resources: 6,
    transport: "streamable-http",
    sep: "SEP-1865",
  });
});

export default router;
