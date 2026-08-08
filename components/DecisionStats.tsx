import type { Candidate } from "@/lib/types";

function Stat({
  value,
  label,
  emphasis = false,
}: {
  value: string;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <div
        className="headline"
        style={{
          fontSize: emphasis ? "2.6rem" : "2.1rem",
          color: emphasis ? "var(--red)" : "var(--ink)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        className="mt-2 uppercase"
        style={{
          fontFamily: "var(--font-type)",
          fontSize: "0.68rem",
          letterSpacing: "0.16em",
          color: "var(--mute)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function DecisionStats({
  candidates,
}: {
  candidates: Candidate[];
}) {
  const considered = candidates.length;
  const published = candidates.filter((c) => c.verdict === "publish").length;
  const spiked = candidates.filter((c) => c.verdict === "reject").length;

  // Guard the divide — an empty log must not render NaN%.
  const rate = considered === 0 ? null : Math.round((spiked / considered) * 100);

  return (
    <section
      className="flex flex-wrap items-start gap-x-10 gap-y-6 px-5 py-6"
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--rule)",
        borderRadius: 2,
      }}
      aria-label="Decision summary"
    >
      <Stat value={String(considered)} label="Considered" />
      <Stat value={String(published)} label="Published" />
      <Stat value={String(spiked)} label="Spiked" />
      <Stat
        value={rate === null ? "—" : `${rate}%`}
        label="Rejection rate"
        emphasis
      />
    </section>
  );
}
