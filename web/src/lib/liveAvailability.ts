import type { AvailabilitySnapshot } from "./types";

/**
 * The one place the front-end reads availability from. Always calls our
 * own /api/availability (backed by the availability_snapshot table the
 * scraper writes) — never the government portal directly. See the
 * spec's "availability layer" separation and scraper/README.md.
 */
export async function fetchAvailability(
  zoneIds: string[],
  dates: string[]
): Promise<AvailabilitySnapshot[]> {
  if (zoneIds.length === 0 || dates.length === 0) return [];
  const res = await fetch("/api/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zoneIds, dates }),
  });
  if (!res.ok) throw new Error(`Failed to fetch availability: ${res.status}`);
  return res.json();
}

/** The last date the scraper's most recent sweep actually reached — see
 * /api/availability/coverage. null if availability_snapshot is empty. */
export async function fetchAvailabilityCoverage(jungleSlug?: string): Promise<string | null> {
  const query = jungleSlug ? `?jungle=${encodeURIComponent(jungleSlug)}` : "";
  const res = await fetch(`/api/availability/coverage${query}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.maxDate ?? null;
}
