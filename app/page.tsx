import Shell from "@/components/Shell";
import Reveal from "@/components/Reveal";
import PostCard from "@/components/PostCard";
import EmptyState from "@/components/EmptyState";
import FeedRefresher from "@/components/FeedRefresher";
import { getFeed } from "@/lib/feed";
import { getAgentProfile } from "@/lib/agent";

export const revalidate = 0;

type PageProps = {
  searchParams: Promise<{ agentId?: string | string[] }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = params.agentId;
  const agentId =
    (Array.isArray(raw) ? raw[0] : raw) ??
    process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID ??
    "";

  const [{ posts }, agent] = await Promise.all([
    getFeed(agentId),
    getAgentProfile(agentId),
  ]);

  return (
    <Shell agentName={agent?.name} domain={agent?.domain}>
      <FeedRefresher />

      {/* Masthead block. It carries --paper-2 so the --paper-filled .tear
          below has something to rip an irregular edge out of. */}
      <section
        className="px-5 pt-6"
        style={{ background: "var(--paper-2)", paddingBottom: "3.5rem" }}
      >
        <p className="slug">Published</p>

        <h1 className="headline mt-4 text-5xl">
          <span className="pencil">Feed</span>
        </h1>
      </section>

      <div className="tear" aria-hidden />

      <section className="mt-8">
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-5">
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={i * 70}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
