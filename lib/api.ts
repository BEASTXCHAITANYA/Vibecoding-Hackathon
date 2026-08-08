/**
 * Server-side fetch needs an absolute URL — relative paths only resolve in the
 * browser. Configure NEXT_PUBLIC_SITE_URL in deployment; localhost is the
 * development fallback.
 */
export function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
}
