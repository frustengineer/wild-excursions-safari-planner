export type ZoneType = "core" | "buffer";

export type Zone = {
  id: string;
  jungleSlug: string;
  range: string;
  name: string;
  type: ZoneType;
  gate: string;
  /** Exact gate name as the government portal lists it, confirmed live
   * against https://safaribooking.mahaforest.gov.in/ on 2026-09-17.
   * Whitespace quirks (e.g. "Madnapur(Buffer)" with no space) are real —
   * don't "fix" them, the scraper must match the portal verbatim. */
  portalKey?: string;
};

export type Ranking = {
  zoneId: string;
  cycleName: string;
  priorityRank: number;
  sightingScore: number; // 0-100
};

export type SlotStatus =
  | "available"
  | "waitlist"
  | "full"
  | "gate-closed"
  | "window-closed"
  | "NA";

export type AvailabilitySnapshot = {
  zoneId: string;
  date: string; // ISO date, e.g. "2026-10-12"
  session: "morning" | "afternoon";
  status: SlotStatus;
  availableCount: number;
  checkedAt: string;
};

export type RecommendedSafari = {
  safariNumber: number;
  zone: Zone;
  date: string;
  session: "morning" | "afternoon";
  reason: string;
  isFillIn: boolean;
  /** True when this pick has no real scraped data at all — the date is
   * beyond the government portal's actual rolling booking window (it
   * doesn't have this date open yet). Displayed identically to a
   * confirmed "available" slot (by product decision — see engine.ts),
   * but kept here so the enquiry handoff can flag it internally for the
   * team, who still need to check the real portal once it opens. */
  isProvisional: boolean;
  /** Number of vehicles required for this party in this safari slot. */
  gypsiesRequired: number;
};

export type Resort = {
  id: string;
  range: string;
  name: string;
  tier: "budget" | "comfort" | "premium";
  pricePerNight: number;
};

export type Jungle = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  ranges: string[];
  animals: string[];
  bestSeason: string;
  comingSoon?: boolean;
  /** Used to group the jungle picker in Step 1 — every park here is in
   * Maharashtra or Madhya Pradesh for now (where Wild Excursions operates). */
  state: "Maharashtra" | "Madhya Pradesh";
  /** Thumbnail shown in the Step 1 jungle picker. */
  image: string;
};

export type Traveller = {
  name: string;
  age: string;
};

export type BookingState = {
  jungleSlug: string | null;
  range: string | null;
  startDate: string | null;
  /** Start date used by the current recommendation. May be a nearby
   * alternative while startDate remains the customer's requested date. */
  recommendedStartDate: string | null;
  nights: number;
  numAdults: number;
  childAges: string[];
  numTravellers: number;
  /** Buffer and Core are separate government bookings (different
   * vehicle, different session count), so a trip's safaris are counted
   * per type rather than picking one type for the whole trip — a
   * customer can mix e.g. 2 Buffer + 2 Core across the same date range. */
  numSafarisBuffer: number;
  numSafarisCore: number;
  plan: RecommendedSafari[];
  resortId: string | null;
  specialFares: Array<"group_of_4" | "senior" | "gst" | "armed_forces" | "medical">;
  transfers: boolean;
  travellers: Traveller[];
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  idDeferred: boolean;
  idValue: string;
};
