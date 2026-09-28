import type { RecommendedSafari } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ZonePlanCard({
  safari,
  isSelected = false,
  onToggle,
}: {
  safari: RecommendedSafari;
  isSelected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={`flex flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-center ${isSelected ? "border-accent bg-[#fff8dc] shadow-[0_6px_18px_rgba(253,203,8,0.13)]" : "border-[#e1e7e5] bg-[#fbfcfb] hover:border-[#9ebbb3]"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm ${isSelected ? "bg-accent text-black" : "bg-[#18212f] text-white"}`}>
        {safari.safariNumber}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-display text-lg font-bold text-brand-dark">{safari.zone.name}</h4>
          <span className="rounded-full bg-[#eef3f1] px-2 py-0.5 text-[10px] font-semibold capitalize text-[#45615a]">
            {safari.zone.type}
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand ring-1 ring-[#dfe7e4]">
            {safari.gypsiesRequired} {safari.gypsiesRequired === 1 ? "gypsy" : "gypsies"}
          </span>
          {safari.isFillIn && (
            <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-muted">
              fill-in
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {formatDate(safari.date)} · {safari.session === "morning" ? "Morning" : "Afternoon"} safari
        </p>
        <p className="mt-1 text-xs font-medium text-brand">{safari.reason}</p>
      </div>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className={`w-full shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition active:scale-95 sm:w-auto ${
            isSelected
              ? "bg-[#18212f] text-white"
              : "border border-[#18212f] bg-white text-[#18212f] hover:bg-[#18212f] hover:text-white"
          }`}
        >
          {isSelected ? "Added ✓" : "Add to cart"}
        </button>
      )}
    </div>
  );
}
