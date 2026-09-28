import type { Ranking, Resort, Zone } from "./types";

// -----------------------------------------------------------------------
// Zone/ranking/resort configuration used by the recommendation engine.
// Jungle content and image URLs live in Postgres and are read by jungles.ts.
// -----------------------------------------------------------------------


// Every buffer gate below was confirmed live against the government
// portal (Tadoba Andhari Tiger Reserve (Buffer) search, 2026-09-17) — see
// scraper/README.md. portal_key strings preserve the portal's exact
// spacing (some have no space before "(Buffer)"); don't "clean" them up,
// the scraper must match verbatim. Core portal keys also preserve the
// exact labels shown by the live aggregate and range-specific views.
const TADOBA_ZONES: Omit<Zone, "jungleSlug">[] = [
  // Kolara range — the only range Hardik has ranked so far (see RANKING).
  { id: "belara", range: "Kolara", name: "Belara", type: "buffer", gate: "Belara", portalKey: "Belara (Buffer)" },
  { id: "madnapur", range: "Kolara", name: "Madnapur", type: "buffer", gate: "Madnapur", portalKey: "Madnapur(Buffer)" },
  { id: "alizanza", range: "Kolara", name: "Alizanza", type: "buffer", gate: "Alizanza", portalKey: "Alizanza(Buffer)" },
  { id: "shirkheda", range: "Kolara", name: "Shirkheda", type: "buffer", gate: "Shirkheda", portalKey: "Shirkheda (Buffer)" },
  { id: "chauradeo", range: "Kolara", name: "Chauradeo", type: "buffer", gate: "Kolara Chauradeo", portalKey: "Kolara Chauradeo (Buffer)" },
  { id: "palasgaon", range: "Kolara", name: "Palasgaon", type: "buffer", gate: "Palasgaon", portalKey: "Palasgaon (Buffer)" },
  // Moharli range — ranking not yet set.
  { id: "agarzari", range: "Moharli", name: "Agarzari", type: "buffer", gate: "Agarzari", portalKey: "Agarzari (Buffer)" },
  { id: "dewada", range: "Moharli", name: "Dewada", type: "buffer", gate: "Dewada", portalKey: "Dewada (Buffer)" },
  { id: "adegaon", range: "Moharli", name: "Adegaon", type: "buffer", gate: "Adegaon", portalKey: "Adegaon (Buffer)" },
  { id: "junona", range: "Moharli", name: "Junona", type: "buffer", gate: "Junona", portalKey: "Junona(Buffer)" },
  { id: "mamla", range: "Moharli", name: "Mamla", type: "buffer", gate: "Mamla", portalKey: "Mamla (Buffer)" },
  // Navegaon range — ranking not yet set.
  { id: "navegaon-ramdegi", range: "Navegaon", name: "Navegaon Ramdegi", type: "buffer", gate: "Navegaon Ramdegi", portalKey: "Navegaon Ramdegi(Buffer)" },
  { id: "nimdhela", range: "Navegaon", name: "Nimdhela", type: "buffer", gate: "Nimdhela", portalKey: "Nimdhela (Buffer)" },
  // Pangadi & Zari range — ranking not yet set.
  { id: "pangadi-aswal-chuha", range: "Pangadi & Zari", name: "Pangadi Aswal Chuha", type: "buffer", gate: "Pangadi Aswal Chuha", portalKey: "Pangadi Aswal Chuha (Buffer)" },
  { id: "keslaghat", range: "Pangadi & Zari", name: "Keslaghat", type: "buffer", gate: "Keslaghat", portalKey: "Keslaghat (Buffer)" },
  { id: "zari-peth", range: "Pangadi & Zari", name: "Zari Peth", type: "buffer", gate: "Zari Peth", portalKey: "Zari Peth (Buffer)" },
  { id: "somnath", range: "Pangadi & Zari", name: "Somnath", type: "buffer", gate: "Somnath", portalKey: "Somnath (Buffer)" },
  // Core gates use 2 sessions/day, not 3. The portal's Moharli-specific
  // Core view shows both Moharli Gate and Khutwanda Gate.
  { id: "moharli-core", range: "Moharli", name: "Moharli Gate", type: "core", gate: "Moharli", portalKey: "Moharli Gate (Core)" },
  { id: "khutwanda-core", range: "Moharli", name: "Khutwanda", type: "core", gate: "Khutwanda", portalKey: "Khutwanda Gate (Core)" },
  { id: "kolara-core", range: "Kolara", name: "Kolara Core", type: "core", gate: "Kolara", portalKey: "Kolara (Core)" },
  { id: "navegaon-core", range: "Navegaon", name: "Navegaon Core", type: "core", gate: "Navegaon", portalKey: "Navegaon Gate (Core)" },
  { id: "pangadi-core", range: "Pangadi & Zari", name: "Pangadi", type: "core", gate: "Pangadi", portalKey: "Pangadi (Core)" },
  { id: "zari-core", range: "Pangadi & Zari", name: "Zari", type: "core", gate: "Zari", portalKey: "Zari (Core)" },
];

const PENCH_ZONES: Omit<Zone, "jungleSlug">[] = [
  // Confirmed live against MP Forest Online on 2026-09-18. The portal
  // labels Khawasa through Teliya as Buffer/Other and the remaining
  // three gates as Core.
  { id: "pench-khawasa", range: "Pench", name: "Khawasa", type: "buffer", gate: "Khawasa", portalKey: "Khawasa" },
  { id: "pench-khumbhpani", range: "Pench", name: "Khumbhpani", type: "buffer", gate: "Khumbhpani", portalKey: "Khumbhpani" },
  { id: "pench-masurnala", range: "Pench", name: "Masurnala", type: "buffer", gate: "Masurnala", portalKey: "Masurnala" },
  { id: "pench-rukhad", range: "Pench", name: "Rukhad", type: "buffer", gate: "Rukhad", portalKey: "Rukhad" },
  { id: "pench-teliya", range: "Pench", name: "Teliya", type: "buffer", gate: "Teliya", portalKey: "Teliya" },
  { id: "pench-jhamtara-core", range: "Pench", name: "Jhamtara", type: "core", gate: "Jhamtara", portalKey: "Jhamtara" },
  { id: "pench-karmajhiri-core", range: "Pench", name: "Karmajhiri", type: "core", gate: "Karmajhiri", portalKey: "Karmajhiri" },
  { id: "pench-touria-core", range: "Pench", name: "Touria", type: "core", gate: "Touria", portalKey: "Touria" },
];

export const ZONES: Zone[] = [
  ...TADOBA_ZONES.map((zone) => ({ ...zone, jungleSlug: "tadoba" })),
  ...PENCH_ZONES.map((zone) => ({ ...zone, jungleSlug: "pench" })),
];

// priority_rank 1 = best. Mirrors the worked example in the spec.
export const RANKING: Ranking[] = [
  { zoneId: "belara", cycleName: "Dry 2026", priorityRank: 1, sightingScore: 95 },
  { zoneId: "madnapur", cycleName: "Dry 2026", priorityRank: 2, sightingScore: 88 },
  { zoneId: "alizanza", cycleName: "Dry 2026", priorityRank: 3, sightingScore: 82 },
  { zoneId: "shirkheda", cycleName: "Dry 2026", priorityRank: 4, sightingScore: 76 },
  { zoneId: "chauradeo", cycleName: "Dry 2026", priorityRank: 5, sightingScore: 65 },
  { zoneId: "palasgaon", cycleName: "Dry 2026", priorityRank: 6, sightingScore: 60 },
];

// Placeholder resort/rate data for every range so the booking flow never
// dead-ends — these are NOT real Wild Excursions rates or partner
// properties, just enough to demo the flow. Replace with the real rate
// table (per the spec's "Resort Booking" pricing section) before launch.
export const RESORTS: Resort[] = [
  { id: "tiger-trail", range: "Kolara", name: "Tiger Trail Resort", tier: "budget", pricePerNight: 4500 },
  { id: "jungle-view", range: "Kolara", name: "Jungle View Retreat", tier: "comfort", pricePerNight: 6500 },
  { id: "wilderness-lodge", range: "Kolara", name: "Wilderness Lodge", tier: "premium", pricePerNight: 8500 },
  { id: "moharli-riverside", range: "Moharli", name: "Riverside Camp", tier: "budget", pricePerNight: 4200 },
  { id: "moharli-machan", range: "Moharli", name: "Machan Stay", tier: "comfort", pricePerNight: 6000 },
  { id: "navegaon-birding", range: "Navegaon", name: "Birding Camp Navegaon", tier: "budget", pricePerNight: 4000 },
  { id: "navegaon-lakeview", range: "Navegaon", name: "Lakeview Cottages", tier: "comfort", pricePerNight: 5800 },
  { id: "pangadi-trailhead", range: "Pangadi & Zari", name: "Trailhead Camp", tier: "budget", pricePerNight: 4000 },
  { id: "pangadi-zari-retreat", range: "Pangadi & Zari", name: "Zari Forest Retreat", tier: "comfort", pricePerNight: 5900 },
  { id: "pench-forest-camp", range: "Pench", name: "Pench Forest Camp", tier: "budget", pricePerNight: 4500 },
  { id: "pench-jungle-lodge", range: "Pench", name: "Pench Jungle Lodge", tier: "comfort", pricePerNight: 6500 },
  { id: "pench-wilderness-retreat", range: "Pench", name: "Pench Wilderness Retreat", tier: "premium", pricePerNight: 8500 },
];

export const PRICING = {
  permitPerSafari: 1500,
  guideAndVehiclePerSafari: 2500,
  transferFlat: 1500,
};

export function toLocalISODate(d: Date): string {
  // NOT d.toISOString().slice(0, 10) — that converts to UTC first, which
  // silently shifts the date back a day in any timezone ahead of UTC
  // (e.g. IST, UTC+5:30 — confirmed live: 2026-10-02T00:00:00 local
  // becomes 2026-10-01 after an ISO round-trip). Format from the local
  // getters instead so the date a customer typed is the date they get.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateRangeFrom(startDate: string, nights: number): string[] {
  const start = new Date(startDate + "T00:00:00");
  const days = nights + 1; // e.g. 2N/3D -> 3 days of safaris possible
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return toLocalISODate(d);
  });
}

export type TripSlot = { date: string; session: "morning" | "afternoon" };

/**
 * The actual bookable safari slots for a trip, not just every date x
 * session combination: the arrival day is spent travelling/checking in
 * (afternoon safari only), the departure day is spent checking
 * out/travelling home (morning safari only), and only the days between
 * get both sessions. This is why trip length fixes the safari count
 * exactly: nights=1 -> 2, nights=2 -> 4, nights=3 -> 6, ... (2 * nights),
 * not a range the customer picks freely.
 */
export function tripSlots(dates: string[]): TripSlot[] {
  if (dates.length <= 1) {
    // Degenerate case (shouldn't occur — trip length starts at 1 night /
    // 2 days) — don't silently drop both sessions if it ever does.
    return dates.flatMap((date) => [
      { date, session: "morning" as const },
      { date, session: "afternoon" as const },
    ]);
  }
  return dates.flatMap((date, i) => {
    if (i === 0) return [{ date, session: "afternoon" as const }]; // arrival day
    if (i === dates.length - 1) return [{ date, session: "morning" as const }]; // departure day
    return [{ date, session: "morning" as const }, { date, session: "afternoon" as const }];
  });
}
