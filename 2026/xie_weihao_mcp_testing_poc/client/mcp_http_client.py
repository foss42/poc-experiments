from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client
from pydantic import AnyUrl, TypeAdapter

DEFAULT_MCP_URL = "http://127.0.0.1:3000/mcp"
DEFAULT_HEALTH_URL = "http://127.0.0.1:3000/health"
DEFAULT_TIMEOUT = httpx.Timeout(30.0, read=30.0)
ANY_URL_ADAPTER = TypeAdapter(AnyUrl)


@dataclass(slots=True)
class ToolInvocation:
    name: str
    is_error: bool
    structured_content: dict[str, Any] | None
    text_content: list[str]


@dataclass(slots=True)
class ResourceContent:
    uri: str
    mime_type: str | None
    text: str
    meta: dict[str, Any] | None


class SampleMcpClient:
    def __init__(
        self,
        mcp_url: str = DEFAULT_MCP_URL,
        health_url: str = DEFAULT_HEALTH_URL,
    ) -> None:
        self.mcp_url = mcp_url
        self.health_url = health_url

    def get_health(self) -> dict[str, Any]:
        with httpx.Client(timeout=DEFAULT_TIMEOUT, trust_env=False) as client:
            response = client.get(self.health_url)
            response.raise_for_status()
            return response.json()

    async def _run_with_session(
        self,
        operation: Callable[[ClientSession], Awaitable[Any]],
    ) -> Any:
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, trust_env=False) as http_client:
            async with streamable_http_client(self.mcp_url, http_client=http_client) as (read, write, _):
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

    async def list_resources(self) -> list[dict[str, Any]]:
        async def operation(session: ClientSession) -> list[dict[str, Any]]:
            result = await session.list_resources()
            return [resource.model_dump(mode="json") for resource in result.resources]

        return await self._run_with_session(operation)

    async def read_resource(self, uri: str) -> ResourceContent:
        async def operation(session: ClientSession) -> ResourceContent:
            result = await session.read_resource(ANY_URL_ADAPTER.validate_python(uri))
            first_content = result.contents[0].model_dump(mode="json")
            return ResourceContent(
                uri=first_content["uri"],
                mime_type=first_content.get("mimeType"),
                text=first_content.get("text", ""),
                meta=first_content.get("meta"),
            )

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

            structured_content = result.structuredContent
            if structured_content is not None and not isinstance(structured_content, dict):
                model_dump = getattr(structured_content, "model_dump", None)
                if callable(model_dump):
                    structured_content = model_dump()
                else:
                    structured_content = dict(structured_content)

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

    def list_resources_sync(self) -> list[dict[str, Any]]:
        return asyncio.run(self.list_resources())

    def read_resource_sync(self, uri: str) -> ResourceContent:
        return asyncio.run(self.read_resource(uri))

    def call_tool_sync(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
    ) -> ToolInvocation:
        return asyncio.run(self.call_tool(name, arguments))
