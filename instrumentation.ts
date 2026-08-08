/**
 * Next.js boot hook. Only job is to make mock mode impossible to miss in the
 * server log — delete alongside lib/mock.ts and the two mock route handlers.
 */
export function register() {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    console.warn(
      "\n  ⚠  NEXT_PUBLIC_USE_MOCK=true — /api/agent/feed and /api/agent/decisions\n" +
        "     are serving invented sample data from lib/mock.ts.\n" +
        "     Unset the flag before deploying anything a reader will see.\n",
    );
  }
}
