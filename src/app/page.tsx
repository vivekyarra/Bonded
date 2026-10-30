import { ArrowRight, CalendarCheck2, HeartPulse, MessageCircleHeart, Scale, Siren, Sparkles, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/AppChrome";
import { CountUp, Marquee, Reveal, ScrollLine } from "@/components/motion";
import { BridgeChip, DomainIcon } from "@/components/ui";
import { getAgency } from "@/lib/agency/sunrise";
import { kindToDomain } from "@/lib/qloo/types";
import { pairScore } from "@/lib/service/engine";

/** The hero card is computed live from Qloo (bundled cache), never hard-coded. */
async function heroPair() {
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), 4000));
  try {
    const s = await Promise.race([pairScore("c01", "cg02"), timeout]);
    return s ? { score: s.tasteScore, bridges: s.bridges.filter((b) => !b.weaker).slice(0, 3) } : null;
  } catch {
    return null;
  }
}

/** Favourites people actually gave at intake (Sunrise Home Care's inputs, not Qloo output). */
function favourites(people: { seeds: { name: string; kind: Parameters<typeof kindToDomain>[0] }[] }[], n: number) {
  const seen = new Map<string, string>();
  for (const p of people) for (const s of p.seeds) if (!seen.has(s.name)) seen.set(s.name, kindToDomain(s.kind) ?? "music");
  return [...seen.entries()].slice(0, n);
}

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Sparkles, title: "Matched on what people love", body: "A few favourites become a shared taste profile, powered by Qloo." },
  { icon: Siren, title: "Call-outs, handled", body: "When someone can't make it, Bonded finds a substitute who'll get along." },
  { icon: HeartPulse, title: "An early warning", body: "Spots a relationship going quiet before the family cancels." },
  { icon: Scale, title: "Fair by design", body: "Never uses race, religion or origin. Offers are checked for balance." },
];

const STEPS = [
  { icon: UserRoundCheck, title: "A two-minute intake", body: "Clients, or their family, and caregivers each name a few favourite singers, shows, films or places." },
  { icon: Sparkles, title: "Qloo finds the common ground", body: "Even across sixty years, it finds the music, shows and places both people enjoy." },
  { icon: CalendarCheck2, title: "Bonded suggests, you decide", body: "Care needs and schedules come first. Shared taste then ranks who fits best. Nothing happens without your approval." },
  { icon: MessageCircleHeart, title: "A warm first visit", body: "The caregiver arrives with things to talk about, songs to play and something to do together." },
];

function Person({ initials, name, age, likes, tint }: { initials: string; name: string; age: number; likes: string; tint: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <span className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white shadow-lg ${tint}`}>{initials}</span>
      <p className="mt-2.5 text-[17px] font-semibold">
        {name}, {age}
      </p>
      <p className="truncate text-sm text-muted">{likes}</p>
    </div>
  );
}

function Fav({ name, domain, tone }: { name: string; domain: string; tone: "navy" | "gold" }) {
  return (
    <span className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[15px] font-medium shadow-sm ${tone === "navy" ? "border-teal/10 bg-surface text-ink" : "border-coral/25 bg-coralsoft/70 text-coralink"}`}>
      <DomainIcon domain={domain} size={24} />
      {name}
    </span>
  );
}

export default async function Landing() {
  const hero = await heroPair();
  const agency = getAgency();
  const clientFavs = favourites(agency.clients, 26);
  const caregiverFavs = favourites(agency.caregivers, 26);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <header className="glass mt-4 flex items-center justify-between rounded-full px-4 py-2.5 sm:mt-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/try" className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-muted transition hover:text-ink sm:block">
              Try it yourself
            </Link>
            <Link href="/board" className="btn-primary px-5">
              Open the app
            </Link>
          </nav>
        </header>

        <section className="grid items-center gap-12 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
          <div className="animate-rise">
            <span className="glass-strong inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" /> For home care agencies
            </span>
            <h1 className="mt-6 text-[60px] leading-[0.98] tracking-[-0.02em] sm:text-[88px]">
              Care that <em className="gradient-text pr-2">clicks.</em>
            </h1>
            <p className="mt-6 max-w-lg text-xl leading-relaxed text-muted">
              Every agency says its caregivers are <em>bonded</em>. We make it true, by matching people on what they love.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/board?auto=1" className="btn-primary px-7 py-4 text-[17px]">
                See it in action <ArrowRight size={18} />
              </Link>
              <Link href="/try" className="btn-ghost px-7 py-4 text-[17px]">
                <Sparkles size={17} /> Find your own match
              </Link>
            </div>
            <dl className="mt-12 flex gap-10">
              {[
                [40, "caregivers"],
                [60, "clients"],
                [2400, "pairs compared"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-display text-3xl font-bold">
                    <CountUp to={Number(n)} />
                  </dt>
                  <dd className="mt-0.5 text-[15px] text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative animate-rise [animation-delay:150ms]">
            <div className="glass relative p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="label">Tomorrow · 9am to 1pm</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-bad/10 px-3 py-1 text-[13px] font-semibold text-bad">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bad" /> Rosa can't make it
                </span>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <Person initials="DA" name="Dolores" age={84} likes="Pedro Infante" tint="from-[#1b2a5e] to-[#3b4f96]" />
                <div className="relative h-[3px] flex-1 rounded-full">
                  <div className="bridge-line absolute inset-0 rounded-full" />
                  <span className="glass-strong absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-display text-lg font-bold shadow-lift">
                    {hero ? hero.score : "?"}
                  </span>
                </div>
                <Person initials="MG" name="Maria" age={23} likes="Bad Bunny" tint="from-[#8c6a35] to-[#c3a06a]" />
              </div>
              <p className="mt-8 text-center text-sm font-medium text-muted">What they both enjoy</p>
              <div className="mt-2.5 flex min-h-[32px] flex-wrap justify-center gap-2">
                {hero?.bridges.map((b, i) => (
                  <span key={b.entityId} className="animate-float" style={{ animationDelay: `${i * 0.7}s` }}>
                    <BridgeChip name={b.name} domain={b.domain} />
                  </span>
                ))}
              </div>
              <p className="mt-5 text-center text-[13px] text-muted">{hero ? "Found by Qloo across a 61-year age gap" : "Open the app to find their common ground"}</p>
            </div>
            <div className="glass absolute -bottom-7 -left-4 hidden animate-float items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium sm:flex [animation-delay:1s]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-good text-white">✓</span>
              Maria accepted · she knows what to talk about
            </div>
          </div>
        </section>
      </div>

      {/* Two generations, moving past each other. */}
      <section aria-label="What people love" className="space-y-4 border-y border-ink/[0.06] bg-surface/40 py-10">
        <Reveal className="mx-auto mb-2 max-w-6xl px-5 sm:px-8">
          <p className="font-serif text-3xl sm:text-4xl">Two generations. One shared playlist.</p>
          <p className="mt-2 text-[17px] text-muted">Favourites from Sunrise Home Care's intake, clients above and caregivers below.</p>
        </Reveal>
        <div className="flex items-center gap-4">
          <span className="hidden w-40 shrink-0 pl-8 text-right text-sm font-semibold text-muted lg:block">Clients, 68–97</span>
          <Marquee label="Clients' favourites" speed={70} items={clientFavs.map(([n, d]) => <Fav key={n} name={n} domain={d} tone="navy" />)} />
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden w-40 shrink-0 pl-8 text-right text-sm font-semibold text-coralink lg:block">Caregivers, 19–58</span>
          <Marquee label="Caregivers' favourites" speed={64} reverse items={caregiverFavs.map(([n, d]) => <Fav key={n} name={n} domain={d} tone="gold" />)} />
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <section className="grid gap-12 py-20 md:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="label">How it works</p>
            <h2 className="mt-3 font-serif text-4xl font-normal tracking-normal sm:text-5xl">From a few favourites to a friendly face at the door.</h2>
            <p className="mt-4 text-[17px] text-muted">Built for agency schedulers. Everything is explained in plain words, and nothing is sent without your approval.</p>
          </Reveal>
          <ol className="relative space-y-10 pl-14">
            <ScrollLine className="left-[19px] top-2 h-[calc(100%-1rem)]" />
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative">
                <Reveal delay={i * 90}>
                  <span className="absolute -left-14 flex h-10 w-10 items-center justify-center rounded-full bg-teal text-[#d6ba84] shadow-sm ring-4 ring-bg dark:bg-tealsoft dark:text-coral">
                    <Icon size={18} strokeWidth={1.9} />
                  </span>
                  <p className="text-sm font-semibold text-coralink">Step {i + 1}</p>
                  <h3 className="mt-1 text-xl">{title}</h3>
                  <p className="mt-1.5 text-[17px] leading-relaxed text-muted">{body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="glass h-full p-6 transition hover:-translate-y-1 hover:shadow-lift">
                <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-teal text-[#d6ba84] shadow-sm dark:bg-tealsoft dark:text-coral">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-lg">{title}</h3>
                <p className="mt-1.5 text-[16px] leading-relaxed text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </section>

        <Reveal>
          <section className="glass mb-16 flex flex-col items-center gap-5 p-10 text-center sm:p-14">
            <h2 className="font-serif text-4xl font-normal tracking-normal sm:text-5xl">See a day at Sunrise Home Care.</h2>
            <p className="max-w-xl text-[17px] text-muted">A guided tour walks you through every screen. It takes about three minutes.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/board?auto=1" className="btn-primary px-7 py-4 text-[17px]">
                Start the guided tour <ArrowRight size={18} />
              </Link>
              <Link href="/try" className="btn-ghost px-7 py-4 text-[17px]">
                Find your own match
              </Link>
            </div>
          </section>
        </Reveal>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 py-7 text-sm text-muted">
          <span>Bonded · MIT licensed · Sunrise Home Care reference agency</span>
          <span>Taste data by Qloo · Assistant by Google Gemini</span>
        </footer>
      </div>
    </div>
  );
}
