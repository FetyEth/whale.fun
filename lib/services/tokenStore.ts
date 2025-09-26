// Simple token store with in-memory storage for local dev.
// Replace with DB (Couchbase/Redis/Supabase KV) as needed.

export type YoutubeTokens = {
  access_token: string;
  refresh_token: string;
  expiry_date: number; // ms since epoch
};

let youtubeTokensMemory: YoutubeTokens | null = null;

export async function setYoutubeTokens(tokens: YoutubeTokens): Promise<void> {
  youtubeTokensMemory = tokens;
}

export async function getYoutubeTokens(): Promise<YoutubeTokens | null> {
  return youtubeTokensMemory;
}
