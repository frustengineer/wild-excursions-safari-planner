import Link from "next/link";
import type { Jungle } from "@/lib/types";

export function JungleCard({ jungle }: { jungle: Jungle }) {
  const content = (
    <div className="group flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-surface shadow-[0_4px_18px_rgba(0,0,0,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.14)]">
      <div
        className="relative flex h-40 items-end overflow-hidden bg-cover bg-center p-5 text-white"
        style={{ backgroundImage: `linear-gradient(180deg, transparent 15%, rgba(0, 0, 0, .8)), url("${jungle.image}")` }}
      >
        <div>
          <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[28px] border-white/5" />
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/70">
            {jungle.ranges.length} {jungle.ranges.length === 1 ? "range" : "ranges"}
          </p>
          <h3 className="font-display mt-1 text-2xl font-bold">{jungle.name}</h3>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs font-semibold text-brand">{jungle.tagline}</p>
        <p className="line-clamp-2 text-xs leading-5 text-muted">{jungle.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          {jungle.comingSoon ? (
            <span className="rounded-md bg-[#f7ecd0] px-3 py-1.5 text-xs font-semibold text-black">
              Coming soon
            </span>
          ) : (
            <span className="text-sm font-semibold text-brand group-hover:underline">
              Explore jungle →
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (jungle.comingSoon) {
    return <div className="h-full opacity-90">{content}</div>;
  }
  return (
    <Link href={`/jungles/${jungle.slug}`} className="block h-full">
      {content}
    </Link>
  );
}
