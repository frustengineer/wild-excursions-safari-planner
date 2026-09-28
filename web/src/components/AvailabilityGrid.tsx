import { rankZonesForRange } from "@/lib/engine";
import { tripSlots } from "@/lib/mockData";
import type { AvailabilitySnapshot, RecommendedSafari, Zone, ZoneType } from "@/lib/types";

const SESSIONS: Array<"morning" | "afternoon"> = ["morning", "afternoon"];

// The real portal caps a gate at 6 open gypsies per session — confirmed
// across every live scrape this session (never seen a count above 6).
// Used as the shown count for provisional (beyond-real-coverage) slots,
// since there's no real count to report yet for those.
const MAX_GYPSIES = 6;

export type AvailabilitySelection = {
  zone: Zone;
  date: string;
  session: "morning" | "afternoon";
  rank: number;
  isDemandBased: boolean;
  isProvisional: boolean;
};

export function AvailabilityGrid({
  range,
  zoneType,
  dates,
  plan,
  availability,
  maxScrapedDate = null,
  gypsiesRequired = 1,
  onToggleSelection,
}: {
  range: string;
  zoneType: ZoneType;
  dates: string[];
  plan: RecommendedSafari[];
  availability: AvailabilitySnapshot[];
  /** Real max(safari_date) — dates past this display as Available too
   * (customer-facing UI doesn't distinguish them; see RecommendedSafari.
   * isProvisional for where that distinction is kept, internally only,
   * for the team's own enquiry handling). Pass null to leave dates
   * beyond real data as "—" instead. */
  maxScrapedDate?: string | null;
  gypsiesRequired?: number;
  onToggleSelection?: (selection: AvailabilitySelection) => void;
}) {
  const zonesInRange = rankZonesForRange(range, zoneType, availability);
  const validSlots = new Set(tripSlots(dates).map((s) => `${s.date}|${s.session}`));

  const statusFor = (zoneId: string, date: string, session: string) =>
    availability.find((a) => a.zoneId === zoneId && a.date === date && a.session === session);

  const isPicked = (zoneId: string, date: string, session: string) =>
    plan.some((p) => p.zone.id === zoneId && p.date === date && p.session === session);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dfe7e4] bg-white shadow-[0_6px_18px_rgba(27,72,78,0.07)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-[#f1f5f3]">
              <th className="sticky left-0 z-10 bg-[#f1f5f3] px-3 py-3 text-left text-xs font-semibold text-[#45615a]">
                Zone (priority order)
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  colSpan={SESSIONS.length}
                  className="border-l border-border px-2 py-2.5 text-center text-xs font-semibold text-foreground"
                >
                  {formatShort(date)}
                </th>
              ))}
            </tr>
            <tr className="bg-[#f1f5f3]">
              <th className="sticky left-0 z-10 bg-[#f1f5f3] px-3 py-1.5"></th>
              {dates.map((date) =>
                SESSIONS.map((s) => (
                  <th
                    key={date + s}
                    className="border-l border-t border-border px-2 py-1.5 text-center text-[11px] font-medium text-muted"
                  >
                    {s === "morning" ? "Morning" : "Evening"}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {zonesInRange.map(({ zone, rank, isDemandBased }) => (
              <tr key={zone.id} className="border-t border-border">
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                        isDemandBased
                          ? "border-[1.5px] border-accent text-accent"
                          : "bg-accent text-brand-dark"
                      }`}
                      title={isDemandBased ? "Ranked by current demand — not yet reviewed by our team" : undefined}
                    >
                      {rank}
                    </span>
                    {zone.name}
                  </span>
                </td>
                {dates.map((date) =>
                  SESSIONS.map((s) => {
                    const isTripSlot = validSlots.has(`${date}|${s}`);
                    const snap = statusFor(zone.id, date, s);
                    const picked = isPicked(zone.id, date, s);
                    const beyondCoverage = !snap && !!maxScrapedDate && date > maxScrapedDate;
                    const portalAvailable = snap?.status === "available" || beyondCoverage;
                    const noInfo = !snap && !beyondCoverage;
                    const gypsyCount = beyondCoverage ? MAX_GYPSIES : snap?.availableCount ?? MAX_GYPSIES;
                    const hasEnoughGypsies = portalAvailable && gypsyCount >= gypsiesRequired;
                    const insufficient = portalAvailable && !hasEnoughGypsies;
                    const unavailableLabel =
                      snap?.status === "NA"
                        ? "Not listed"
                        : snap?.status === "gate-closed"
                        ? "Gate closed"
                        : snap?.status === "window-closed"
                        ? "Window closed"
                        : snap?.status === "waitlist"
                        ? "Waitlist"
                        : "Sold out";
                    const label = noInfo
                      ? "—"
                      : hasEnoughGypsies
                      ? String(gypsyCount)
                      : insufficient
                      ? `${gypsyCount} left · need ${gypsiesRequired}`
                      : unavailableLabel;
                    const availabilityTitle = noInfo
                      ? "Availability has not been checked for this slot"
                      : portalAvailable
                      ? `${gypsyCount} ${gypsyCount === 1 ? "gypsy" : "gypsies"} open; your group needs ${gypsiesRequired}`
                      : snap?.status === "NA"
                      ? "The government regular-booking feed does not list this gate for this slot"
                      : "No gypsies are open for this slot";
                    return (
                      <td
                        key={date + s}
                        className={`border-l border-border p-1 text-center align-middle ${
                            picked ? "bg-[#fff3be]" : !isTripSlot ? "bg-[#fafafa]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          disabled={
                            !onToggleSelection ||
                            (!picked && (!isTripSlot || noInfo || !hasEnoughGypsies))
                          }
                          onClick={() =>
                            onToggleSelection?.({
                              zone,
                              date,
                              session: s,
                              rank,
                              isDemandBased,
                              isProvisional: beyondCoverage,
                            })
                          }
                          title={
                            !isTripSlot
                              ? date === dates[0]
                                ? "Arrival day — this safari isn't part of your itinerary (you're still travelling in)"
                                : "Departure day — this safari isn't part of your itinerary (you're checking out)"
                              : availabilityTitle
                          }
                        className={`mx-auto flex min-h-8 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold transition enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-[#236d61]/25 disabled:cursor-default ${
                            !isTripSlot
                              ? "opacity-50"
                              : ""
                          } ${
                            noInfo
                              ? "text-muted"
                              : hasEnoughGypsies
                              ? "bg-success/15 text-success"
                              : insufficient
                              ? "bg-warning/10 text-warning"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {!noInfo && (
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                hasEnoughGypsies
                                  ? "bg-success"
                                  : insufficient
                                  ? "bg-warning"
                                  : "bg-danger"
                              }`}
                            />
                          )}
                          {label}
                        </button>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
