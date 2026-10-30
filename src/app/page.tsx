import Link from "next/link";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: "1", title: "Two-minute intake", body: "Clients (or family) and caregivers name a few favourites. Every one is resolved to a Qloo entity." },
  { n: "2", title: "Qloo expands taste", body: "Qloo's taste graph turns 5 favourites into a cross-domain profile: music, TV, film, food and books." },
  { n: "3", title: "Bridges, not guesses", body: "Bonded scores overlap and finds the bridges both people love, even across a 60-year age gap." },
  { n: "4", title: "The agent handles call-outs", body: "When a caregiver calls out, the agent finds the best qualified substitute, drafts the offer and briefs them." },
];

export default function Landing() {
  return (
    <Shell>
      <section className="grid items-center gap-10 py-6 md:grid-cols-[1.2fr_1fr] md:py-12">
        <div>
          <p className="label mb-4">For home care agencies</p>
          <h1 className="text-5xl leading-[1.05] sm:text-6xl">
            Care that <span className="text-coral">clicks</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Every home care agency advertises that its caregivers are <em>bonded</em>. We make it true. Bonded matches caregivers to elderly clients by
            shared taste, using Qloo's taste graph, and its agent keeps those bonds intact when a shift falls through.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/board" className="btn-primary px-6 py-3 text-base">
              Run the agency for a day →
            </Link>
            <Link href="/try" className="btn-ghost px-6 py-3 text-base">
              Try it yourself
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">No login. A fully synthetic agency: 40 caregivers, 60 clients, Phoenix AZ.</p>
        </div>
        <div className="card relative overflow-hidden p-6">
          <p className="label">Tomorrow, 9am–1pm</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal font-semibold text-white dark:text-bg">DA</div>
              <p className="mt-2 text-sm font-semibold">Dolores, 84</p>
              <p className="text-xs text-muted">Pedro Infante · telenovelas</p>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-teal via-coral to-teal" />
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral font-semibold text-white dark:text-bg">MG</div>
              <p className="mt-2 text-sm font-semibold">Maria, 23</p>
              <p className="text-xs text-muted">Bad Bunny · cooking shows</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted">
            Rosa called out. Instead of sending whoever is free, Bonded asks Qloo who will actually click with Dolores, then hands Maria three things to talk
            about before she walks in.
          </p>
          <p className="mt-3 text-xs text-muted">Live bridges are computed by Qloo when you run the demo.</p>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="card p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coralsoft font-semibold text-coral">{s.n}</span>
            <h2 className="mt-3 text-lg">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl">The problem agencies pay for</h2>
          <p className="mt-3 text-sm text-muted">
            Caregiver turnover is home care's number-one problem, and clients cancel when strangers keep showing up. The riskiest moment is the substitute
            shift. Agencies match on zip code, availability and skills; nobody matches on whether two people will get along over months of four-hour
            visits.
          </p>
          <p className="mt-3 text-sm text-muted">
            We don't fix low pay, the main reason caregivers leave. We fix what agencies control: who gets matched, how call-outs go, and catching a
            relationship before it breaks.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl">Fair by design</h2>
          <p className="mt-3 text-sm text-muted">
            Bonded never asks about or infers race, ethnicity, religion or national origin. Hard care constraints decide who is eligible; taste only ranks
            eligible caregivers and never excludes one. A fairness audit, on separately stored self-reported data, checks that offers stay balanced.
          </p>
          <Link href="/fairness" className="mt-4 inline-block text-sm font-semibold text-teal">
            See the audit →
          </Link>
        </div>
      </section>
    </Shell>
  );
}
