# weather.py
import httpx
import sys
import logging
from mcp.server.fastmcp import FastMCP

# NEVER use print() — log to stderr only
logging.basicConfig(stream=sys.stderr, level=logging.INFO)

mcp = FastMCP("Weather PoC Server")

NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "mcp-weather-poc/1.0 (gaurav@example.com)"

async def fetch_nws(url: str) -> dict:
    """Helper to call the NWS API."""
    headers = {"User-Agent": USER_AGENT, "Accept": "application/geo+json"}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, timeout=10.0, follow_redirects=True)
        r.raise_for_status()
        return r.json()

@mcp.tool()
async def get_alerts(state: str) -> str:
    """
    Get active weather alerts for a US state.

    Args:
        state: Two-letter US state code (e.g. 'CA', 'NY', 'TX')
    """
    logging.info(f"Fetching alerts for state: {state}")
    data = await fetch_nws(f"{NWS_API_BASE}/alerts/active?area={state}")
    features = data.get("features", [])
    if not features:
        return f"No active alerts for {state}."
    alerts = []
    for f in features[:5]:  # cap at 5
        p = f.get("properties", {})
        alerts.append(
            f"Event: {p.get('event')}\n"
            f"Area: {p.get('areaDesc')}\n"
            f"Severity: {p.get('severity')}\n"
            f"Headline: {p.get('headline')}\n"
        )
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """
    Get a 7-day weather forecast for a US location using coordinates.
    Only works for locations within the contiguous United States ("lower 48").

    Args:
        latitude: Latitude (must be within US, e.g. 40.7128 for New York)
        longitude: Longitude (must be within the contiguous US, e.g. -74.0060 for New York)
    """
    # (westmost to eastmost) becomes: -125 <= longitude <= -66.
    longitude_ok = -125.0 <= longitude <= -66.0
    latitude_ok = 24.0 <= latitude <= 50.0
    if not (latitude_ok and longitude_ok):
        return (
            f"Error: Coordinates ({latitude}, {longitude}) are outside the contiguous United States (lower 48). "
            "This PoC uses a simple bounding box check; the NWS API is US-covered, but not all US regions "
            "(e.g. Alaska/Hawaii) fall within these bounds. "
            "Try New York (40.7128, -74.0060) or Los Angeles (34.0522, -118.2437)."
        )

    logging.info(f"Fetching forecast for ({latitude}, {longitude})")
    point_data = await fetch_nws(f"{NWS_API_BASE}/points/{latitude},{longitude}")
    forecast_url = point_data["properties"]["forecast"]
    forecast_data = await fetch_nws(forecast_url)
    periods = forecast_data["properties"]["periods"][:6]
    return "\n\n".join(
        f"{p['name']}: {p['detailedForecast']}" for p in periods
    )

if __name__ == "__main__":
    mcp.run(transport="stdio")
