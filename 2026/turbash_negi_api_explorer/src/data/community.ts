import { APILibraryEntry, ApiReview } from "./catalogs.js";
import { API_LIBRARY, COMMUNITY_STORE, saveCommunityStore } from "./api-library.js";

export function rateAPI(apiId: string, rating: number): {
  api: APILibraryEntry;
  averageRating: number;
  votes: number;
} {
  const api = ensureApi(apiId);
  
  if (!COMMUNITY_STORE[apiId]) {
    COMMUNITY_STORE[apiId] = { reviews: [], ratingStats: { votes: 1, total: api.rating } };
  }
  
  const stats = COMMUNITY_STORE[apiId].ratingStats;
  stats.votes += 1;
  stats.total += rating;
  api.rating = Number((stats.total / stats.votes).toFixed(2));
  
  saveCommunityStore(COMMUNITY_STORE);

  return {
    api,
    averageRating: api.rating,
    votes: stats.votes,
  };
}

export function addAPIReview(
  input: {
    apiId: string;
    author: string;
    comment: string;
    rating?: number;
  },
): {
  api: APILibraryEntry;
  review: ApiReview;
  averageRating?: number;
  votes?: number;
} {
  const api = ensureApi(input.apiId);
  
  if (!COMMUNITY_STORE[input.apiId]) {
    COMMUNITY_STORE[input.apiId] = { reviews: [], ratingStats: { votes: 0, total: 0 } };
  }
  
  const review: ApiReview = {
    id: `${input.apiId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    apiId: input.apiId,
    author: input.author,
    comment: input.comment,
    rating: input.rating,
    createdAt: new Date().toISOString(),
  };

  COMMUNITY_STORE[input.apiId].reviews.push(review);

  if (typeof input.rating === "number") {
    const rated = rateAPI(input.apiId, input.rating);
    return {
      api,
      review,
      averageRating: rated.averageRating,
      votes: rated.votes,
    };
  }

  saveCommunityStore(COMMUNITY_STORE);

  return {
    api,
    review,
  };
}

export function listAPIReviews(apiId: string, limit = 10): {
  api: APILibraryEntry;
  reviews: ApiReview[];
} {
  const api = ensureApi(apiId);
  
  const apiData = COMMUNITY_STORE[apiId];
  const reviews = (apiData?.reviews || [])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 20)));

  return { api, reviews };
}

export function buildContributionSuggestion(input: {
  apiId: string;
  changeType: "fix" | "improve" | "new-endpoint" | "metadata";
  summary: string;
  details?: string;
}): {
  api: APILibraryEntry;
  issueTitle: string;
  issueBody: string;
} {
  const api = ensureApi(input.apiId);
  const issueTitle = `[api-explorer] ${input.changeType}: ${api.name} - ${input.summary}`;
  const issueBody = [
    `API: ${api.name} (${api.id})`,
    `Category: ${api.category}`,
    `Change Type: ${input.changeType}`,
    "",
    "Summary",
    input.summary,
    "",
    "Details",
    input.details || "Please describe the update needed.",
    "",
    "Source",
    api.source.location,
  ].join("\n");

  return {
    api,
    issueTitle,
    issueBody,
  };
}

function ensureApi(apiId: string): APILibraryEntry {
  const api = API_LIBRARY.find((item) => item.id === apiId);
  if (!api) {
    throw new Error(`API not found for id: ${apiId}`);
  }
  return api;
}
