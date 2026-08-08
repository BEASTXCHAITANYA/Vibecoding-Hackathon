const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Absolute, timezone-independent rendering of a timestamp.
 *
 * This is what the server emits. It is computed purely from UTC parts, so the
 * markup is byte-identical on server and client and hydration stays quiet.
 * The client swaps in formatRelative() after mount.
 */
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const month = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");

  return `${month} ${day}, ${hh}:${mm} UTC`;
}

/**
 * Relative rendering ("14 min ago"). Depends on the current wall clock, so it
 * must only ever run on the client — see formatAbsolute() above.
 */
export function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  // A timestamp slightly in the future (clock skew) still reads as current.
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
