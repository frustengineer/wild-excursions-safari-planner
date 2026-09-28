import { dateRangeFrom, RANKING, toLocalISODate, ZONES, tripSlots, type TripSlot } from "./mockData";
import type { AvailabilitySnapshot, RecommendedSafari, Zone, ZoneType } from "./types";

// Product rule: keep these gates visible in live availability for manual
// selection, but never place them in an automatically recommended plan.
const AUTO_RECOMMENDATION_EXCLUDED_ZONE_IDS = new Set(["mamla"]);

export type RankedZone = {
  zone: Zone;
  rank: number;
  /** false = Wild Excursions' own seasonal sighting-quality ranking
   * (Hardik's call). true = no such ranking exists yet for this zone, so
   * it's ordered by live demand (how much of its availability is
   * waitlisted/booked out right now) as an honest stand-in — never
   * presented as sighting quality. */
  isDemandBased: boolean;
};

/**
 * Ranks every zone in a range (of one booking type — Buffer and Core are
 * separate government bookings, never mixed) against an already-fetched
 * availability snapshot. Zones with a real ranking entry (RANKING table
 * — Hardik's call) always come first, in his order. Anything without
 * one is ordered after, by demand: a zone that's booking out fastest
 * right now is assumed more sought after, which is the only honest
 * signal available until it's reviewed.
 *
 * Pure function — the caller fetches `availability` (from the real
 * availability_snapshot table via /api/availability) and passes it in,
 * so this has no knowledge of where the data came from.
 */
export function rankZonesForRange(
  range: string,
  zoneType: ZoneType,
  availability: AvailabilitySnapshot[]
): RankedZone[] {
  return rankZonesForRanges([range], zoneType, availability);
}

function rankZonesForRanges(
  ranges: string[],
  zoneType: ZoneType,
  availability: AvailabilitySnapshot[]
): RankedZone[] {
  const rangeSet = new Set(ranges);
  const zonesInRange = ZONES.filter((z) => rangeSet.has(z.range) && z.type === zoneType);

  const staticRanked: RankedZone[] = zonesInRange
    .map((zone) => {
      const ranking = RANKING.find((r) => r.zoneId === zone.id);
      return ranking ? { zone, rank: ranking.priorityRank, isDemandBased: false } : null;
    })
    .filter((z): z is RankedZone => z !== null)
    .sort((a, b) => a.rank - b.rank);

  const rankedIds = new Set(staticRanked.map((r) => r.zone.id));
  const unranked = zonesInRange.filter((z) => !rankedIds.has(z.id));

  const demandScore = (zoneId: string) => {
    const rows = availability.filter(
      (a) => a.zoneId === zoneId && a.status !== "gate-closed" && a.status !== "NA"
    );
    if (rows.length === 0) return 0;
    const bookedOut = rows.filter((a) => a.status !== "available").length;
    return bookedOut / rows.length;
  };

  const nextRank = staticRanked.length > 0 ? Math.max(...staticRanked.map((r) => r.rank)) + 1 : 1;
  const demandRanked: RankedZone[] = unranked
    .map((zone) => ({ zone, score: demandScore(zone.id) }))
    .sort((a, b) => b.score - a.score || a.zone.id.localeCompare(b.zone.id))
    .map(({ zone }, i) => ({ zone, rank: nextRank + i, isDemandBased: true }));

  return [...staticRanked, ...demandRanked];
}

/**
 * Allocates `count` safaris of one booking type into `ranked`'s priority
 * order, skipping any (date, session) already in `usedSlots` — shared
 * across both types so the same trip never double-books a session (a
 * customer can't be in a Buffer gate and a Core gate at once). Only
 * considers `slots` that are actually part of the itinerary — the
 * arrival day has no morning safari (still travelling in) and the
 * departure day has no afternoon safari (already checking out), which
 * is why `slots` comes from tripSlots() rather than every date x
 * session combination. Mutates `usedSlots` and appends into `plan` as a
 * side effect; safariNumber is left at 0 for the caller to assign once
 * both types are combined.
 */
function allocate(
  ranked: RankedZone[],
  range: string,
  slots: TripSlot[],
  availability: AvailabilitySnapshot[],
  count: number,
  usedSlots: Set<string>,
  plan: RecommendedSafari[],
  maxScrapedDate: string | null,
  gypsiesRequired: number
): void {
  // A date past the government portal's own rolling booking window has
  // no snapshot at all — not because we failed to check it, but because
  // it isn't open for booking yet. Treated as provisionally open so
  // trips can be planned ahead of the window, but never conflated with
  // a real, checked "available" slot (see isProvisional on the plan
  // entry and AvailabilityGrid's distinct styling for the same case).
  const slotState = (
    zoneId: string,
    date: string,
    session: "morning" | "afternoon"
  ): { open: boolean; provisional: boolean } => {
    const snap = availability.find(
      (a) => a.zoneId === zoneId && a.date === date && a.session === session
    );
    if (snap) {
      return {
        open: snap.status === "available" && snap.availableCount >= gypsiesRequired,
        provisional: false,
      };
    }
    const beyondCoverage = !!maxScrapedDate && date > maxScrapedDate;
    return { open: beyondCoverage, provisional: beyondCoverage };
  };

  let placedCount = 0;
  let pass = 0;
  while (placedCount < count && pass < Math.max(3, count)) {
    for (const { zone, rank, isDemandBased } of ranked) {
      if (placedCount >= count) break;
      if (AUTO_RECOMMENDATION_EXCLUDED_ZONE_IDS.has(zone.id)) continue;
      for (const { date, session } of slots) {
        const slotKey = `${date}|${session}`;
        if (usedSlots.has(slotKey)) continue;
        const { open, provisional } = slotState(zone.id, date, session);
        if (!open) continue;
        usedSlots.add(slotKey);
        // For a statically-ranked range, only the top 4 are presented
        // as primary picks (matches the spec's own worked example);
        // demand-based ranges have no such fixed cutoff.
        const isFillIn = pass > 0 || (!isDemandBased && rank > 4);
        plan.push({
          safariNumber: 0,
          zone,
          date,
          session,
          isFillIn,
          isProvisional: provisional,
          gypsiesRequired,
          reason: isFillIn
            ? `${zone.name} is next best available — top picks were full for this slot`
            : isDemandBased
            ? rank === 1
              ? `Most in-demand zone in ${range} right now`
              : `${ordinal(rank)} most in-demand in ${range}, slot open`
            : rank === 1
            ? `Top sighting frequency in ${range}`
            : `${ordinal(rank)}-strongest in ${range}, slot open`,
        });
        placedCount++;
        break;
      }
    }
    pass++;
  }
}

export type PreferredRecommendation = {
  plan: RecommendedSafari[];
  requestedStartDate: string;
  recommendedStartDate: string | null;
  dayOffset: number | null;
  tier: "primary" | "secondary" | "buffer-only" | null;
  bufferSafaris: number;
  coreSafaris: number;
  ranges: string[];
  rangeLabel: string;
  rangeChanged: boolean;
};

/**
 * Applies the product's recommendation ladder for the requested trip:
 * preferred Buffer/Core mix, one fewer Buffer with the same Core count,
 * then the preferred Buffer count without Core.
 * The preferred mix grows diagonally with trip length: Buffer = nights+1
 * and Core = nights-1 (2N: 3B+1C → 2B+1C → 3B; 3N: 4B+2C →
 * 3B+2C → 4B). On each date candidate, the selected range is exhausted
 * first, then its alternate, then Kolara + Navegaon together. Only after
 * every range scope fails on the requested dates do we try nearby starts,
 * nearest first, through five days before/after.
 */
export function recommendPreferredSafariPlan(params: {
  range: string;
  requestedStartDate: string;
  nights: number;
  availability: AvailabilitySnapshot[];
  gypsiesRequired: number;
  maxScrapedDate?: string | null;
  minimumStartDate?: string;
}): PreferredRecommendation {
  const {
    range,
    requestedStartDate,
    nights,
    availability,
    gypsiesRequired,
    maxScrapedDate = null,
    minimumStartDate,
  } = params;
  const preferredCoreSafaris = Math.max(0, nights - 1);
  const preferredBufferSafaris = nights + 1;
  const strategies = [
    {
      tier: "primary" as const,
      bufferSafaris: preferredBufferSafaris,
      coreSafaris: preferredCoreSafaris,
    },
    {
      tier: "secondary" as const,
      bufferSafaris: Math.max(0, preferredBufferSafaris - 1),
      coreSafaris: preferredCoreSafaris,
    },
    {
      tier: "buffer-only" as const,
      bufferSafaris: preferredBufferSafaris,
      coreSafaris: 0,
    },
  ].filter(
    (strategy, index, all) =>
      strategy.bufferSafaris + strategy.coreSafaris > 0 &&
      all.findIndex(
        (candidate) =>
          candidate.bufferSafaris === strategy.bufferSafaris &&
          candidate.coreSafaris === strategy.coreSafaris
      ) === index
  );

  const candidates = [{ startDate: requestedStartDate, dayOffset: 0 }];
  for (let distance = 1; distance <= 5; distance++) {
    candidates.push(
      { startDate: shiftISODate(requestedStartDate, -distance), dayOffset: -distance },
      { startDate: shiftISODate(requestedStartDate, distance), dayOffset: distance }
    );
  }
  const rangeScopes = recommendationRangeScopes(range);

  for (const candidate of candidates) {
    if (minimumStartDate && candidate.startDate < minimumStartDate) continue;
    const dates = dateRangeFrom(candidate.startDate, nights);
    const dateSet = new Set(dates);
    const candidateAvailability = availability.filter((snapshot) => dateSet.has(snapshot.date));

    for (const ranges of rangeScopes) {
      for (const strategy of strategies) {
        const plan =
          strategy.coreSafaris > 0
            ? recommendMixedPlan({
                ranges,
                dates,
                numSafarisBuffer: strategy.bufferSafaris,
                numSafarisCore: strategy.coreSafaris,
                availability: candidateAvailability,
                maxScrapedDate,
                gypsiesRequired,
              })
            : recommendSafaris({
                ranges,
                dates,
                numSafarisBuffer: strategy.bufferSafaris,
                numSafarisCore: 0,
                availability: candidateAvailability,
                maxScrapedDate,
                gypsiesRequired,
              });
        if (plan.length === strategy.bufferSafaris + strategy.coreSafaris) {
          return {
            plan,
            requestedStartDate,
            recommendedStartDate: candidate.startDate,
            dayOffset: candidate.dayOffset,
            tier: strategy.tier,
            bufferSafaris: strategy.bufferSafaris,
            coreSafaris: strategy.coreSafaris,
            ranges,
            rangeLabel: ranges.join(" + "),
            rangeChanged: ranges.length !== 1 || ranges[0] !== range,
          };
        }
      }
    }
  }

  return {
    plan: [],
    requestedStartDate,
    recommendedStartDate: null,
    dayOffset: null,
    tier: null,
    bufferSafaris: 0,
    coreSafaris: 0,
    ranges: [range],
    rangeLabel: range,
    rangeChanged: false,
  };
}

export function recommendationRangeScopes(selectedRange: string): string[][] {
  const scopes =
    selectedRange === "Pench"
      ? [["Pench"]]
      : selectedRange === "Kolara"
      ? [["Kolara"], ["Moharli"], ["Kolara", "Navegaon"]]
      : selectedRange === "Moharli"
      ? [["Moharli"], ["Kolara"], ["Kolara", "Navegaon"]]
      : [[selectedRange], ["Kolara"], ["Moharli"], ["Kolara", "Navegaon"]];

  const seen = new Set<string>();
  return scopes.filter((scope) => {
    const key = scope.join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shiftISODate(iso: string, days: number): string {
  const date = new Date(iso + "T00:00:00");
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}

/** Try combinations of ranked Core zone/sessions before filling Buffer.
 * This avoids a greedy false negative where Core consumes sessions Buffer
 * needs even though another set of Core sessions makes the whole mix fit. */
function recommendMixedPlan(params: {
  ranges: string[];
  dates: string[];
  numSafarisBuffer: number;
  numSafarisCore: number;
  availability: AvailabilitySnapshot[];
  maxScrapedDate: string | null;
  gypsiesRequired: number;
}): RecommendedSafari[] {
  const {
    ranges,
    dates,
    numSafarisBuffer,
    numSafarisCore,
    availability,
    maxScrapedDate,
    gypsiesRequired,
  } = params;
  const rangeLabel = ranges.join(" + ");
  const slots = tripSlots(dates);
  const rankedCore = rankZonesForRanges(ranges, "core", availability);
  const rankedBuffer = rankZonesForRanges(ranges, "buffer", availability);
  const coreCandidates: RecommendedSafari[] = [];

  for (const { zone, rank, isDemandBased } of rankedCore) {
    for (const { date, session } of slots) {
      const snapshot = availability.find(
        (item) => item.zoneId === zone.id && item.date === date && item.session === session
      );
      const provisional = !snapshot && !!maxScrapedDate && date > maxScrapedDate;
      const open = snapshot
        ? snapshot.status === "available" && snapshot.availableCount >= gypsiesRequired
        : provisional;
      if (!open) continue;
      coreCandidates.push({
        safariNumber: 0,
        zone,
        date,
        session,
        isFillIn: !isDemandBased && rank > 4,
        isProvisional: provisional,
        gypsiesRequired,
        reason: isDemandBased
          ? rank === 1
            ? `Most in-demand Core zone in ${rangeLabel} right now`
            : `${ordinal(rank)} most in-demand Core zone in ${rangeLabel}, slot open`
          : rank === 1
          ? `Top Core sighting frequency in ${rangeLabel}`
          : `${ordinal(rank)}-strongest Core zone in ${rangeLabel}, slot open`,
      });
    }
  }

  function searchCoreCombinations(
    startIndex: number,
    chosen: RecommendedSafari[],
    usedSlots: Set<string>
  ): RecommendedSafari[] | null {
    if (chosen.length === numSafarisCore) {
      const plan = [...chosen];
      allocate(
        rankedBuffer,
        rangeLabel,
        slots,
        availability,
        numSafarisBuffer,
        new Set(usedSlots),
        plan,
        maxScrapedDate,
        gypsiesRequired
      );
      return plan.length === numSafarisBuffer + numSafarisCore ? plan : null;
    }

    for (let index = startIndex; index < coreCandidates.length; index++) {
      const candidate = coreCandidates[index];
      const slotKey = `${candidate.date}|${candidate.session}`;
      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);
      const result = searchCoreCombinations(index + 1, [...chosen, candidate], usedSlots);
      usedSlots.delete(slotKey);
      if (result) return result;
    }
    return null;
  }

  const plan = searchCoreCombinations(0, [], new Set());
  if (plan) {
    const sessionOrder = { morning: 0, afternoon: 1 };
    plan.sort(
      (a, b) =>
        a.date.localeCompare(b.date) || sessionOrder[a.session] - sessionOrder[b.session]
    );
    plan.forEach((safari, index) => (safari.safariNumber = index + 1));
    return plan;
  }

  return [];
}

/**
 * Plain filter-and-rank recommendation engine — no ML, mirrors the spec's
 * five steps exactly. Pure function over an already-fetched availability
 * snapshot (see rankZonesForRange) so it works identically whether that
 * snapshot came from mock data or the real DB.
 *
 * Buffer and Core are allocated independently (each against its own
 * ranking) but share one `usedSlots` set, so e.g. "2 Buffer + 2 Core"
 * across a 3-day trip never assigns the same date+session to both.
 * Buffer is allocated first — it's the spec's primary curated product —
 * so Core only fills sessions Buffer didn't need.
 */
export function recommendSafaris(params: {
  range?: string;
  ranges?: string[];
  dates: string[]; // candidate safari dates, e.g. from dateRangeFrom()
  numSafarisBuffer: number;
  numSafarisCore: number;
  availability: AvailabilitySnapshot[]; // covering both types' zones in range
  /** Real max(safari_date) from availability_snapshot — dates past this
   * have no data because the portal hasn't opened them yet, not because
   * we failed to check. Pass null to disable provisional allocation
   * (treat all no-data slots as simply closed). */
  maxScrapedDate?: string | null;
  /** Vehicles needed in every recommended safari slot for this party. */
  gypsiesRequired?: number;
  /** Reserve scarce Core sessions before filling Buffer sessions. Used by
   * the preferred-mix planner so Buffer cannot consume the only Core slot. */
  allocateCoreFirst?: boolean;
}): RecommendedSafari[] {
  const {
    range,
    ranges,
    dates,
    numSafarisBuffer,
    numSafarisCore,
    availability,
    maxScrapedDate = null,
    gypsiesRequired = 1,
    allocateCoreFirst = false,
  } = params;
  const targetRanges = ranges ?? (range ? [range] : []);
  const rangeLabel = targetRanges.join(" + ");

  const slots = tripSlots(dates);
  const usedSlots = new Set<string>(); // "date|session", one safari per slot
  const plan: RecommendedSafari[] = [];

  const allocateBuffer = () =>
    allocate(rankZonesForRanges(targetRanges, "buffer", availability), rangeLabel, slots, availability, numSafarisBuffer, usedSlots, plan, maxScrapedDate, gypsiesRequired);
  const allocateCore = () =>
    allocate(rankZonesForRanges(targetRanges, "core", availability), rangeLabel, slots, availability, numSafarisCore, usedSlots, plan, maxScrapedDate, gypsiesRequired);

  if (allocateCoreFirst) {
    allocateCore();
    allocateBuffer();
  } else {
    allocateBuffer();
    allocateCore();
  }

  // Present as a chronological itinerary (day 1 morning, day 1 afternoon,
  // ...) rather than in the order the two types were assembled in.
  const sessionOrder = { morning: 0, afternoon: 1 };
  plan.sort(
    (a, b) => a.date.localeCompare(b.date) || sessionOrder[a.session] - sessionOrder[b.session]
  );
  plan.forEach((s, i) => (s.safariNumber = i + 1));

  return plan;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
