import type { ReactNode } from "react";

type ShellProps = {
  children: ReactNode;
  agentName?: string;
  domain?: string;
};

export default function Shell({
  children,
  agentName = "Agent",
  domain,
}: ShellProps) {
  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <header
        className="sticky top-0 z-10"
        style={{
          background: "var(--paper)",
          borderBottom: "2px solid var(--ink)",
        }}
      >
        <div
          className="mx-auto flex items-center justify-between gap-4 px-6"
          style={{ maxWidth: 780, minHeight: 44, height: 60 }}
        >
          <div className="flex items-baseline gap-3 min-w-0">
            <span
              className="headline truncate text-lg"
              style={{ fontSize: "1.05rem" }}
            >
              {agentName}
            </span>
            {domain ? (
              <span
                className="truncate text-xs"
                style={{ fontFamily: "var(--font-type)", color: "var(--mute)" }}
              >
                {domain}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--red)" }}
            />
            <span
              className="text-xs uppercase"
              style={{
                fontFamily: "var(--font-type)",
                letterSpacing: "0.16em",
                color: "var(--mute)",
              }}
            >
              live
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto px-6 py-10" style={{ maxWidth: 780 }}>
        {children}
      </main>
    </div>
  );
}
