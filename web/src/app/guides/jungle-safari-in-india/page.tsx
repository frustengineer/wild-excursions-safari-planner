import Link from "next/link";

export const metadata = {
  title: "Jungle Safari in India — Wild Excursions",
  description:
    "What to expect from a jungle safari in India — the parks, the sessions, the permits, and how to plan one well.",
};

export default function JungleSafariGuide() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-brand hover:underline">
        ← Back to home
      </Link>

      <p className="section-kicker mt-6">Guide</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-brand-dark sm:text-4xl">
        Jungle Safari in India
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
        India is home to some of the finest jungle safaris in the world. Its
        national parks and tiger reserves span dense sal and teak forests,
        open grasslands and winding riverbeds, each with its own rhythm of
        wildlife — tigers, leopards, sloth bears, elephants and hundreds of
        bird species.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-7 text-muted sm:text-base">
        <section>
          <h2 className="font-display text-xl font-bold text-brand-dark">Where the safaris happen</h2>
          <p className="mt-2">
            Central India — Madhya Pradesh and Maharashtra in particular —
            holds some of the country&apos;s best-known reserves: Tadoba-Andhari,
            Pench, Kanha and Bandhavgarh among them. Each reserve is split
            into buffer and core zones, and further into ranges and gates,
            with its own character. Some are known for bamboo forests and
            high tiger density, others for open meadows better suited to
            sighting herds of deer or a hunting leopard. Beyond Central
            India, Ranthambore in Rajasthan, Kaziranga in Assam and Jim
            Corbett in Uttarakhand each bring a very different landscape and
            set of species to look out for.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-dark">How a safari session works</h2>
          <p className="mt-2">
            A typical safari runs in an open-top gypsy across two sessions a
            day — morning and evening — timed around when animals are most
            active near waterholes and forest trails. Morning safaris
            usually report before sunrise and run for three to four hours;
            evening safaris report in the afternoon and run until just
            before the gate closes for the day. Each gypsy is assigned a
            specific zone and a guide, and the group inside it stays together
            for the full session.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-dark">Permits, gates and vehicle limits</h2>
          <p className="mt-2">
            Every reserve is managed by its state forest department, which
            sets its own permits, gate timings and the number of vehicles
            allowed into each zone per session. Popular zones and weekend
            dates fill up well in advance, and availability shifts day to
            day as the department opens or closes slots. This is also why
            gypsy counts, not just seats, matter — a group&apos;s size decides how
            many vehicles it needs, and a zone can look &quot;available&quot;
            while not actually having enough vehicles free for a larger
            group.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-brand-dark">Planning it well</h2>
          <p className="mt-2">
            Because rules, rankings and availability vary so much by reserve,
            range and even by week, planning ahead with someone who knows the
            zones well makes all the difference between a rushed drive and a
            considered, well-timed plan. That&apos;s the gap Wild Excursions fills
            — we track live vehicle availability, match it against our own
            on-ground zone rankings, and build a plan around your dates
            before you commit to anything.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <Link
          href="/book/step-1"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black shadow-[0_8px_20px_rgba(253,203,8,0.24)] transition hover:bg-[#a97e00]"
        >
          Plan my safari <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
