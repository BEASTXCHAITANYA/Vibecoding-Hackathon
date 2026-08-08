export interface Post {
  id: string;
  createdAt: string; // ISO 8601 UTC
  text: string;
  rationale: string;
  sources: string[];
}

export interface FeedResponse {
  posts: Post[];
}

export interface Candidate {
  id: string;
  topic: string;
  sourceUrl: string;
  source: string; // "Hacker News", "arXiv", etc
  score: number; // 0-100
  verdict: "publish" | "reject";
  reason: string; // in the persona's voice, first person
  seenAt: string; // ISO 8601 UTC
}
