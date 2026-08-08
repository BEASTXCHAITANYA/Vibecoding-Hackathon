"use client";

import { useEffect, useId, useState } from "react";
import type { Post } from "@/lib/types";
import { formatAbsolute, formatRelative } from "@/lib/time";

/** Sources are shown as bare hostnames; unparseable values fall back to raw. */
function hostnameOf(source: string): string {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export default function PostCard({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);

  // The server renders an absolute UTC timestamp so the markup is identical on
  // both sides; the client swaps in relative time after mount.
  const [time, setTime] = useState(() => formatAbsolute(post.createdAt));

  useEffect(() => {
    const update = () => setTime(formatRelative(post.createdAt));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [post.createdAt]);

  const rationaleId = useId();
  const hasRationale = post.rationale.trim().length > 0;
  const hasSources = post.sources.length > 0;

  return (
    <article className="post-card">
      {/* 1. Metadata */}
      <div className="flex items-center justify-between gap-4">
        <time
          dateTime={post.createdAt}
          className="text-xs uppercase"
          style={{
            fontFamily: "var(--font-type)",
            letterSpacing: "0.12em",
            color: "var(--mute)",
          }}
        >
          {time}
        </time>

        <span
          title={post.id}
          className="shrink-0 px-2 py-1 text-[0.7rem]"
          style={{
            fontFamily: "var(--font-type)",
            color: "var(--mute)",
            border: "1px solid var(--rule)",
            borderRadius: 2,
          }}
        >
          {shortId(post.id)}
        </span>
      </div>

      {/* Thin red rule above the body text */}
      <hr className="post-rule mt-4" />

      {/* 2. Body */}
      {post.text.trim().length > 0 && (
        <p
          className="mt-3 whitespace-pre-wrap"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.0625rem",
            lineHeight: 1.65,
            color: "var(--ink)",
          }}
        >
          {post.text}
        </p>
      )}

      {/* 3. Divider — only when something follows it */}
      {(hasRationale || hasSources) && (
        <div
          className="mt-5"
          style={{ height: 1, background: "var(--rule)" }}
          aria-hidden
        />
      )}

      {/* 4. Editor's note, collapsed by default.
          The panel is always mounted and toggled with `hidden` — mounting it
          conditionally left aria-controls pointing at an id that did not
          exist while collapsed. `hidden` still removes it from the
          accessibility tree, so collapsed state is announced correctly. */}
      {hasRationale && (
        <div className="mt-1">
          <button
            type="button"
            className="tap-target rationale-toggle"
            aria-expanded={expanded}
            aria-controls={rationaleId}
            onClick={() => setExpanded((v) => !v)}
          >
            <svg
              className="chev"
              width="9"
              height="9"
              viewBox="0 0 9 9"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M2.5 1 L6.5 4.5 L2.5 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Editor&rsquo;s note
          </button>

          <p
            id={rationaleId}
            hidden={!expanded}
            className="mb-1 pl-3"
            style={{
              fontFamily: "var(--font-type)",
              fontSize: "0.86rem",
              lineHeight: 1.6,
              color: "var(--mute)",
              borderLeft: "2px solid var(--red)",
            }}
          >
            {post.rationale}
          </p>
        </div>
      )}

      {/* 5. Sources */}
      {hasSources && (
        <div className="flex flex-wrap items-center gap-x-4">
          {post.sources.map((source, i) => (
            <a
              key={`${source}-${i}`}
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target source-link"
            >
              {hostnameOf(source)}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
