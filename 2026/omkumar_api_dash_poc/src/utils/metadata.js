// Extract metadata like auth type

export default function enrichMetadata(data, openapi) {
  let authType = "None";

  if (openapi.components?.securitySchemes) {
    const schemes = openapi.components.securitySchemes;
    const firstScheme = Object.values(schemes)[0];

    if (firstScheme?.type === "http") {
      authType = firstScheme.scheme;
    } else if (firstScheme?.type === "apiKey") {
      authType = "API Key";
    }
  }

  return {
    ...data,
    auth: authType
  };
}