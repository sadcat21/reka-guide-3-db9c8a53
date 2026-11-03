import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen, Compass, Users, ShieldCheck, ArrowLeft, ArrowRight, CheckCircle2, Sparkles,
  ScrollText, MapPinned, Building2, Siren, Stethoscope, MessagesSquare, Clapperboard,
  Bus, Plane, UsersRound, Award, Star,
} from "lucide-react";
import heroImg from "@/assets/hero-haram.jpg";
import { useLang } from "@/i18n/LanguageProvider";
import { pricing, packageIds } from "@/lib/registrations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الرفقة الطيبة | تكوين مرشدي الحج والعمرة" },
      { name: "description", content: "برنامج تكويني عملي لإعداد مرشدي ومرافقي الحج والعمرة — Formation des guides du Hajj et de la Omra." },
      { property: "og:title", content: "الرفقة الطيبة | AL-RIFQA AL-TAYYIBA" },
      { property: "og:description", content: "تكوين يجمع بين المعرفة والتطبيق لمرشدي الحج والعمرة." },
    ],
  }),
  component: Index,
});

const pillarIcons = [BookOpen, Compass, Users, ShieldCheck];
const teamIcons = [ScrollText, MapPinned, Building2, Siren, Stethoscope, MessagesSquare, Clapperboard];
const practiceIcons = [Building2, Bus, Plane, UsersRound];

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <span className="mx-auto mb-4 block h-1 w-14 rounded-full bg-gold-gradient" />
      <h2 className="text-3xl font-bold text-teal md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Index() {
  const { t, dir } = useLang();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img src={heroImg} alt="" width={1600} height={1008} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto max-w-6xl px-4 py-28 md:py-40">
          <div className="max-w-2xl text-teal-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-teal/40 px-4 py-1.5 text-sm text-gold">
              <Sparkles className="h-4 w-4" /> {t.hero.trust}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">{t.hero.title}</h1>
            <p className="mt-6 text-lg leading-relaxed text-teal-foreground/85">{t.hero.text}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3.5 font-semibold text-gold-foreground shadow-card transition hover:brightness-105">
                {t.hero.cta} <Arrow className="h-4 w-4" />
              </Link>
              <a href="#stages" className="inline-flex items-center rounded-full border border-teal-foreground/40 px-7 py-3.5 font-semibold text-teal-foreground transition hover:bg-teal-foreground/10">
                {t.hero.secondary}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="program" className="bg-cream py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle title={t.about.title} subtitle={t.about.text} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.about.pillars.map((p, i) => {
              const Icon = pillarIcons[i] ?? BookOpen;
              return (
                <div key={p} className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="h-7 w-7" /></div>
                  <h3 className="mt-4 font-bold text-teal">{p}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stages */}
      <section id="stages" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="mb-2 text-center text-sm font-semibold text-gold">{t.stages.eyebrow}</p>
          <SectionTitle title={t.stages.title} />
          <div className="relative grid gap-8 lg:grid-cols-3">
            <div className="absolute inset-x-12 top-8 hidden h-0.5 bg-gold-gradient lg:block" />
            {t.stages.items.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="relative z-10 mx-auto grid h-16 w-16 place-items-center rounded-full border-4 border-background bg-teal text-xl font-bold text-gold">0{i + 1}</div>
                <div className="mt-6 rounded-2xl border border-border bg-mist p-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.stages.label} 0{i + 1}</p>
                  <h3 className="mt-1 text-xl font-bold text-teal">{s.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {s.points.map((pt) => (
                      <li key={pt} className="flex gap-2 text-sm text-foreground/85"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl rounded-xl border border-gold/40 bg-cream px-6 py-4 text-center font-semibold text-teal">{t.stages.note}</p>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="bg-teal py-24 text-teal-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="mx-auto mb-4 block h-1 w-14 rounded-full bg-gold-gradient" />
            <h2 className="text-3xl font-bold md:text-4xl">{t.team.title}</h2>
            <p className="mt-4 text-teal-foreground/75">{t.team.subtitle}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {t.team.items.map((m, i) => {
              const Icon = teamIcons[i] ?? ScrollText;
              return (
                <div key={m.title} className="rounded-2xl border border-teal-foreground/15 bg-teal-foreground/5 p-6">
                  <Icon className="h-8 w-8 text-gold" />
                  <h3 className="mt-4 font-bold">{m.title}</h3>
                  <p className="mt-2 text-sm text-teal-foreground/70">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Practice */}
      <section className="ornament py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle title={t.practice.title} subtitle={t.practice.text} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.practice.items.map((p, i) => {
              const Icon = practiceIcons[i] ?? Building2;
              return (
                <div key={p} className="flex flex-col items-center rounded-2xl bg-card p-8 text-center shadow-card">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gold-gradient text-gold-foreground"><Icon className="h-8 w-8" /></div>
                  <h3 className="mt-5 font-bold text-teal">{p}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-mist py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle title={t.benefits.title} />
          <div className="grid gap-4 md:grid-cols-2">
            {t.benefits.items.map((b) => (
              <div key={b} className="flex items-start gap-3 rounded-xl bg-card p-5 shadow-card">
                <Award className="h-6 w-6 shrink-0 text-gold" />
                <p className="text-foreground/90">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle title={t.pricing.title} subtitle={t.pricing.subtitle} />
          <div className="grid gap-6 md:grid-cols-3">
            {packageIds.map((id) => {
              const featured = id === "gold";
              const p = pricing[id];
              return (
                <div key={id} className={`relative flex flex-col rounded-3xl border p-8 ${featured ? "border-gold bg-teal text-teal-foreground shadow-card md:-translate-y-3" : "border-border bg-card"}`}>
                  {featured && (
                    <span className="absolute -top-3 start-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gold-gradient px-3 py-1 text-xs font-semibold text-gold-foreground rtl:translate-x-1/2"><Star className="h-3 w-3" />{t.pricing.popular}</span>
                  )}
                  <h3 className={`text-2xl font-bold ${featured ? "text-gold" : "text-teal"}`}>{t.pricing.names[id]}</h3>
                  <div className="mt-6 space-y-4">
                    <div>
                      <p className={`text-sm ${featured ? "text-teal-foreground/70" : "text-muted-foreground"}`}>{t.pricing.individual}</p>
                      <p className="text-3xl font-extrabold">{fmt(p.individual)} <span className="text-base font-medium">{t.pricing.currency}</span></p>
                    </div>
                    <div>
                      <p className={`text-sm ${featured ? "text-teal-foreground/70" : "text-muted-foreground"}`}>{t.pricing.pair}</p>
                      <p className="text-xl font-bold">{p.pair ? `${fmt(p.pair)} ${t.pricing.currency}` : t.pricing.onRequest}</p>
                    </div>
                  </div>
                  <Link to="/register" search={{ pkg: id }} className={`mt-8 rounded-full px-6 py-3 text-center font-semibold ${featured ? "bg-gold-gradient text-gold-foreground" : "bg-primary text-primary-foreground"}`}>{t.pricing.choose}</Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-cream py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-teal md:text-4xl">{t.finalCta.title}</h2>
          <p className="mt-4 text-muted-foreground">{t.finalCta.text}</p>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-8 py-4 font-semibold text-gold-foreground shadow-card">{t.finalCta.cta} <Arrow className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}
