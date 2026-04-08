from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

DEFAULT_SERVER_ROOT = Path("F:/杂物/个人开发/MCP/pdf-reader-mcp")
DEFAULT_SERVER_COMMAND = str(DEFAULT_SERVER_ROOT / ".venv" / "Scripts" / "python.exe")
DEFAULT_SERVER_ARGS = ["-m", "pdf_reader_mcp.server"]


@dataclass(slots=True)
class ToolInvocation:
    name: str
    is_error: bool
    structured_content: Any | None
    text_content: list[str]


class PdfReaderMcpClient:
    def __init__(
        self,
        server_command: str = DEFAULT_SERVER_COMMAND,
        server_args: list[str] | None = None,
        cwd: str | None = None,
    ) -> None:
        self.server_command = server_command
        self.server_args = server_args or DEFAULT_SERVER_ARGS
        self.cwd = cwd or str(DEFAULT_SERVER_ROOT)

    @staticmethod
    def _normalize_structured_content(value: Any) -> Any | None:
        if value is None:
            return None
        model_dump = getattr(value, "model_dump", None)
        if callable(model_dump):
            return model_dump()
        return value

    @staticmethod
    def _try_parse_json_text(text_content: list[str]) -> Any | None:
        for text in text_content:
            stripped = text.strip()
            if not stripped:
                continue
            if stripped[0] not in "[{":
                continue
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                continue
        return None

    async def _run_with_session(
        self,
        operation: Callable[[ClientSession], Awaitable[Any]],
    ) -> Any:
        server_params = StdioServerParameters(
            command=self.server_command,
            args=self.server_args,
            cwd=self.cwd,
        )
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                return await operation(session)

    async def list_tool_names(self) -> list[str]:
        async def operation(session: ClientSession) -> list[str]:
            result = await session.list_tools()
            return [tool.name for tool in result.tools]

        return await self._run_with_session(operation)

    async def list_tools(self) -> list[dict[str, Any]]:
        async def operation(session: ClientSession) -> list[dict[str, Any]]:
            result = await session.list_tools()
            return [tool.model_dump(mode="json") for tool in result.tools]

        return await self._run_with_session(operation)

    async def call_tool(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
    ) -> ToolInvocation:
        async def operation(session: ClientSession) -> ToolInvocation:
            result = await session.call_tool(name, arguments or {})
            text_content: list[str] = []
            for item in result.content:
                text = getattr(item, "text", None)
                if text:
                    text_content.append(text)

            structured_content = self._normalize_structured_content(result.structuredContent)
            if structured_content is None:
                structured_content = self._try_parse_json_text(text_content)

            return ToolInvocation(
                name=name,
                is_error=result.isError,
                structured_content=structured_content,
                text_content=text_content,
            )

        return await self._run_with_session(operation)

    def list_tool_names_sync(self) -> list[str]:
        return asyncio.run(self.list_tool_names())

    def list_tools_sync(self) -> list[dict[str, Any]]:
        return asyncio.run(self.list_tools())

    def call_tool_sync(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
    ) -> ToolInvocation:
        return asyncio.run(self.call_tool(name, arguments))
