"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StepIndicator } from "@/components/StepIndicator";
import { useBooking } from "@/lib/booking-context";
import { RANKING, ZONES, toLocalISODate } from "@/lib/mockData";
import { calculatePartyOccupancy } from "@/lib/occupancy";
import type { Jungle } from "@/lib/types";

const PLANNING_HORIZON = "2027-12-31";
type BookingSpecialFare = "group_of_4" | "senior" | "gst" | "armed_forces" | "medical";

export function StepOneClient({ jungles }: { jungles: Jungle[] }) {
  const router = useRouter();
  const { state, update } = useBooking();
  const availableJungles = jungles.filter((item) => !item.comingSoon);
  const jungle = availableJungles.find((item) => item.slug === state.jungleSlug) ?? availableJungles[0];
  const [error, setError] = useState<string | null>(null);
  const [junglePickerOpen, setJunglePickerOpen] = useState(false);
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [lengthPickerOpen, setLengthPickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const base = state.startDate ? new Date(`${state.startDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [dateFlexibility, setDateFlexibility] = useState<0 | 1 | 2 | 3>(0);
  const [travellerPickerOpen, setTravellerPickerOpen] = useState(false);
  const appliedQueryJungle = useRef(false);
  const specialFaresSliderRef = useRef<HTMLDivElement>(null);
  const occupancy = calculatePartyOccupancy(state.numAdults, state.childAges);
  const partySize = state.numAdults + state.childAges.length;
  const requiresChildAges = partySize > 6 && state.childAges.length > 0;
  const today = toLocalISODate(new Date());

  useEffect(() => {
    if (appliedQueryJungle.current) return;
    appliedQueryJungle.current = true;
    const requestedSlug = new URLSearchParams(window.location.search).get("jungle");
    const requestedJungle = jungles.find(
      (item) => !item.comingSoon && item.slug === requestedSlug
    );
    if (requestedJungle && requestedJungle.slug !== state.jungleSlug) {
      update({
        jungleSlug: requestedJungle.slug,
        range: requestedJungle.ranges.length === 1 ? requestedJungle.ranges[0] : null,
        recommendedStartDate: null,
        plan: [],
        resortId: null,
      });
    }
  }, [jungles, state.jungleSlug, update]);

  if (!jungle) {
    return (
      <div className="mx-auto my-16 max-w-xl rounded-2xl border border-border bg-white p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-brand-dark">No jungles are available</h1>
        <p className="mt-2 text-sm text-muted">Add at least one active jungle in the database to start planning.</p>
      </div>
    );
  }

  const isCurated = (range: string) =>
    ZONES.some((zone) => zone.range === range && RANKING.some((ranking) => ranking.zoneId === zone.id));

  function closePickers(except?: "jungle" | "range" | "length" | "travellers") {
    if (except !== "jungle") setJunglePickerOpen(false);
    if (except !== "range") setRangePickerOpen(false);
    if (except !== "length") setLengthPickerOpen(false);
    if (except !== "travellers") setTravellerPickerOpen(false);
    setCalendarOpen(false);
  }

  function handleContinue(event: React.FormEvent) {
    event.preventDefault();
    if (!state.range) {
      setError("Pick a range to continue.");
      setRangePickerOpen(true);
      return;
    }
    if (!state.startDate) {
      setError("Pick your travel date.");
      return;
    }
    if (state.startDate > PLANNING_HORIZON) {
      setError(`We can only plan trips through ${formatShort(PLANNING_HORIZON)} for now.`);
      return;
    }
    if (occupancy.totalTravellers === 0) {
      setError("Add at least one traveller.");
      setTravellerPickerOpen(true);
      return;
    }
    if (requiresChildAges && state.childAges.some((age) => age === "" || !Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 17)) {
      setError("Add a valid age from 0 to 17 for every child.");
      setTravellerPickerOpen(true);
      return;
    }
    setError(null);
    router.push("/book/step-2");
  }

  function setAdults(value: number) {
    update({ numAdults: value, numTravellers: value + state.childAges.length, recommendedStartDate: null, plan: [] });
  }

  function setChildCount(count: number) {
    const childAges = [...state.childAges];
    while (childAges.length < count) childAges.push("");
    const nextChildAges = childAges.slice(0, count);
    update({ childAges: nextChildAges, numTravellers: state.numAdults + count, recommendedStartDate: null, plan: [] });
  }

  function setChildAge(index: number, age: string) {
    const childAges = [...state.childAges];
    childAges[index] = age;
    update({ childAges, recommendedStartDate: null, plan: [] });
  }

  function toggleSpecialFare(fare: BookingSpecialFare) {
    update({
      specialFares: state.specialFares.includes(fare)
        ? state.specialFares.filter((item) => item !== fare)
        : [...state.specialFares, fare],
    });
  }

  return (
    <div className="relative -mt-20 min-h-screen overflow-hidden bg-[linear-gradient(180deg,#c9f1ff_0%,#e6f8ed_34%,#ffffff_70%)] pb-12 pt-20 sm:-mt-24 sm:pt-24">
      <div className="pointer-events-none absolute -left-16 top-20 h-56 w-56 rounded-full bg-white/45 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 top-32 h-64 w-64 rounded-full bg-[#7ed7ff]/30 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <StepIndicator current={1} />
        <div className="mx-auto mb-6 px-5 text-center sm:mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#236d61]">Wild Excursions</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-brand-dark sm:text-4xl">Plan Your Jungle Safari</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#53686d]">One simple plan for your safaris, stay and transfers.</p>
        </div>

      <form onSubmit={handleContinue} className="mx-3 overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-[0_24px_55px_rgba(27,72,78,0.18)] backdrop-blur-xl sm:mx-auto sm:max-w-3xl">
        <div className="border-b border-[#dce6e5] p-4 sm:p-5">
          <div className="grid grid-cols-2 rounded-full bg-[#f0f3f4] p-1">
            <button type="button" onClick={() => update({ transfers: true })} className={`rounded-full px-3 py-3 text-[11px] font-semibold transition sm:text-[13px] ${state.transfers ? "bg-[#18212f] text-white shadow-[0_6px_16px_rgba(24,33,47,0.22)]" : "text-muted"}`}>With Transfers</button>
            <button type="button" onClick={() => update({ transfers: false })} className={`rounded-full px-3 py-3 text-[11px] font-semibold transition sm:text-[13px] ${!state.transfers ? "bg-[#18212f] text-white shadow-[0_6px_16px_rgba(24,33,47,0.22)]" : "text-muted"}`}>Without Transfers</button>
          </div>
        </div>

        <div className="space-y-3 bg-white/55 p-4 pb-5 sm:p-6">
          <SelectionButton icon="jungle" label="Which jungle" value={jungle.name} open={junglePickerOpen} onClick={() => {
            const next = !junglePickerOpen;
            closePickers("jungle");
            setJunglePickerOpen(next);
          }} />

          {junglePickerOpen && (
            <div className="overflow-hidden rounded-2xl border border-[#ded8c7] bg-white shadow-[0_14px_36px_rgba(17,17,17,0.10)]">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-brand-dark">Choose a national park</p>
                  <p className="mt-0.5 text-[11px] text-muted">More destinations are being added</p>
                </div>
                <span className="rounded-full bg-[#e9f5ed] px-2.5 py-1 text-[10px] font-bold text-success">
                  {availableJungles.length} live
                </span>
              </div>
              <div className="max-h-[370px] overflow-y-auto overscroll-contain p-3">
                {(["Maharashtra", "Madhya Pradesh"] as const).map((stateName) => (
                <div key={stateName} className="not-first:mt-5">
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{stateName}</p>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-1.5">
                    {jungles.filter((item) => item.state === stateName).map((item) => {
                      const selected = jungle.slug === item.slug;
                      if (item.comingSoon) {
                        return (
                          <div
                            key={item.slug}
                            className="grid min-h-14 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl border border-transparent bg-[#f7f7f5] p-2 opacity-70"
                          >
                            <Image
                              src={item.image}
                              alt=""
                              width={40}
                              height={40}
                              className="block h-10 w-10 max-w-none rounded-lg object-cover grayscale"
                              style={{ width: 40, height: 40, minWidth: 40, maxWidth: 40 }}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-[#555]">{item.name}</span>
                              <span className="block truncate text-[10px] text-muted">{item.tagline}</span>
                            </span>
                            <span className="rounded-full border border-[#eadfba] bg-[#fff9e7] px-2 py-1 text-[9px] font-bold text-[#7d6b34]">Soon</span>
                          </div>
                        );
                      }
                      return (
                        <button type="button" key={item.slug} onClick={() => {
                          update({ jungleSlug: item.slug, range: item.ranges.length === 1 ? item.ranges[0] : null, recommendedStartDate: null, plan: [], resortId: null });
                          setJunglePickerOpen(false);
                        }} className={`grid min-h-[70px] w-full grid-cols-[52px_minmax(0,1fr)_32px] items-center gap-3 overflow-hidden rounded-xl border p-2 text-left transition ${selected ? "border-accent bg-[linear-gradient(100deg,#fff9e4,#fff3bc)] shadow-[0_5px_14px_rgba(253,203,8,0.14)]" : "border-border bg-white hover:border-accent hover:bg-[#fffdf5]"}`}>
                          <Image
                            src={item.image}
                            alt=""
                            width={52}
                            height={52}
                            className="block h-[52px] w-[52px] max-w-none rounded-[10px] object-cover shadow-sm"
                            style={{ width: 52, height: 52, minWidth: 52, maxWidth: 52 }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-brand-dark">{item.name}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted">{item.tagline}</span>
                          </span>
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold ${selected ? "border-success bg-success text-white" : "border-border bg-white text-muted"}`}>
                            {selected ? "✓" : "›"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                ))}
              </div>
            </div>
          )}

          <SelectionButton icon="range" label="Which range" value={state.range ?? "Choose a range"} placeholder={!state.range} open={rangePickerOpen} onClick={() => {
            const next = !rangePickerOpen;
            closePickers("range");
            setRangePickerOpen(next);
          }} />

          {rangePickerOpen && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-white p-3 shadow-sm sm:grid-cols-4">
              {jungle.ranges.map((range) => (
                <button type="button" key={range} onClick={() => {
                  update({ jungleSlug: jungle.slug, range, recommendedStartDate: null, plan: [] });
                  setRangePickerOpen(false);
                }} title={isCurated(range) ? undefined : "Ranked by current demand — not yet reviewed by our team"} className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${state.range === range ? "border-brand bg-brand text-white" : "border-border bg-white hover:border-brand"}`}>
                  {range}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              aria-expanded={calendarOpen}
              onClick={() => {
                const next = !calendarOpen;
                closePickers();
                if (next) {
                  const base = state.startDate ? new Date(`${state.startDate}T00:00:00`) : new Date();
                  setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
                }
                setCalendarOpen(next);
              }}
              className={`group relative flex min-h-[88px] w-full items-center gap-2 rounded-2xl border bg-white px-2.5 py-3 text-left shadow-[0_2px_8px_rgba(17,17,17,0.03)] transition hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:gap-3 sm:px-4 ${calendarOpen ? "border-accent ring-2 ring-accent/10" : "border-[#dedbd2]"}`}
            >
              <FieldIcon type="date" />
              <span className="min-w-0 flex-1">
                <span className="block whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.02em] text-muted sm:text-[10px]">Date of travel</span>
                <span className="mt-1.5 block whitespace-nowrap text-[13px] font-semibold leading-none text-brand-dark">
                  {state.startDate ? formatDateField(state.startDate) : "dd-mm-yyyy"}
                </span>
              </span>
            </button>

            <SelectionButton compact icon="length" label="Travel length" value={`${state.nights}N / ${state.nights + 1}D`} open={lengthPickerOpen} onClick={() => {
              const next = !lengthPickerOpen;
              closePickers("length");
              setLengthPickerOpen(next);
            }} />
          </div>

          {calendarOpen && (
            <SafariCalendar
              month={calendarMonth}
              selectedDate={state.startDate}
              minDate={today}
              maxDate={PLANNING_HORIZON}
              flexibility={dateFlexibility}
              onFlexibilityChange={setDateFlexibility}
              onMonthChange={setCalendarMonth}
              onSelect={(date) => update({ startDate: date, recommendedStartDate: null, plan: [] })}
              onDone={() => setCalendarOpen(false)}
            />
          )}

          {lengthPickerOpen && (
            <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-border bg-white p-3 shadow-sm">
              {[1, 2, 3, 4, 5].map((nights) => (
                <button type="button" key={nights} onClick={() => {
                  update({ nights, recommendedStartDate: null, plan: [] });
                  setLengthPickerOpen(false);
                }} className={`h-11 rounded-lg border text-xs font-bold transition ${state.nights === nights ? "border-brand bg-brand text-white" : "border-border bg-white text-muted hover:border-brand"}`}>
                  {nights}N/{nights + 1}D
                </button>
              ))}
            </div>
          )}

          <SelectionButton icon="travellers" label="No. of travellers" value={`${occupancy.totalTravellers} traveller${occupancy.totalTravellers === 1 ? "" : "s"}`} open={travellerPickerOpen} onClick={() => {
            const next = !travellerPickerOpen;
            closePickers("travellers");
            setTravellerPickerOpen(next);
          }} />

          {travellerPickerOpen && (
            <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TravellerRow label="Adults" note="Age 18 and above"><Stepper value={state.numAdults} min={0} max={24} onChange={setAdults} /></TravellerRow>
                <TravellerRow label="Children" note="Age 0–17"><Stepper value={state.childAges.length} min={0} max={8} onChange={setChildCount} /></TravellerRow>
              </div>

              {requiresChildAges && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold">Age of each child</p>
                  <p className="mt-1 text-xs leading-5 text-muted">We need these ages to calculate the correct number of gypsies.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {state.childAges.map((age, index) => (
                      <label key={index} className="text-xs text-muted">Child {index + 1}
                        <input type="number" min={0} max={17} step={1} required value={age} onChange={(event) => setChildAge(index, event.target.value)} placeholder="Age" className="mt-1 w-full rounded-lg border border-border bg-[#fafafa] px-3 py-2 text-sm text-foreground outline-none focus:border-brand" />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 rounded-lg bg-accent-light px-3 py-2.5">
                <span className="text-xs leading-4 text-muted">Up to 6 adults plus 2 young children per gypsy</span>
                <span className="shrink-0 text-sm font-bold text-brand-dark">{occupancy.gypsiesRequired} {occupancy.gypsiesRequired === 1 ? "gypsy" : "gypsies"}</span>
              </div>
            </div>
          )}

          <section className="pt-2" aria-labelledby="special-fares-title">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <p id="special-fares-title" className="text-[10px] font-medium uppercase tracking-[0.03em] text-muted sm:text-[11px]">
                Special fares
              </p>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous special fares" onClick={() => specialFaresSliderRef.current?.scrollBy({ left: -190, behavior: "smooth" })} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-sm text-brand-dark">‹</button>
                <button type="button" aria-label="Next special fares" onClick={() => specialFaresSliderRef.current?.scrollBy({ left: 190, behavior: "smooth" })} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-sm text-brand-dark">›</button>
              </div>
            </div>
            <div ref={specialFaresSliderRef} className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SpecialFareCard title="Group of 4" subtitle="Flat ₹6,000 off" selected={state.specialFares.includes("group_of_4")} onClick={() => toggleSpecialFare("group_of_4")} />
              <SpecialFareCard title="Senior Citizen" subtitle="Up to ₹4,000 off" selected={state.specialFares.includes("senior")} onClick={() => toggleSpecialFare("senior")} />
              <SpecialFareCard title="Have a GST number?" subtitle="Assured GST invoice" badge="new" selected={state.specialFares.includes("gst")} onClick={() => toggleSpecialFare("gst")} />
              <SpecialFareCard title="Armed Forces" subtitle="Up to ₹600 off" selected={state.specialFares.includes("armed_forces")} onClick={() => toggleSpecialFare("armed_forces")} />
              <SpecialFareCard title="Doctor and Nurses" subtitle="Up to ₹600 off" selected={state.specialFares.includes("medical")} onClick={() => toggleSpecialFare("medical")} />
            </div>
          </section>

          {error && <p role="alert" className="rounded-lg border border-danger/20 bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

          <button type="submit" className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-sm font-bold text-black shadow-[0_12px_26px_rgba(202,156,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#e7b900] hover:shadow-[0_15px_30px_rgba(202,156,0,0.34)] focus:ring-2 focus:ring-accent focus:ring-offset-2 active:translate-y-0 sm:text-[15px]">
            Find safaris
            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </button>
        </div>
      </form>

      <section className="mx-auto mt-8 w-full max-w-3xl px-3 sm:mt-10" aria-label="Wild Excursions services">
        <div className="relative z-20 overflow-hidden rounded-[26px] border border-[#ece7d8] bg-white/95 py-5 shadow-[0_14px_36px_rgba(24,37,31,0.09)] backdrop-blur-sm">
          <div className="flex items-end justify-between gap-4 px-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a6a00]">Travel made easy</p>
              <h2 className="mt-1 text-[17px] font-bold text-brand-dark">Pay and plan your way</h2>
            </div>
            <span className="shrink-0 text-[10px] font-medium text-[#777] sm:hidden">Swipe →</span>
          </div>

          <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TravelShortcut type="payment" label="Flexible Payments" />
            <TravelShortcut type="card" label="Cards" />
            <TravelShortcut type="emi" label="EMI" />
            <TravelShortcut type="upi" label="UPI" />
            <TravelShortcut type="expert" label="Safari Expert" />
            <TravelShortcut type="verified" label="Verified Availability" />
            <TravelShortcut type="transfer" label="Pickup & Drop" />
            <TravelShortcut type="group" label="Group Planning" />
          </div>
        </div>

      </section>
      </div>
    </div>
  );
}


function TravelShortcut({ type, label }: {
  type: "payment" | "card" | "emi" | "upi" | "expert" | "verified" | "transfer" | "group";
  label: string;
}) {
  const iconSources = {
    payment: "/icons/payments.svg",
    card: "/icons/add-card.svg",
    emi: "/icons/payments.svg",
    upi: "/icons/upi-pay.svg",
    expert: "/icons/support-agent.svg",
    verified: "/icons/verified.svg",
    transfer: "/icons/local-taxi.svg",
    group: "/icons/group.svg",
  };
  return (
    <div className="w-[84px] shrink-0 snap-start text-center sm:w-[92px]">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#f0df9c] bg-[linear-gradient(145deg,#fffdf4_5%,#ffefad_100%)] shadow-[0_9px_18px_rgba(111,87,0,0.14)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(111,87,0,0.2)] sm:h-[68px] sm:w-[68px]">
        <Image src={iconSources[type]} alt="" width={30} height={30} aria-hidden="true" className="h-[30px] w-[30px]" />
      </span>
      <span className="mt-2.5 block min-h-7 text-[11px] font-semibold leading-[1.25] text-brand-dark">{label}</span>
    </div>
  );
}

function SafariCalendar({
  month,
  selectedDate,
  minDate,
  maxDate,
  flexibility,
  onMonthChange,
  onSelect,
  onFlexibilityChange,
  onDone,
}: {
  month: Date;
  selectedDate: string | null;
  minDate: string;
  maxDate: string;
  flexibility: 0 | 1 | 2 | 3;
  onMonthChange: (month: Date) => void;
  onSelect: (date: string) => void;
  onFlexibilityChange: (value: 0 | 1 | 2 | 3) => void;
  onDone: () => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonth = new Date(year, monthIndex - 1, 1);
  const nextMonth = new Date(year, monthIndex + 1, 1);
  const canGoPrevious = toCalendarISO(new Date(year, monthIndex + 1, 0)) >= minDate;
  const canGoNext = toCalendarISO(nextMonth) <= maxDate;
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1
  );

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#e3e3e3] bg-white shadow-[0_16px_36px_rgba(17,17,17,0.12)]">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoPrevious}
          onClick={() => onMonthChange(previousMonth)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f1f1] text-lg text-brand-dark transition hover:bg-[#e5e5e5] disabled:opacity-30"
        >
          ‹
        </button>
        <p className="text-sm font-bold text-brand-dark">
          {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={() => onMonthChange(nextMonth)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f1f1] text-lg text-brand-dark transition hover:bg-[#e5e5e5] disabled:opacity-30"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`} className="pb-2 text-[10px] font-semibold text-[#9a9a9a]">{day}</span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} className="h-10" />;
          const iso = toCalendarISO(new Date(year, monthIndex, day));
          const disabled = iso < minDate || iso > maxDate;
          const selected = iso === selectedDate;
          return (
            <button
              type="button"
              key={iso}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-xs transition ${selected ? "bg-[#111] font-bold text-white" : disabled ? "cursor-not-allowed text-[#d2d2d2]" : "text-[#333] hover:bg-[#f2f2f2]"}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-border px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([0, 1, 2, 3] as const).map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => onFlexibilityChange(value)}
            className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-semibold transition ${flexibility === value ? "border-brand-dark bg-brand-dark text-white" : "border-[#d8d8d8] bg-white text-brand-dark"}`}
          >
            {value === 0 ? "Exact dates" : `± ${value} ${value === 1 ? "day" : "days"}`}
          </button>
        ))}
      </div>
      {selectedDate && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-black shadow-[0_8px_18px_rgba(202,156,0,0.22)] transition hover:bg-[#e7b900]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function SpecialFareCard({ title, subtitle, badge, selected, onClick }: {
  title: string;
  subtitle: string;
  badge?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative min-h-[62px] w-[178px] shrink-0 snap-start rounded-xl border px-3 py-2.5 text-left transition ${selected ? "border-accent bg-[#fff9df] shadow-[0_4px_12px_rgba(253,203,8,0.12)]" : "border-[#d7d7d7] bg-white hover:border-brand"}`}
    >
      <span className="block whitespace-nowrap text-[12px] font-semibold leading-tight text-brand-dark">{title}</span>
      <span className={`mt-1 block whitespace-nowrap text-[10px] leading-tight ${title === "Have a GST number?" ? "text-[#3268b2]" : "text-[#008c91]"}`}>{subtitle}</span>
      {badge && (
        <span className="absolute right-2 top-2 rounded-full bg-[#e65397] px-1.5 py-0.5 text-[8px] font-bold lowercase text-white">{badge}</span>
      )}
      {selected && <span className="absolute bottom-2 right-2 text-[11px] font-bold text-success">✓</span>}
    </button>
  );
}

function SelectionButton({ icon, label, value, open, onClick, compact = false, placeholder = false }: {
  icon: "jungle" | "range" | "length" | "travellers";
  label: string;
  value: string;
  open: boolean;
  onClick: () => void;
  compact?: boolean;
  placeholder?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-expanded={open} className={`flex w-full items-center rounded-2xl border bg-white py-3 text-left shadow-[0_2px_8px_rgba(17,17,17,0.03)] transition hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:gap-3 sm:px-4 ${compact ? "min-h-[88px] gap-2 px-2.5" : "min-h-[74px] gap-3 px-3.5"} ${open ? "border-accent ring-2 ring-accent/10" : "border-[#dedbd2]"}`}>
      <FieldIcon type={icon} active={open} />
      <span className="min-w-0 flex-1">
        <span className="block whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.02em] text-muted sm:text-[10px]">{label}</span>
        <span className={`mt-1.5 block truncate text-[13px] font-semibold leading-none ${placeholder ? "text-muted" : "text-brand-dark"}`}>{value}</span>
      </span>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={`h-4 w-4 shrink-0 text-muted transition-transform ${compact ? "hidden sm:block" : ""} ${open ? "rotate-180" : ""}`}>
        <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function FieldIcon({ type, active = false }: { type: "jungle" | "range" | "date" | "length" | "travellers"; active?: boolean }) {
  const paths = {
    jungle: <><path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></>,
    range: <><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" /></>,
    date: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    length: <><path d="M4 7h16M7 4 4 7l3 3M20 17H4M17 14l3 3-3 3" /></>,
    travellers: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M17 9a3 3 0 0 1 0 6M17.5 16.5A5 5 0 0 1 21 20" /></>,
  };
  return (
    <span className={`flex h-10 w-7 shrink-0 items-center justify-center bg-transparent transition-colors ${active ? "text-[#236d61]" : "text-brand-dark"}`}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[27px] w-[27px] stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>
    </span>
  );
}

function TravellerRow({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-[#fafafa] p-3">
      <div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted">{note}</p></div>
      {children}
    </div>
  );
}

function formatShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDateField(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
}

function toCalendarISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-lg font-semibold transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-35">−</button>
      <span className="w-5 text-center text-sm font-bold">{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-lg font-semibold transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-35">+</button>
    </div>
  );
}
