import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { APILibraryEntry, ApiReview } from "./catalogs.js";

export type { APILibraryEntry, ApiTemplate, ApiEndpointEntry, EndpointSearchResult, ApiReview } from "./catalogs.js";
export { API_ENDPOINTS } from "./catalogs.js";

interface ApiCommunityData {
  reviews: ApiReview[];
  ratingStats: { votes: number; total: number };
}

interface CommunityStoreData {
  [apiId: string]: ApiCommunityData;
}

interface DatabaseSchema {
  apis: APILibraryEntry[];
  community: CommunityStoreData;
}

const DATABASE_PATH = path.join(process.cwd(), "src", "data", "database.json");

function loadDatabase(): DatabaseSchema {
  if (!existsSync(DATABASE_PATH)) {
    throw new Error(`Database file not found at ${DATABASE_PATH}`);
  }

  try {
    const raw = readFileSync(DATABASE_PATH, "utf8");
    const parsed = JSON.parse(raw) as DatabaseSchema;
    return parsed;
  } catch (error) {
    throw new Error(`Failed to load database: ${error}`);
  }
}

export function saveDatabase(db: DatabaseSchema): void {
  writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2), "utf8");
}

const database = loadDatabase();
export const API_LIBRARY: APILibraryEntry[] = database.apis;
export const COMMUNITY_STORE: CommunityStoreData = database.community;

// Update API ratings from persisted community data
for (const api of API_LIBRARY) {
  const apiData = COMMUNITY_STORE[api.id];
  if (!apiData?.ratingStats || apiData.ratingStats.votes <= 0) {
    continue;
  }
  api.rating = Number((apiData.ratingStats.total / apiData.ratingStats.votes).toFixed(2));
}

export function saveCommunityStore(store: CommunityStoreData): void {
  // Ensure API_LIBRARY ratings are synced back to database
  for (const api of API_LIBRARY) {
    const idx = database.apis.findIndex((a) => a.id === api.id);
    if (idx >= 0) {
      database.apis[idx].rating = api.rating;
    }
  }
  database.community = store;
  saveDatabase(database);
}

