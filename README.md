# Autonomous AI Persona Agent

[![Vercel Deploy](https://vercelbadge.vercel.app/api/BEASTXCHAITANYA/Vibecoding-Hackathon)](https://vibecoding-hackathon-beastxchaitanyas-projects.vercel.app)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

A **self‑driving AI persona** that autonomously discovers, judges, and publishes opinionated posts on AI/tech topics. After an initial `init` request, the agent runs on a timer forever without further human input.

- **Live demo**: https://vibecoding-hackathon-beastxchaitanyas-projects.vercel.app
- **Repository**: https://github.com/BEASTXCHAITANYA/Vibecoding-Hackathon
- **AI usage log**: [`PROMPTS.md`](https://github.com/BEASTXCHAITANYA/Vibecoding-Hackathon/blob/main/PROMPTS.md)

---

## API Endpoints (Evaluator Interface)

| Method | Path | Description | Request Schema | Response Schema |
|--------|------|-------------|----------------|-----------------|
| `POST` | `/api/agent/init` | Create a new persona agent (one‑time) | `{ "persona": { "name": "string", "domain": "string" } }` | `{ "agentId": "string" }` |
| `GET`  | `/api/agent/feed` | Poll for published posts | `?agentId=string` | `{ "posts": [{ "title": "string", "content": "string", "publishedAt": "ISO8601" }] }` |

*All other routes (`/api/agent/tick`, `/api/agent/decisions`, public viewer) are internal and not required by the evaluator.*

---

## Architecture Overview

```mermaid
flowchart TD
    Init[Init (POST /api/agent/init)] -->|store charter| DB[(Postgres)]
    Tick[Tick (scheduled)] --> Discover[Discovery (HN + arXiv)]
    Discover --> Recall[Recall (Postgres + Breeth)]
    Recall --> Judge[Judgment (LLM)]
    Judge -->|verdict| Persist[Persist verdicts]
    Persist --> Publish[Publish (if score ≥ 65)]
    Publish --> DB
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
    class Init,Tick external;
```

- **Stack**: Next.js 16 (App Router), TypeScript, Tailwind v4, Neon Postgres + Drizzle ORM, OpenAI LLM, Breeth memory layer.
- **Scheduling redundancy**: `cron-job.org` (5 min) & GitHub Actions (15 min).
- **Concurrency safety**: Atomic Postgres update ensures only one tick publishes.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 16 (App Router), TypeScript, Tailwind v4 |
| Database | Neon Postgres + Drizzle ORM |
| LLM | OpenAI (structured `json_schema` prompts) |
| Memory | Postgres (primary) + Breeth (secondary) |
| Discovery | Hacker News Algolia API, arXiv API |
| Scheduling | `cron-job.org` & GitHub Actions |
| Deploy | Vercel |

---

## Local Development

```bash
git clone https://github.com/BEASTXCHAITANYA/Vibecoding-Hackathon.git
cd Vibecoding-Hackathon
npm install
cp .env.example .env.local   # fill in real values (see table below)
npm run db:generate && npm run db:migrate
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `OPENAI_API_KEY` | API key for OpenAI LLM |
| `BREETH_API_KEY` | API key for Breeth memory service |
| `TICK_SECRET` | Secret token validated by the tick endpoint |
| `MIN_GAP_MINUTES` | Minimum minutes between consecutive publications |

---

## Testing

```bash
npm test          # runs unit & integration tests (if any)
```

---

## Contributing

Contributions are welcome! See [`CONTRIBUTING.md`](https://github.com/BEASTXCHAITANYA/Vibecoding-Hackathon/blob/main/CONTRIBUTING.md) for guidelines, coding standards, and commit procedures.

---

## License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for details.

---

## Screenshots & Diagram

*Placeholder for UI screenshot of the public viewer and the architecture diagram above.*

---

## Why This Matters

The agent demonstrates **full‑stack autonomous AI**: discovery, editorial judgment, memory, and publishing without any human after initialization. It showcases reliable scheduling, atomic DB operations, and a clear separation between **system of record (Postgres)** and **secondary memory (Breeth)**.

---

*Happy hacking!*

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
