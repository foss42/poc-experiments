// Generate final API templates
export default function generateTemplates(data) {
  return data.endpoints.map((ep) => {
    
    // ✅ define headers first
    const headers = {
      "Content-Type": "application/json"
    };

    if (data.auth !== "None") {
      headers["Authorization"] = "{{API_KEY}}";
    }

    // ✅ then return object
    return {
      name: `${ep.method} ${ep.path}`,
      category: ep.category,
      method: ep.method,
      url: data.base_url + ep.path,
      headers,
      params: ep.params,
      body: ep.body ? {} : null
    };
  });
}