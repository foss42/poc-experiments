// Extract raw data from OpenAPI spec

export default function parseOpenAPI(openapi) {
  const { paths = {} } = openapi;

  const endpoints = [];

  for (const path in paths) {
    const methods = paths[path];

    for (const method in methods) {
      const endpoint = methods[method];

      endpoints.push({
        path,
        method: method.toUpperCase(),
        parameters: endpoint.parameters || [],
        requestBody: endpoint.requestBody || null
      });
    }
  }

  return {
    name: openapi.info?.title || "API",
    servers: openapi.servers || [],
    endpoints
  };
}