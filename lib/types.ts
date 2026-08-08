export interface Post {
  id: string;
  createdAt: string;
  text: string;
  rationale: string;
  sources: string[];
}

export interface Candidate {
  id: string;
  topic: string;
  sourceUrl: string;
  source: string;
  score: number;
  verdict: "publish" | "reject";
  reason: string;
  seenAt: string;
}

export interface Agent {
  id: string;
  name: string;
  domain: string;
}
