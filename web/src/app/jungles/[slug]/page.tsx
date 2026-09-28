import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getJungleBySlug } from "@/lib/jungles";
import { RANKING, ZONES } from "@/lib/mockData";

export default async function JungleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const jungle = await getJungleBySlug(slug);
  if (!jungle) notFound();

  const zonesByRange = jungle.comingSoon
    ? {}
    : jungle.ranges.reduce<Record<string, typeof ZONES>>((acc, range) => {
        acc[range] = ZONES.filter(
          (zone) => zone.jungleSlug === jungle.slug && zone.range === range
        );
        return acc;
      }, {});

  return (
    <div>
      <section
        className="relative overflow-hidden bg-cover bg-center px-4 py-14 text-white sm:px-6 sm:py-18"
        style={{ backgroundImage: `url("${jungle.image}")` }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.18),rgba(0,0,0,.86))]" />
        <div className="relative mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/70">
            {jungle.tagline}
          </p>
          <h1 className="font-display mt-3 text-4xl font-bold sm:text-5xl">{jungle.name}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80">{jungle.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <p className="section-kicker">Plan by gate</p>
            <h2 className="font-display mt-2 text-2xl font-bold text-brand-dark">Ranges & zones</h2>
            {jungle.comingSoon ? (
              <p className="mt-2 text-muted">
                We&apos;re finalising zone rankings for {jungle.name} this
                cycle — check back soon, or enquire and our team will help
                you plan manually.
              </p>
            ) : (
              <div className="mt-4 space-y-6">
                {jungle.ranges.map((range) => {
                  const zonesWithRank = (zonesByRange[range] ?? []).map((zone) => ({
                    zone,
                    rank: RANKING.find((r) => r.zoneId === zone.id)?.priorityRank ?? null,
                  }));
                  const isRanked = zonesWithRank.some((z) => z.rank !== null);
                  zonesWithRank.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
                  return (
                    <div key={range} className="soft-card p-4 sm:p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-lg font-bold text-brand-dark">{range} range</h3>
                        {!isRanked && zonesWithRank.length > 0 && (
                          <span className="rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-medium text-warning">
                            Ranked live by demand
                          </span>
                        )}
                      </div>
                      {zonesWithRank.length ? (
                        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {zonesWithRank.map(({ zone, rank }) => (
                            <li
                              key={zone.id}
                              className="flex items-center gap-2 rounded-lg border border-border bg-[#faf9f4] px-3 py-2 text-sm"
                            >
                              {rank !== null && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                                  {rank}
                                </span>
                              )}
                              {zone.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted">
                          Zone data for this range is coming soon.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="soft-card p-4">
              <h3 className="font-display text-lg font-bold text-brand-dark">What you can spot</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {jungle.animals.map((a) => (
                  <li
                    key={a}
                    className="rounded-full bg-accent-light px-3 py-1 text-xs font-medium text-brand"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="soft-card p-4">
              <h3 className="font-display text-lg font-bold text-brand-dark">Best season</h3>
              <p className="mt-1 text-sm text-muted">{jungle.bestSeason}</p>
            </div>
            <Link
              href={`/book/step-1?jungle=${jungle.slug}`}
              className="block rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-black shadow-[0_8px_20px_rgba(253,203,8,0.24)] transition hover:bg-[#a97e00]"
            >
              Plan my {jungle.name} safari
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
