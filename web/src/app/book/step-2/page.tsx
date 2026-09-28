"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StepIndicator } from "@/components/StepIndicator";
import { ZonePlanCard } from "@/components/ZonePlanCard";
import { AvailabilityGrid, type AvailabilitySelection } from "@/components/AvailabilityGrid";
import { useBooking } from "@/lib/booking-context";
import { dateRangeFrom, RANKING, RESORTS, toLocalISODate, ZONES } from "@/lib/mockData";
import {
  recommendationRangeScopes,
  recommendPreferredSafariPlan,
  type PreferredRecommendation,
} from "@/lib/engine";
import { fetchAvailability, fetchAvailabilityCoverage } from "@/lib/liveAvailability";
import { calculatePartyOccupancy } from "@/lib/occupancy";
import { computeCart } from "@/lib/pricing";
import type { AvailabilitySnapshot, ZoneType } from "@/lib/types";

const REFRESH_INTERVAL_MS = 20000;

export default function Step2() {
  const router = useRouter();
  const { state, update } = useBooking();
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySnapshot[]>([]);
  const [maxScrapedDate, setMaxScrapedDate] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [recommendation, setRecommendation] = useState<PreferredRecommendation | null>(null);
  const [cartAnimationKey, setCartAnimationKey] = useState(0);
  const [dateChangeNotice, setDateChangeNotice] = useState<string | null>(null);
  const [activeZoneType, setActiveZoneType] = useState<ZoneType>("buffer");
  const occupancy = calculatePartyOccupancy(state.numAdults, state.childAges);
  const today = toLocalISODate(new Date());
  const planningHorizon = "2027-12-31";

  useEffect(() => {
    fetchAvailabilityCoverage(state.jungleSlug ?? undefined).then(setMaxScrapedDate);
  }, [state.jungleSlug]);

  useEffect(() => {
    if (!state.range || !state.startDate) {
      router.replace("/book/step-1");
    }
  }, [state.range, state.startDate, router]);

  const requestedDates = useMemo(
    () => (state.startDate ? dateRangeFrom(state.startDate, state.nights) : []),
    [state.startDate, state.nights]
  );
  const coverageDates = useMemo(
    () =>
      state.startDate
        ? dateRangeFrom(shiftISODate(state.startDate, -5), state.nights + 10)
        : [],
    [state.startDate, state.nights]
  );
  const candidateRanges = useMemo(
    () =>
      state.range
        ? Array.from(new Set(recommendationRangeScopes(state.range).flat()))
        : [],
    [state.range]
  );
  const dates = useMemo(
    () =>
      state.recommendedStartDate
        ? dateRangeFrom(state.recommendedStartDate, state.nights)
        : requestedDates,
    [state.recommendedStartDate, state.nights, requestedDates]
  );

  useEffect(() => {
    const poll = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_INTERVAL_MS);
    const tickClock = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tickClock);
    };
  }, []);

  // Fetches from our own availability_snapshot-backed API — never the
  // live government portal (see scraper/README.md). Covers BOTH Buffer
  // and Core zones across every allowed fallback range in one call, since
  // a recommendation can switch ranges or combine Kolara + Navegaon.
  useEffect(() => {
    if (!state.range || !state.startDate || coverageDates.length === 0) return;
    const zoneIds = ZONES.filter((z) => candidateRanges.includes(z.range)).map((z) => z.id);
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard loading-flag-before-fetch pattern
    setLoading(true);
    fetchAvailability(zoneIds, coverageDates)
      .then((data) => {
        if (cancelled) return;
        setAvailability(data);
        setFetchError(null);
        const result = recommendPreferredSafariPlan({
          range: state.range!,
          requestedStartDate: state.startDate!,
          nights: state.nights,
          availability: data,
          maxScrapedDate,
          gypsiesRequired: occupancy.gypsiesRequired,
          minimumStartDate: toLocalISODate(new Date()),
        });
        setRecommendation(result);
        update({ recommendedStartDate: result.recommendedStartDate });
        setDateChangeNotice((current) =>
          current
            ? "Dates updated. The new recommendations and live availability are ready."
            : current
        );
        setAsOf(new Date());
        setSecondsAgo(0);
      })
      .catch(() => {
        if (!cancelled) setFetchError("Couldn't reach the availability store — try refreshing.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.range, state.startDate, state.nights, coverageDates.join(","), candidateRanges.join(","), refreshTick, maxScrapedDate, occupancy.gypsiesRequired]);

  const recommendationRanges = useMemo(
    () => recommendation?.ranges ?? (state.range ? [state.range] : []),
    [recommendation?.ranges, state.range]
  );
  const resortsForRange = RESORTS.filter((r) => recommendationRanges.includes(r.range));
  const availabilitySections = useMemo(() => {
    if (!state.range || requestedDates.length === 0) return [];

    const sections: Array<{
      range: string;
      dates: string[];
      context: "original" | "recommended";
    }> = [{ range: state.range, dates: requestedDates, context: "original" }];

    const recommendedDates = state.recommendedStartDate
      ? dateRangeFrom(state.recommendedStartDate, state.nights)
      : requestedDates;

    for (const range of recommendationRanges) {
      const duplicatesOriginalSearch =
        range === state.range &&
        recommendedDates.length === requestedDates.length &&
        recommendedDates.every((date, index) => date === requestedDates[index]);
      if (!duplicatesOriginalSearch) {
        sections.push({ range, dates: recommendedDates, context: "recommended" });
      }
    }

    return sections;
  }, [
    state.range,
    state.recommendedStartDate,
    state.nights,
    requestedDates,
    recommendationRanges,
  ]);
  // Arrival afternoon + departure morning + both sessions on the days
  // between define the maximum possible safari count. The recommender
  // may deliberately return one fewer when the preferred mix is full;
  // the customer can then customize the selected slots in the grids.
  const maximumSafaris = state.nights * 2;
  const recommendedPlan = recommendation?.plan ?? [];
  const recommendedBufferSafaris = recommendedPlan.filter(
    (safari) => safari.zone.type === "buffer"
  ).length;
  const recommendedCoreSafaris = recommendedPlan.filter(
    (safari) => safari.zone.type === "core"
  ).length;
  const selectedResort = RESORTS.find((resort) => resort.id === state.resortId);
  const cartItemCount = state.plan.length + (selectedResort ? 1 : 0) + (state.transfers ? 1 : 0);
  const { total: cartTotal } = computeCart(state);
  const isAvailabilityAreaRefreshing = loading && dateChangeNotice !== null;

  const isCurated = (range: string, zoneType: ZoneType) =>
    ZONES.some(
      (z) => z.range === range && z.type === zoneType && RANKING.some((r) => r.zoneId === z.id)
    );

  function toggleSafari(safariToToggle: (typeof state.plan)[number]) {
    const isAlreadySelected = state.plan.some(
      (safari) =>
        safari.zone.id === safariToToggle.zone.id &&
        safari.date === safariToToggle.date &&
        safari.session === safariToToggle.session
    );
    let plan = isAlreadySelected
      ? state.plan.filter(
          (safari) =>
            !(
              safari.zone.id === safariToToggle.zone.id &&
              safari.date === safariToToggle.date &&
              safari.session === safariToToggle.session
            )
        )
      : [
          ...state.plan.filter(
            (safari) =>
              !(safari.date === safariToToggle.date && safari.session === safariToToggle.session)
          ),
          safariToToggle,
        ];

    const sessionOrder = { morning: 0, afternoon: 1 };
    plan = plan
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || sessionOrder[a.session] - sessionOrder[b.session]
      )
      .map((safari, index) => ({ ...safari, safariNumber: index + 1 }));
    update({
      plan,
      numSafarisBuffer: plan.filter((safari) => safari.zone.type === "buffer").length,
      numSafarisCore: plan.filter((safari) => safari.zone.type === "core").length,
    });
    if (!isAlreadySelected) setCartAnimationKey((key) => key + 1);
  }

  function handleToggleSelection(selection: AvailabilitySelection) {
    toggleSafari({
      safariNumber: 0,
      zone: selection.zone,
      date: selection.date,
      session: selection.session,
      reason: `Selected from live availability · priority #${selection.rank}`,
      isFillIn: false,
      isProvisional: selection.isProvisional,
      gypsiesRequired: occupancy.gypsiesRequired,
    });
  }

  function handleResortSelection(resortId: string) {
    const isRemoving = state.resortId === resortId;
    update({ resortId: isRemoving ? null : resortId });
    if (!isRemoving) setCartAnimationKey((key) => key + 1);
  }

  function changeStartDate(startDate: string) {
    if (!startDate || startDate < today || startDate > planningHorizon) return;
    const removedSafaris = state.plan.length;
    update({
      startDate,
      plan: [],
      numSafarisBuffer: 0,
      numSafarisCore: 0,
    });
    setError(null);
    setDateChangeNotice(
      removedSafaris > 0
        ? `Dates updated. ${removedSafaris} selected ${removedSafaris === 1 ? "safari was" : "safaris were"} removed from your cart so you can choose from the new availability.`
        : "Dates updated. Checking recommendations and live availability now."
    );
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (state.plan.length === 0) {
      setError("Select at least one available safari to continue.");
      return;
    }
    const unavailableSelection = state.plan.some((safari) => {
      if (safari.isProvisional) return false;
      const snapshot = availability.find(
        (item) =>
          item.zoneId === safari.zone.id &&
          item.date === safari.date &&
          item.session === safari.session
      );
      return (
        !snapshot ||
        snapshot.status !== "available" ||
        snapshot.availableCount < occupancy.gypsiesRequired
      );
    });
    if (unavailableSelection) {
      setError("Availability changed for one of your selected safaris. Refresh and choose another open slot.");
      return;
    }
    if (!state.resortId) {
      setError("Pick a resort to continue.");
      return;
    }
    setError(null);
    router.push("/book/step-3");
  }

  return (
    <div className="relative -mt-20 min-h-screen overflow-hidden bg-[linear-gradient(180deg,#c9f1ff_0%,#e7f8ef_28%,#f8faf7_62%,#ffffff_100%)] pb-24 pt-20 sm:-mt-24 sm:pt-24">
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-white/55 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-48 h-80 w-80 rounded-full bg-[#7ed7ff]/25 blur-3xl" aria-hidden="true" />
      <div className="relative">
      <StepIndicator current={2} />
      <form onSubmit={handleContinue} className="mx-3 space-y-6 pb-28 sm:mx-auto sm:max-w-6xl sm:pb-8">
        <div className="px-2 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#236d61]">Step 2 of 3</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-brand-dark sm:text-4xl">Build Your Safari</h1>
          <p className="mt-2 text-sm text-[#53686d]">
            {recommendation?.rangeLabel ?? state.range} · {dates[0] && formatShort(dates[0])} –{" "}
            {dates[dates.length - 1] && formatShort(dates[dates.length - 1])}
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_20px_48px_rgba(27,72,78,0.14)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#236d61]">Recommended route</p>
          <p className="font-display mt-2 text-2xl font-bold text-brand-dark">A considered plan for your dates</p>
          <p className="mt-2 text-xs leading-5 text-muted">
            Your {state.nights}N/{state.nights + 1}D trip has up to {maximumSafaris} safari sessions.
            We try {state.nights + 1} Buffer + {Math.max(0, state.nights - 1)} Core, then {state.nights} Buffer + {Math.max(0, state.nights - 1)} Core,
            then {state.nights + 1} Buffer. Each ladder follows zone-ranking priority.
          </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-[#18212f] px-5 py-4 text-white sm:text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/55">Plan size</p>
            <p className="font-display mt-1 text-3xl font-bold text-accent">{recommendedPlan.length}</p>
            <p className="text-[10px] text-white/65">recommended safaris</p>
          </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-[#18212f] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">
              {recommendedPlan.length} recommended
            </span>
            <span className="rounded-full border border-[#dfe7e4] bg-[#f8faf9] px-3.5 py-1.5 text-xs font-semibold text-[#31433f]">
              {recommendedBufferSafaris} Buffer
            </span>
            <span className="rounded-full border border-[#dfe7e4] bg-[#f8faf9] px-3.5 py-1.5 text-xs font-semibold text-[#31433f]">
              {recommendedCoreSafaris} Core
            </span>
          </div>
          {recommendation?.tier && (
            <p className="mt-3 text-xs font-medium text-brand">
              {recommendation.tier === "primary"
                ? "Most-preferred combination"
                : recommendation.tier === "secondary"
                ? `Second-preference combination — the full ${maximumSafaris}-safari mix was unavailable`
                : "Buffer-only fallback — mixed Buffer/Core options were unavailable"}
            </p>
          )}
        </div>

        {!isAvailabilityAreaRefreshing && recommendation?.rangeChanged && (
          <div className="rounded-xl border border-brand/25 bg-accent-light p-4">
            <p className="text-sm font-semibold text-brand">A better range is available</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              The three safari combinations were unavailable in {state.range}. We found this plan in {recommendation.rangeLabel}
              {recommendation.ranges.length > 1
                ? " after both the selected and alternate single ranges failed."
                : " after the selected range's full ladder failed."}
            </p>
          </div>
        )}

        {!isAvailabilityAreaRefreshing && recommendation && recommendation.dayOffset !== null && recommendation.dayOffset !== 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
            <p className="text-sm font-semibold text-warning">Better availability on nearby dates</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              The preferred safari combinations were not available for {formatShort(state.startDate!)}.
              We found the nearest workable trip {Math.abs(recommendation.dayOffset)} day
              {Math.abs(recommendation.dayOffset) === 1 ? "" : "s"}{" "}
              {recommendation.dayOffset < 0 ? "earlier" : "later"}: {formatShort(dates[0])}–
              {formatShort(dates[dates.length - 1])}, using {recommendation.rangeLabel} after checking the allowed range fallbacks.
            </p>
          </div>
        )}

        <div className="rounded-[24px] border border-[#18212f] bg-[#18212f] p-5 text-white shadow-[0_14px_36px_rgba(24,33,47,0.16)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Vehicle selected automatically</p>
              <p className="mt-2 text-sm leading-5 text-white/75">
                Your {occupancy.totalTravellers}-person group needs {occupancy.gypsiesRequired}{" "}
                {occupancy.gypsiesRequired === 1 ? "gypsy" : "gypsies"} for every safari.
              </p>
            </div>
            <div className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-black">
              {occupancy.gypsiesRequired} {occupancy.gypsiesRequired === 1 ? "gypsy" : "gypsies"}
            </div>
          </div>
          <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/55">
            Availability numbers are vehicles, not seats. A green “6” means 6 gypsies are open.
            We only recommend a slot when it has enough vehicles for your whole group.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-[0_8px_24px_rgba(27,72,78,0.07)] backdrop-blur">
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="relative flex h-2 w-2">
              {!loading && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${loading ? "bg-muted" : "bg-success"}`}
              />
            </span>
            {loading
              ? "Refreshing…"
              : `Live availability · updated ${
                  asOf ? (secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`) : "—"
                }`}
          </span>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={loading}
            className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
          >
            Refresh now
          </button>
        </div>

        {fetchError && <p className="text-sm text-danger">{fetchError}</p>}

        <div
          aria-busy={isAvailabilityAreaRefreshing}
          className={`rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_16px_40px_rgba(27,72,78,0.10)] transition-opacity sm:p-6 ${isAvailabilityAreaRefreshing ? "opacity-55" : "opacity-100"}`}
        >
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#236d61]">Start here</p>
          <label className="font-display mt-1 block text-2xl font-bold text-brand-dark">Your recommended safaris</label>
          <p className="mb-4 mt-1 text-xs text-muted">
            Recommendations are not added automatically. Choose the safaris you want to put in your cart.
          </p>
          {recommendedPlan.length === 0 ? (
            loading ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                Checking your dates and nearby availability…
              </p>
            ) : (
              <div className="rounded-xl border border-dashed border-warning/40 bg-warning/10 p-6 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Safari is not possible on your dates or within 5 days before or after. Choose another date or contact our team—we&apos;ll plan your perfect jungle safari.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {recommendedPlan.map((safari) => (
                <ZonePlanCard
                  key={`${safari.zone.id}-${safari.date}-${safari.session}`}
                  safari={safari}
                  isSelected={state.plan.some(
                    (selected) =>
                      selected.zone.id === safari.zone.id &&
                      selected.date === safari.date &&
                      selected.session === safari.session
                  )}
                  onToggle={() => toggleSafari(safari)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_16px_40px_rgba(27,72,78,0.10)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#236d61]">Try nearby dates</p>
              <label htmlFor="availability-start-date" className="font-display mt-1 block text-xl font-bold text-brand-dark">
                Change safari dates
              </label>
              <p className="mt-1 text-xs text-muted">
                Select a new trip start date. Your {state.nights}N/{state.nights + 1}D availability tables will refresh automatically.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!state.startDate || state.startDate <= today}
                onClick={() => state.startDate && changeStartDate(shiftISODate(state.startDate, -1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg font-semibold text-brand transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous day"
                title="Previous day"
              >
                ‹
              </button>
              <input
                id="availability-start-date"
                type="date"
                min={today}
                max={planningHorizon}
                value={state.startDate ?? ""}
                onChange={(event) => changeStartDate(event.target.value)}
                className="h-10 min-w-0 rounded-xl border border-[#d9e1de] bg-white px-3 text-sm font-medium outline-none focus:border-[#236d61]"
              />
              <button
                type="button"
                disabled={!state.startDate || state.startDate >= planningHorizon}
                onClick={() => state.startDate && changeStartDate(shiftISODate(state.startDate, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-lg font-semibold text-brand transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next day"
                title="Next day"
              >
                ›
              </button>
            </div>
          </div>
          {dateChangeNotice && (
            <p className="mt-3 rounded-lg bg-accent-light px-3 py-2 text-xs text-warning">
              {dateChangeNotice}
            </p>
          )}
        </div>

        <div className="relative" aria-busy={isAvailabilityAreaRefreshing}>
          {isAvailabilityAreaRefreshing && (
            <div className="absolute inset-0 z-20 flex min-h-72 items-start justify-center rounded-xl bg-surface/75 pt-20 backdrop-blur-[1px]">
              <div className="flex items-center gap-3 rounded-full border border-brand/20 bg-surface px-5 py-3 text-sm font-semibold text-brand shadow-lg">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
                Refreshing safari availability…
              </div>
            </div>
          )}
          <div className={`rounded-[26px] border border-white/80 bg-white/92 p-4 shadow-[0_16px_40px_rgba(27,72,78,0.10)] transition-opacity sm:p-6 ${isAvailabilityAreaRefreshing ? "opacity-45" : "opacity-100"}`}>
          <div className="mb-5 flex flex-col gap-4 border-b border-[#e7ecea] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#236d61]">Explore every option</p>
              <h2 className="font-display mt-1 text-2xl font-bold text-brand-dark">Live safari slots</h2>
              <p className="mt-1 text-xs text-muted">Choose an open vehicle count to add or replace a safari.</p>
            </div>
            <div className="grid min-w-60 grid-cols-2 rounded-full bg-[#eef3f1] p-1" aria-label="Safari zone type">
              {(["buffer", "core"] as ZoneType[]).map((zoneType) => (
                <button
                  key={zoneType}
                  type="button"
                  onClick={() => setActiveZoneType(zoneType)}
                  className={`rounded-full px-4 py-2.5 text-xs font-bold capitalize transition ${
                    activeZoneType === zoneType
                      ? "bg-[#18212f] text-white shadow-[0_6px_16px_rgba(24,33,47,0.20)]"
                      : "text-muted hover:text-brand"
                  }`}
                >
                  {zoneType} zones
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-6">
          {availabilitySections.map((section) => {
            const zt = activeZoneType;
            const activeRange = section.range;
            const curated = isCurated(activeRange, zt);
            return (
              <div key={`${section.context}-${activeRange}-${section.dates[0]}-${zt}`}>
              <div className="mb-2 flex items-center justify-between">
                <label className="font-display text-lg font-bold capitalize text-brand-dark">
                  All {zt} zones in {activeRange}
                    <span className="ml-2 font-sans text-[10px] font-semibold uppercase tracking-wider text-brand">
                    {section.context === "original" ? "Original search" : "Recommended alternative"}
                  </span>
                </label>
                <span className="text-xs text-muted">Highlighted = in your plan</span>
              </div>
              <p className="mb-2 text-xs text-muted">
                {curated
                  ? "Every zone for these dates, ranked by sighting quality — this is what the plan above was built from."
                  : "Every zone for these dates. This isn't reviewed by our team yet, so zones are ordered by current demand — this is what the plan above was built from."}
              </p>
              <p className="mb-2 text-xs font-medium text-brand">
                Select a green slot to add or replace a safari. Select a highlighted slot to remove it.
              </p>
              {section.dates.length > 0 && (
                <AvailabilityGrid
                  range={activeRange}
                  zoneType={zt}
                  dates={section.dates}
                  plan={state.plan}
                  availability={availability}
                  maxScrapedDate={maxScrapedDate}
                  gypsiesRequired={occupancy.gypsiesRequired}
                  onToggleSelection={handleToggleSelection}
                />
              )}
              </div>
            );
          })}
          </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/80 bg-white/92 p-5 shadow-[0_16px_40px_rgba(27,72,78,0.10)] sm:p-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#236d61]">Complete your trip</p>
          <label className="font-display mb-3 mt-1 block text-xl font-bold text-brand-dark">Preferred Resort</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {resortsForRange.map((resort) => {
              const selected = state.resortId === resort.id;
              return (
                <button
                  type="button"
                  key={resort.id}
                  onClick={() => handleResortSelection(resort.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected ? "border-accent bg-[#fff8dc] shadow-[0_5px_16px_rgba(253,203,8,0.13)]" : "border-[#e1e7e5] bg-white hover:border-[#9ebbb3]"
                  }`}
                >
                  <p className="text-sm font-semibold">{resort.name}</p>
                  <p className="text-xs capitalize text-muted">{resort.tier}</p>
                  <p className="mt-1 text-sm font-medium text-brand">
                    ₹{resort.pricePerNight.toLocaleString("en-IN")}/night
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(27,72,78,0.08)]">
          <input
            type="checkbox"
            checked={state.transfers}
            onChange={(e) => {
              update({ transfers: e.target.checked });
              if (e.target.checked) setCartAnimationKey((key) => key + 1);
            }}
            className="h-4 w-4 accent-brand"
          />
          <span className="text-sm font-medium">Add transfers (pickup & drop)</span>
        </label>

        <section
          id="safari-cart"
          aria-live="polite"
          className="overflow-hidden rounded-[24px] border border-[#18212f] bg-white shadow-[0_18px_42px_rgba(24,33,47,0.16)]"
        >
          <div
            key={`cart-heading-${cartAnimationKey}`}
            className={`flex items-center justify-between bg-[#18212f] px-5 py-4 text-white ${
              cartAnimationKey > 0 ? "cart-bump" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">🛒</span>
              <div>
                <h2 className="text-sm font-semibold">Your safari cart</h2>
                <p className="text-xs text-white/75">
                  {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
                </p>
              </div>
            </div>
            <p className="font-semibold">₹{cartTotal.toLocaleString("en-IN")}</p>
          </div>

          {cartItemCount === 0 ? (
            <p className="p-5 text-center text-sm text-muted">
              Your cart is empty. Add at least one recommended or live-availability safari.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {state.plan.map((safari) => (
                <div
                  key={`cart-${safari.zone.id}-${safari.date}-${safari.session}`}
                  className="cart-item-in flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{safari.zone.name} safari</p>
                    <p className="text-xs text-muted">
                      {formatShort(safari.date)} · {safari.session === "morning" ? "Morning" : "Afternoon"} ·{" "}
                      {safari.gypsiesRequired} {safari.gypsiesRequired === 1 ? "gypsy" : "gypsies"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSafari(safari)}
                    className="shrink-0 text-xs font-semibold text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {selectedResort && (
                <div className="cart-item-in flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{selectedResort.name}</p>
                    <p className="text-xs text-muted">
                      Resort · {state.nights} night{state.nights === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => update({ resortId: null })}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {state.transfers && (
                <div className="cart-item-in flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Pickup & drop transfers</p>
                    <p className="text-xs text-muted">Added to your trip</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => update({ transfers: false })}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/book/step-1")}
            className="rounded-2xl border border-[#d9e1de] bg-white px-5 py-3.5 font-semibold text-foreground transition hover:border-brand"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-2xl bg-accent py-3.5 font-bold text-black shadow-[0_10px_24px_rgba(253,203,8,0.24)] transition hover:bg-[#e7b900] disabled:opacity-50"
          >
            {loading ? "Checking availability…" : "Continue"}
          </button>
        </div>
      </form>

      {cartItemCount > 0 && (
        <button
          key={`floating-cart-${cartAnimationKey}`}
          type="button"
          onClick={() => document.getElementById("safari-cart")?.scrollIntoView({ behavior: "smooth" })}
          className={`fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between rounded-2xl bg-[#18212f] px-5 py-3 text-left text-white shadow-2xl sm:hidden ${
            cartAnimationKey > 0 ? "cart-bump" : ""
          }`}
        >
          <span>
            <span className="block text-sm font-semibold">🛒 {cartItemCount} {cartItemCount === 1 ? "item" : "items"}</span>
            <span className="block text-xs text-white/75">Tap to view cart</span>
          </span>
          <span className="font-bold">₹{cartTotal.toLocaleString("en-IN")}</span>
        </button>
      )}
      </div>
    </div>
  );
}

function formatShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function shiftISODate(iso: string, days: number): string {
  const date = new Date(iso + "T00:00:00");
  date.setDate(date.getDate() + days);
  return toLocalISODate(date);
}
