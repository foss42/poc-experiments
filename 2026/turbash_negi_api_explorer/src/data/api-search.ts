import { API_LIBRARY, API_ENDPOINTS } from "./api-library.js";
import { APILibraryEntry, ApiEndpointEntry, EndpointSearchResult, ApiTemplate } from "./catalogs.js";

export function searchAPIs(query: string, category?: string): APILibraryEntry[] {
  let results = API_LIBRARY;

  if (category) {
    results = results.filter((api) => api.category === category);
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    results = results.filter(
      (api) =>
        api.name.toLowerCase().includes(q) ||
        api.description.toLowerCase().includes(q) ||
        api.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  return results.sort((a, b) => b.rating - a.rating);
}

export function getAPICategories(): string[] {
  return Array.from(new Set(API_LIBRARY.map((api) => api.category))).sort();
}

export function getCategories(): string[] {
  return getAPICategories();
}

export function getFeaturedAPIs(): APILibraryEntry[] {
  return API_LIBRARY.filter((api) => api.featured).slice(0, 6);
}

export function browseAPIEndpoints(filters?: {
  apiId?: string;
  category?: string;
  method?: ApiEndpointEntry["method"];
}): EndpointSearchResult[] {
  let endpoints = API_ENDPOINTS;

  if (filters?.apiId) {
    endpoints = endpoints.filter((endpoint) => endpoint.apiId === filters.apiId);
  }

  if (filters?.category) {
    endpoints = endpoints.filter((endpoint) => endpoint.category === filters.category);
  }

  if (filters?.method) {
    endpoints = endpoints.filter((endpoint) => endpoint.method === filters.method);
  }

  return endpoints
    .map((endpoint) => {
      const api = API_LIBRARY.find((item) => item.id === endpoint.apiId);
      if (!api) {
        return null;
      }
      return { endpoint, api };
    })
    .filter((item): item is EndpointSearchResult => item !== null)
    .sort((a, b) => a.api.name.localeCompare(b.api.name));
}

export function searchAPIEndpoints(
  query: string,
  filters?: {
    apiId?: string;
    category?: string;
    method?: ApiEndpointEntry["method"];
  },
): EndpointSearchResult[] {
  const normalized = query.trim().toLowerCase();
  const browsed = browseAPIEndpoints(filters);

  if (!normalized) {
    return browsed;
  }

  return browsed.filter(({ endpoint, api }) => {
    return (
      endpoint.name.toLowerCase().includes(normalized) ||
      endpoint.description.toLowerCase().includes(normalized) ||
      endpoint.path.toLowerCase().includes(normalized) ||
      endpoint.tags.some((tag) => tag.toLowerCase().includes(normalized)) ||
      api.name.toLowerCase().includes(normalized)
    );
  });
}

export function getAPISummaryList(): Array<{ id: string; name: string; category: string }> {
  return API_LIBRARY.map((api) => ({
    id: api.id,
    name: api.name,
    category: api.category,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export function getAPITemplate(apiId: string, endpointId: string): {
  api: APILibraryEntry;
  endpoint: ApiEndpointEntry;
  template: ApiTemplate;
} | null {
  const api = API_LIBRARY.find((item) => item.id === apiId);
  const endpoint = API_ENDPOINTS.find((item) => item.id === endpointId && item.apiId === apiId);

  if (!api || !endpoint) {
    return null;
  }

  return {
    api,
    endpoint,
    template: endpoint.template,
  };
}
