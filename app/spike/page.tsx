import Shell from "@/components/Shell";
import Reveal from "@/components/Reveal";
import SpikeCard from "@/components/SpikeCard";
import DecisionStats from "@/components/DecisionStats";
import { getDecisions } from "@/lib/decisions";
import { getAgentProfile } from "@/lib/agent";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_AGENT_ID = "BfYde7gpX79dDyVV5YLup";

type PageProps = {
  searchParams: Promise<{ agentId?: string | string[] }>;
};

export default async function SpikePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = params.agentId;
  const rawId = Array.isArray(raw) ? raw[0] : raw;
  const agentId = rawId || process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID || DEFAULT_AGENT_ID;

  const [candidates, agent] = await Promise.all([
    getDecisions(agentId),
    getAgentProfile(agentId),
  ]);

  // Newest first. Rows with an unparseable seenAt sort last rather than
  // scrambling the order with NaN comparisons.
  const rejected = candidates
    .filter((c) => c.verdict === "reject")
    .sort((a, b) => {
      const ta = new Date(a.seenAt).getTime();
      const tb = new Date(b.seenAt).getTime();
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    });

  return (
    <Shell agentName={agent?.name} domain={agent?.domain}>
      {/* Masthead block. It carries --paper-2 so the --paper-filled .tear
          below has something to rip an irregular edge out of. */}
      <section
        className="px-5 pt-6"
        style={{ background: "var(--paper-2)", paddingBottom: "3.5rem" }}
      >
        <p className="slug">Spiked</p>

        <h1 className="headline mt-4 text-5xl">
          <span className="pencil">Spike File</span>
        </h1>
      </section>

      <div className="tear" aria-hidden />

      <div className="mt-8">
        <DecisionStats candidates={candidates} />
      </div>

      <section className="mt-8">
        {rejected.length === 0 ? (
          <div
            className="px-6 py-14 text-center"
            style={{
              background: "var(--paper-2)",
              border: "1px solid var(--rule)",
              borderRadius: 2,
            }}
          >
            <p className="headline text-xl">Nothing spiked yet</p>
            <p
              className="mx-auto mt-4 max-w-sm text-xs"
              style={{
                fontFamily: "var(--font-type)",
                lineHeight: 1.8,
                color: "var(--mute)",
              }}
            >
              Every candidate the agent has considered so far has made it into
              print. Rejections appear here with the reasoning behind them.
            </p>
          </div>
        ) : (
          <div className="spike-list flex flex-col gap-5">
            {rejected.map((candidate, i) => (
              <Reveal key={candidate.id} delay={i * 50}>
                <SpikeCard candidate={candidate} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
