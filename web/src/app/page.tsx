import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { JungleCard } from "@/components/JungleCard";
import { getJungles } from "@/lib/jungles";
import type { Jungle } from "@/lib/types";

// The homepage highlights a curated handful; Step 1 uses the full database list.
const POPULAR_JUNGLE_SLUGS = ["tadoba", "pench", "bandhavgarh"];

const FEATURED = [
  {
    eyebrow: "Tadoba · Private gypsy",
    title: "Morning safari — Kolara range",
    detail: "Live vehicle availability · Expert-picked gates",
    price: "From ₹4,500",
  },
  {
    eyebrow: "Pench · Full vehicle",
    title: "Core & buffer safari plan",
    detail: "Morning and evening sessions · Live-checked",
    price: "From ₹5,200",
  },
];

type MobilePark = {
  slug: string;
  name: string;
  href: string;
  image: string;
};

type MobileParkSource =
  | { slug: string; href?: string }
  | MobilePark;

const MOBILE_PARK_SOURCES: MobileParkSource[] = [
  { slug: "tadoba" },
  { slug: "pench" },
  { slug: "kanha", href: "https://wildexcursions.in/tours/kanha/" },
  { slug: "bandhavgarh" },
  {
    slug: "ranthambore",
    name: "Ranthambore",
    href: "https://wildexcursions.in/tours/ranthambore/",
    image: "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  { slug: "panna", href: "https://wildexcursions.in/tours/panna/" },
  { slug: "satpura", href: "https://wildexcursions.in/tours/satpura/" },
  {
    slug: "jim-corbett",
    name: "Jim Corbett",
    href: "https://wildexcursions.in/tours/jim-corbett/",
    image: "https://images.pexels.com/photos/66898/elephant-cub-tsavo-kenya-66898.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    slug: "gir",
    name: "Gir",
    href: "https://wildexcursions.in/tours/gir/",
    image: "https://images.pexels.com/photos/247502/pexels-photo-247502.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    slug: "kaziranga",
    name: "Kaziranga",
    href: "https://wildexcursions.in/tours/kaziranga/",
    image: "https://images.pexels.com/photos/677974/pexels-photo-677974.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  { slug: "tipeshwar", href: "https://wildexcursions.in/tours/tipeshwar/" },
  { slug: "nagzira", href: "https://wildexcursions.in/tours/nagzira/" },
  { slug: "umred-karhandla", href: "https://wildexcursions.in/tours/umred-karhandla/" },
];

function getMobileParks(jungles: Jungle[]): MobilePark[] {
  return MOBILE_PARK_SOURCES.flatMap((source) => {
    if ("name" in source) return [source];

    const jungle = jungles.find((item) => item.slug === source.slug);
    if (!jungle) return [];

    return [
      {
        slug: jungle.slug,
        name: jungle.name,
        image: jungle.image,
        href: source.href ?? `/jungles/${jungle.slug}`,
      },
    ];
  });
}

export default async function Home() {
  await connection();
  const jungles = await getJungles();
  const popularJungles = POPULAR_JUNGLE_SLUGS.map((slug) =>
    jungles.find((jungle) => jungle.slug === slug)
  ).filter((jungle): jungle is Jungle => jungle !== undefined);
  const mobileParks = getMobileParks(jungles);

  return (
    <>
      <div className="sm:hidden">
        <MobileHome parks={mobileParks} />
      </div>
      <div className="hidden sm:block">
        <DesktopHome popularJungles={popularJungles} />
      </div>
    </>
  );
}

function DesktopHome({ popularJungles }: { popularJungles: Jungle[] }) {
  return (
    <div>
      <section className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.02fr_.98fr] lg:py-16">
          <div className="max-w-xl">
            <p className="section-kicker">Thoughtful jungle travel</p>
            <h1 className="font-display mt-4 text-4xl font-bold leading-[1.04] text-brand-dark sm:text-6xl">
              Book your jungle safari in 3 easy steps
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-muted sm:text-base">
              Tell us where and when. We match your group to the right number of gypsies, find the strongest live slots and build a plan you can review before you enquire.
            </p>
            <Link
              href="/book/step-1"
              className="mt-7 inline-flex items-center gap-3 rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-black shadow-[0_8px_22px_rgba(253,203,8,0.26)] transition hover:-translate-y-0.5 hover:bg-[#a97e00]"
            >
              Plan My Safari <span aria-hidden="true">→</span>
            </Link>
            <div className="mt-8 grid max-w-lg grid-cols-3 rounded-xl border border-border bg-white/70 p-4">
              <JourneyStep number="1" label="Trip Basics" active />
              <JourneyStep number="2" label="Build Safari" />
              <JourneyStep number="3" label="Cart & Enquire" />
            </div>
          </div>

          <div className="forest-pattern relative min-h-[330px] overflow-hidden rounded-[24px] shadow-[0_22px_55px_rgba(0,0,0,0.22)] sm:min-h-[420px]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(0,0,0,.82)_100%)]" />
            <Image
              src="/logo.webp"
              alt="Wild Excursions safari emblem"
              width={340}
              height={340}
              priority
              className="absolute right-[-35px] top-[-28px] h-[300px] w-[300px] rounded-full object-cover opacity-25 mix-blend-screen sm:h-[390px] sm:w-[390px]"
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-white/70">Wild Excursions</p>
              <p className="font-display mt-2 max-w-sm text-3xl font-bold leading-tight sm:text-4xl">
                The right gate. The right session. One considered plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Start exploring</p>
            <h2 className="font-display mt-2 text-3xl font-bold text-brand-dark">Popular national parks</h2>
          </div>
          <p className="max-w-md text-sm text-muted">Choose a jungle to see its ranges, zones, live availability and the safaris best suited to your dates.</p>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {popularJungles.map((jungle) => (
            <JungleCard key={jungle.slug} jungle={jungle} />
          ))}
        </div>
        <div className="mt-7">
          <InfoArticle />
        </div>
      </section>

      <section className="border-y border-border bg-white py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:grid-cols-3 sm:px-6">
          <Feature icon="✓" title="Verified gypsy availability" body="Vehicle counts are checked from official booking sources." />
          <Feature icon="◇" title="Ranked by real experience" body="Zone order combines seasonal knowledge with current demand." />
          <Feature icon="◌" title="Human trip support" body="Our team reconfirms and completes every safari booking." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="section-kicker">Easy starting points</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-brand-dark">Featured safari plans</h2>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {FEATURED.map((item, index) => (
            <article key={item.title} className="soft-card group grid overflow-hidden sm:grid-cols-[180px_1fr]">
              <div className={`min-h-44 ${index === 0 ? "forest-pattern" : "bg-[linear-gradient(145deg,#3a3a3a,#050505)]"}`}>
                <div className="flex h-full items-end p-4 text-xs font-semibold uppercase tracking-wider text-white/80">Recommended</div>
              </div>
              <div className="flex flex-col p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{item.eyebrow}</p>
                <h3 className="font-display mt-2 text-xl font-bold text-brand-dark">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted">{item.detail}</p>
                <div className="mt-auto flex items-end justify-between pt-5">
                  <span className="text-sm font-semibold">{item.price}</span>
                  <Link href="/book/step-1" className="text-sm font-semibold text-brand group-hover:underline">Explore →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}


function MobileHome({ parks }: { parks: MobilePark[] }) {
  const heroImage = parks.find((park) => park.slug === "bandhavgarh")?.image ?? "/logo.webp";
  const featuredImages = ["kanha", "pench"].map(
    (slug) => parks.find((park) => park.slug === slug)?.image ?? heroImage
  );

  return (
    <div className="overflow-x-hidden bg-white">
      <section className="px-5 pt-6">
        <div
          className="relative min-h-[380px] overflow-hidden rounded-[20px] bg-cover bg-center shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
          style={{
            backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.04) 20%,rgba(0,0,0,.12) 48%,rgba(0,0,0,.88) 100%),url('${heroImage}')`,
          }}
        >
          <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-20">
            <h1 className="font-display max-w-[320px] text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.45)]">
              Book your jungle safari in 3 easy steps
            </h1>
            <Link
              href="/book/step-1"
              className="relative mt-5 flex min-h-[54px] w-full items-center justify-center rounded-full bg-accent px-14 text-sm font-bold text-black shadow-[0_10px_24px_rgba(0,0,0,.35)] transition active:scale-[.99]"
            >
              <span>Plan My Safari</span>
              <span aria-hidden="true" className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black text-[#fdcb08]">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 rounded-[16px] border border-[#ececec] bg-[#f7f7f7] px-3 py-3.5">
          <JourneyStep number="1" label="Trip Basics" active />
          <JourneyStep number="2" label="Build Safari" />
          <JourneyStep number="3" label="Cart & Enquire" />
        </div>
      </section>

      <section className="pt-6">
        <h2 className="font-display px-5 text-[22px] font-bold leading-tight text-black">Popular National Parks</h2>
        <div className="mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
          {parks.map((park) => (
            <Link
              key={park.name}
              href={park.href}
              target={park.href.startsWith("http") ? "_blank" : undefined}
              rel={park.href.startsWith("http") ? "noreferrer" : undefined}
              className="w-[132px] shrink-0 snap-start"
            >
              <div
                className="h-24 rounded-[14px] bg-black bg-cover bg-center shadow-sm"
                style={{ backgroundImage: `linear-gradient(180deg,transparent 55%,rgba(0,0,0,.2)),url('${park.image}')` }}
              />
              <p className="mt-2 text-xs font-semibold text-black">{park.name}</p>
            </Link>
          ))}
        </div>
        <div className="mt-4 px-5">
          <InfoArticle />
        </div>
      </section>

      <section className="mt-5 border-y border-[#ececec] bg-white px-3 py-5">
        <div className="grid grid-cols-3">
          <MobileTrust icon="shield" label="Verified Gypsy Permits" />
          <MobileTrust icon="clock" label="Best Price Guarantee" />
          <MobileTrust icon="chat" label="24×7 Trip Support" />
        </div>
      </section>

      <section className="px-5 py-7">
        <h2 className="font-display text-[22px] font-bold text-black">Featured Safari Packages</h2>
        <div className="mt-3 flex snap-x gap-4 overflow-x-auto pb-3">
          {FEATURED.map((item, index) => (
            <article key={item.title} className="w-[315px] shrink-0 snap-start overflow-hidden rounded-[17px] border border-border bg-white shadow-sm">
              <div
                className="h-36 bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(180deg,transparent 50%,rgba(0,0,0,.64)),url('${
                    featuredImages[index]
                  }')`,
                }}
              />
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">{item.eyebrow}</p>
                <h3 className="font-display mt-1.5 text-lg font-bold text-brand-dark">{item.title}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold">{item.price}</span>
                  <Link href="/book/step-1" className="text-xs font-semibold text-brand">Explore →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}

function MobileTrust({ icon, label }: { icon: "shield" | "clock" | "chat"; label: string }) {
  return (
    <div className="flex flex-col items-center justify-start px-2 py-1 text-center text-black">
      {icon === "shield" && <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M12 3 5.5 5.6v5.7c0 4.2 2.5 7.7 6.5 9.7 4-2 6.5-5.5 6.5-9.7V5.6L12 3Z" stroke="currentColor" strokeWidth="1.8"/><path d="m9.4 11.8 1.7 1.7 3.7-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {icon === "clock" && <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
      {icon === "chat" && <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M5 5.5h14v10H9l-4 3v-13Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
      <span className="mt-2 max-w-[82px] text-[11px] font-medium leading-[1.4] text-[#555555]">{label}</span>
    </div>
  );
}

function JourneyStep({ number, label, active = false }: { number: string; label: string; active?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
          active ? "bg-[#fdcb08] text-black" : "bg-[#e3e3e3] text-[#555555]"
        }`}
      >
        {number}
      </span>
      <span className="text-[10px] font-medium leading-tight text-[#555555]">{label}</span>
    </div>
  );
}

function InfoArticle() {
  return (
    <article className="rounded-2xl bg-[#f4f3f1] p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold text-black sm:text-xl">Jungle Safari in India</h3>
      <p className="mt-2 text-sm leading-6 text-[#6b5b4a]">
        India is home to some of the finest jungle safaris in the world. Its
        national parks and tiger reserves span dense sal and teak forests,
        open grasslands and winding riverbeds, each with its own rhythm of
        wildlife — tigers, leopards, sloth bears, elephants and hundreds of
        bird species. A typical safari runs in an open-top gypsy across two
        sessions a day, morning and evening, when animals are most active
        near waterholes and forest trails. Every reserve is managed by the
        state forest department, with its own permits, gate timings and
        vehicle limits, which is why planning ahead with someone who knows
        the zones well makes all the difference between a rushed drive and a
        considered, well-timed plan,…
      </p>
      <div className="mt-3 text-right">
        <Link href="/guides/jungle-safari-in-india" className="text-sm font-semibold text-[#2f6b76] hover:underline">
          Read More
        </Link>
      </div>
    </article>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-brand">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold text-brand-dark">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted">{body}</p>
      </div>
    </div>
  );
}
