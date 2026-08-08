export default function EmptyState() {
  return (
    <div
      className="px-6 py-14 text-center"
      style={{
        background: "var(--paper-2)",
        border: "1px solid var(--rule)",
        borderRadius: 2,
      }}
    >
      <p className="headline text-xl">Nothing on the wire yet</p>

      <p
        className="mx-auto mt-4 max-w-sm text-xs"
        style={{
          fontFamily: "var(--font-type)",
          lineHeight: 1.8,
          color: "var(--mute)",
        }}
      >
        The agent has not published yet. It files on its own schedule, when it
        decides a story is worth running. New posts appear here automatically.
      </p>
    </div>
  );
}
