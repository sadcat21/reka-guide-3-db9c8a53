import { createFileRoute, redirect } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Award, CalendarCheck, Flame, PhoneCall, ShieldCheck, Trophy } from "lucide-react";
import { activityQuery, computeBadges, computeStats, permissionKeys, permissionLabels, staffAccessQuery } from "@/lib/staff";
import { StaffNav } from "@/components/StaffNav";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_authenticated/my-stats")({
  head: () => ({
    meta: [
      { title: "إنجازاتي | الرفقة الطيبة" },
      { name: "description", content: "إنجازات وإحصائيات عضو فريق الرفقة الطيبة." },
      { property: "og:title", content: "إنجازاتي | الرفقة الطيبة" },
      { property: "og:description", content: "Mes statistiques — Al-Rifqa Al-Tayyiba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const access = await context.queryClient.ensureQueryData(staffAccessQuery);
    if (!access || (!access.isAdmin && !access.assistant?.is_active)) throw redirect({ to: "/admin-login" });
    return { userId: access.userId };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(activityQuery(context.userId)),
  component: MyStats,
});

const statusText: Record<string, { ar: string; fr: string }> = {
  new: { ar: "جديد", fr: "Nouveau" },
  contacted: { ar: "تم التواصل", fr: "Contacté" },
  confirmed: { ar: "مؤكد", fr: "Confirmé" },
  cancelled: { ar: "ملغى", fr: "Annulé" },
};

function MyStats() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const { data: access } = useSuspenseQuery(staffAccessQuery);
  const { data: rows } = useSuspenseQuery(activityQuery(access?.userId));
  const stats = useMemo(() => computeStats(rows), [rows]);
  const badges = useMemo(() => computeBadges(stats), [stats]);
  if (!access) return null;
  const max = Math.max(1, ...stats.daily.map((d) => d.count));
  const name = access.isAdmin ? (ar ? "المدير" : "Administrateur") : access.assistant?.display_name;
  const earned = badges.filter((b) => b.earned).length;

  return (
    <>
      <StaffNav access={access} />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold text-teal">
          {ar ? `مرحبًا ${name}` : `Bonjour ${name}`}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {ar ? "هذه إنجازاتك وإحصائياتك في متابعة المسجلين." : "Vos résultats dans le suivi des inscriptions."}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <Card icon={<Trophy />} label={ar ? "مجموع الإنجازات" : "Total"} value={stats.total} />
          <Card icon={<PhoneCall />} label={ar ? "تم التواصل" : "Contactés"} value={stats.contacted} />
          <Card icon={<PhoneCall />} label={ar ? "مكالمات موثقة" : "Appels notés"} value={stats.calls} />
          <Card icon={<ShieldCheck />} label={ar ? "طلبات مؤكدة" : "Confirmés"} value={stats.confirmed} />
          <Card icon={<CalendarCheck />} label={ar ? "اليوم" : "Aujourd’hui"} value={stats.today} />
          <Card icon={<CalendarCheck />} label={ar ? "آخر 7 أيام" : "7 derniers jours"} value={stats.last7} />
          <Card icon={<Flame />} label={ar ? "أيام متتالية" : "Jours d’affilée"} value={stats.streak} />
        </dl>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="font-bold">{ar ? "نشاطك خلال 14 يومًا" : "Activité sur 14 jours"}</h2>
            <div className="mt-4 flex h-40 items-end gap-1" dir="ltr">
              {stats.daily.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                  <span className="text-xs text-muted-foreground">{d.count || ""}</span>
                  <div className="w-full rounded-t bg-primary" style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 4 : 1 }} />
                  <span className="text-[10px] text-muted-foreground">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-bold">{ar ? "صلاحياتك" : "Vos droits"}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {permissionKeys.map((k) => (
                <li key={k} className="flex items-center justify-between gap-2">
                  {permissionLabels[k][lang]}
                  <span className={access.can[k] ? "font-semibold text-primary" : "text-muted-foreground"}>
                    {access.can[k] ? (ar ? "مفعّلة" : "Oui") : ar ? "غير مفعّلة" : "Non"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Award className="h-5 w-5 text-primary" />
            {ar ? `الأوسمة (${earned}/${badges.length})` : `Badges (${earned}/${badges.length})`}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {badges.map((b) => (
              <li
                key={b.id}
                className={`rounded-xl border p-4 text-center ${b.earned ? "border-primary bg-primary/10" : "border-border bg-card opacity-60"}`}
              >
                <Award className={`mx-auto h-8 w-8 ${b.earned ? "text-primary" : "text-muted-foreground"}`} />
                <p className="mt-2 text-sm font-semibold">{b[lang]}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.earned ? (ar ? "تم الحصول عليه" : "Obtenu") : `${b.progress}/${b.goal}`}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold">{ar ? "آخر أعمالك" : "Dernières actions"}</h2>
          {rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {ar ? "لم تسجّل أي إنجاز بعد. ابدأ بتحديث حالة أحد الطلبات." : "Aucune action pour le moment."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {rows.slice(0, 15).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span dir="ltr" className="font-mono text-xs">{r.registration_reference}</span>
                  <span>
                    {r.action === "deleted"
                      ? ar ? "حذف الطلب" : "Demande supprimée"
                      : r.action === "call_logged"
                      ? ar ? "توثيق مكالمة" : "Appel noté"
                      : `${statusText[r.from_status ?? ""]?.[lang] ?? r.from_status} ← ${statusText[r.to_status ?? ""]?.[lang] ?? r.to_status}`}
                  </span>
                  <span className="text-xs text-muted-foreground" dir="ltr">
                    {new Date(r.created_at).toLocaleString(ar ? "ar-DZ" : "fr-DZ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold text-teal">{value}</dd>
    </div>
  );
}
