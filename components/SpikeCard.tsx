"use client";

import { useEffect, useState } from "react";
import type { Candidate } from "@/lib/types";
import { formatAbsolute, formatRelative } from "@/lib/time";

/** Under 40 muted, 40-64 amber, 65+ red — a near-miss is the interesting case. */
function scoreClass(score: number): string {
  if (score >= 65) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

export default function SpikeCard({ candidate }: { candidate: Candidate }) {
  // Server renders an absolute UTC timestamp so the markup matches on both
  // sides; the client swaps in relative time after mount.
  const [time, setTime] = useState(() => formatAbsolute(candidate.seenAt));

  useEffect(() => {
    const update = () => setTime(formatRelative(candidate.seenAt));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [candidate.seenAt]);

  const hasReason = candidate.reason.trim().length > 0;
  const hasFooter = candidate.source.length > 0 || time.length > 0;

  return (
    <article className="spiked">
      {/* 1. Header: topic + score */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="spike-topic">{candidate.topic}</h2>

        <span
          className={`score-badge shrink-0 ${scoreClass(candidate.score)}`}
          title={`Score ${candidate.score} of 100`}
        >
          {candidate.score}
        </span>
      </div>

      {/* 2. The reason, in the agent's own voice — the point of the page */}
      {hasReason && (
        <p
          className="mt-3 pl-3"
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: "0.88rem",
            lineHeight: 1.6,
            color: "var(--mute)",
            borderLeft: "2px solid var(--red)",
          }}
        >
          {candidate.reason}
        </p>
      )}

      {/* 3. Footer: where it came from, and when */}
      {hasFooter && (
        <div
          className="mt-3 flex flex-wrap items-center gap-x-3"
          style={{
            fontFamily: "var(--font-type)",
            fontSize: "0.72rem",
            color: "var(--mute)",
          }}
        >
          {candidate.sourceUrl ? (
            <a
              href={candidate.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target source-link"
              style={{ fontSize: "0.72rem" }}
            >
              {candidate.source || candidate.sourceUrl}
            </a>
          ) : (
            candidate.source && (
              <span className="tap-target">{candidate.source}</span>
            )
          )}

          {time && (
            <time dateTime={candidate.seenAt} className="tap-target">
              {time}
            </time>
          )}
        </div>
      )}
    </article>
  );
}
