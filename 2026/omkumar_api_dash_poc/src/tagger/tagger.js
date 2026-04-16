// Simple keyword-based tagging

export default function tagEndpoints(data) {
  const getCategory = (path) => {
    const lower = path.toLowerCase();

    if (lower.includes("user")) return "User";
    if (lower.includes("weather")) return "Weather";
    if (lower.includes("payment")) return "Finance";

    return "General";
  };

  return {
    ...data,
    endpoints: data.endpoints.map((ep) => ({
      ...ep,
      category: getCategory(ep.path)
    }))
  };
}