// Convert parsed data into clean structure

export default function normalize(parsed) {
  return {
    name: parsed.name,
    base_url: parsed.servers[0]?.url || "",
    endpoints: parsed.endpoints.map((ep) => ({
      path: ep.path,
      method: ep.method,
      params: ep.parameters.map((p) => ({
        name: p.name,
        in: p.in,
        type: p.schema?.type || "string"
      })),
      body: ep.requestBody ? true : false
    }))
  };
}