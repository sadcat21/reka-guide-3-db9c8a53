import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Copy, MessageCircle, Phone, ShieldAlert, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { staffAccessQuery } from "@/lib/staff";
import { adminRegistrationsQuery } from "@/lib/admin";
import {
  callLogsQuery, callSignals, callStages, closingChecklist, discoveryQuestions, followUpScripts,
  groupScript, nextFollowUp, objections, openingScript, outcomeIds, outcomes, personaIds, personas,
  preCallInsights, redLines, scorePersona, templateForOutcome, toWhatsAppNumber, whatsappTemplate,
  MAX_NO_ANSWER_ATTEMPTS, type OutcomeId, type PersonaId,
} from "@/lib/call-guide";
import { groupLabels, packageLabels, profiles, type GroupId, type PackageId, type ProfileId } from "@/lib/journey";
import { StaffNav } from "@/components/StaffNav";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/call/$id")({
  head: () => ({
    meta: [
      { title: "مساعد المكالمة | الرفقة الطيبة" },
      { name: "description", content: "مساعد المكالمات وتحليل شخصية المتصل لفريق الرفقة الطيبة." },
      { property: "og:title", content: "مساعد المكالمة | الرفقة الطيبة" },
      { property: "og:description", content: "Assistant d’appel — Al-Rifqa Al-Tayyiba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const access = await context.queryClient.ensureQueryData(staffAccessQuery);
    if (!access || (!access.isAdmin && !access.assistant?.is_active)) throw redirect({ to: "/admin-login" });
    if (!access.can.can_view_registrations) throw redirect({ to: "/my-stats" });
  },
  loader: async ({ context, params }) => {
    const [rows] = await Promise.all([
      context.queryClient.ensureQueryData(adminRegistrationsQuery),
      context.queryClient.ensureQueryData(callLogsQuery),
    ]);
    if (!rows.some((r) => r.id === params.id)) throw notFound();
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-lg font-semibold">هذا الطلب غير موجود أو تم حذفه.</p>
      <Button asChild className="mt-4"><Link to="/admin">العودة إلى المسجلين</Link></Button>
    </div>
  ),
  component: CallCopilot,
});

const toLocalInput = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";

function CallCopilot() {
  const { id } = Route.useParams();
  const { lang } = useLang();
  const ar = lang === "ar";
  const queryClient = useQueryClient();
  const { data: access } = useSuspenseQuery(staffAccessQuery);
  const { data: rows } = useSuspenseQuery(adminRegistrationsQuery);
  const { data: allLogs } = useSuspenseQuery(callLogsQuery);
  const r = rows.find((x) => x.id === id);
  const logs = useMemo(() => allLogs.filter((l) => l.registration_id === id), [allLogs, id]);

  const [ticked, setTicked] = useState<string[]>([]);
  const [manualPersona, setManualPersona] = useState<PersonaId | null>(null);
  const [openObjection, setOpenObjection] = useState<number | null>(null);
  const [checks, setChecks] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<OutcomeId | null>(null);
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [savedOutcome, setSavedOutcome] = useState<OutcomeId | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const scored = scorePersona(ticked);
  const lastPersona = (logs.find((l) => l.persona)?.persona ?? null) as PersonaId | null;
  const persona = manualPersona ?? scored.persona;
  const noAnswerSoFar = logs.filter((l) => l.outcome === "no_answer").length;
  const insights = r ? preCallInsights(r) : [];

  function chooseOutcome(o: OutcomeId) {
    setOutcome(o);
    setFollowUp(toLocalInput(nextFollowUp(o, new Date(), noAnswerSoFar + (o === "no_answer" ? 1 : 0))));
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!r || !outcome || !access) throw new Error("missing");
      const { error } = await supabase.from("rifqa_call_logs").insert({
        registration_id: r.id,
        actor_id: access.userId,
        persona,
        outcome,
        notes: notes.trim().slice(0, 2000),
        follow_up_at: followUp ? new Date(followUp).toISOString() : null,
      });
      if (error) throw error;
      const next = outcomes[outcome].status;
      if (next && next !== r.status && access.can.can_update_status) {
        const { error: e2 } = await supabase.from("murshid_rifqa_registrations").update({ status: next }).eq("id", r.id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      const kind = outcome ? templateForOutcome[outcome] : null;
      setSavedOutcome(outcome);
      setMessage(kind && r ? whatsappTemplate(kind, r) : "");
      setNotes("");
      setOutcome(null);
      setFollowUp("");
      return queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  if (!access || !r) return null;
  const card = "rounded-xl border border-border bg-card p-5";
  const wa = (text: string) => `https://wa.me/${toWhatsAppNumber(r.phone)}?text=${encodeURIComponent(text)}`;

  return (
    <>
      <StaffNav access={access} />
      <section className="mx-auto max-w-7xl px-4 py-8" dir="rtl">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> {ar ? "العودة إلى المسجلين" : "Retour aux inscriptions"}
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-teal">{r.full_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {r.wilaya} · {packageLabels[r.package_type as PackageId]?.ar ?? r.package_type} · {groupLabels[r.group_type as GroupId]?.ar ?? r.group_type} ·{" "}
              {profiles[r.interest_profile as ProfileId]?.title.ar ?? r.interest_profile} · <span dir="ltr" className="font-mono">{r.reference}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><a href={`tel:${r.phone}`}><Phone /> <span dir="ltr">{r.phone}</span></a></Button>
            <Button asChild variant="outline"><a href={wa("")} target="_blank" rel="noreferrer"><MessageCircle /> واتساب</a></Button>
          </div>
        </div>

        {!ar && <p className="mt-3 rounded-md bg-muted p-3 text-sm">Les scripts et réponses sont en arabe, tels que dans le guide de l’équipe d’appel.</p>}

        <div role="note" className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 font-bold text-destructive"><ShieldAlert className="h-5 w-5" /> الخطوط الحمراء</p>
          <ul className="mt-2 grid gap-1 text-sm md:grid-cols-2">
            {redLines.map((t) => <li key={t}>⛔ {t}</li>)}
          </ul>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Before the call */}
          <div className="space-y-6">
            <div className={card}>
              <h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4 text-primary" /> قبل الاتصال: ما تقوله لنا الاستمارة</h2>
              <ul className="mt-3 space-y-2 text-sm">{insights.map((t) => <li key={t}>• {t}</li>)}</ul>
              {r.notes && <p className="mt-3 rounded-md bg-muted p-2 text-sm">ملاحظة المسجّل: {r.notes}</p>}
              {lastPersona && (
                <p className="mt-3 rounded-md bg-primary/10 p-2 text-sm">
                  النمط المحدد في مكالمة سابقة: <b>{personas[lastPersona].icon} {personas[lastPersona].title.ar}</b>
                </p>
              )}
            </div>
            <div className={card}>
              <h2 className="font-bold">مراحل المكالمة</h2>
              <ol className="mt-3 space-y-3 text-sm">
                {callStages.map((s, i) => (
                  <li key={s.title}><b>{i + 1}. {s.title}</b> <span className="text-muted-foreground">({s.time})</span><br />{s.text}</li>
                ))}
              </ol>
            </div>
            <details className={card}>
              <summary className="cursor-pointer font-bold">{logs.length ? "سكريبتات المتابعة" : "سكريبت الافتتاحية"}</summary>
              <p className="mt-3 text-sm leading-7">{openingScript}</p>
              {followUpScripts.map((s) => (
                <div key={s.title} className="mt-4 text-sm">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-destructive">{s.avoid}</p>
                  <p className="mt-1 leading-7">{s.text}</p>
                </div>
              ))}
            </details>
          </div>

          {/* During the call */}
          <div className="space-y-6">
            <div className={card}>
              <h2 className="font-bold">تحليل المتصل أثناء المكالمة</h2>
              <p className="mt-1 text-xs text-muted-foreground">علّم ما تلاحظه في أول 30 ثانية، وسيقترح المساعد نمط الشخصية.</p>
              <ul className="mt-3 space-y-2 text-sm">
                {callSignals.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input type="checkbox" className="mt-1" checked={ticked.includes(s.id)}
                        onChange={(e) => { setManualPersona(null); setTicked((t) => e.target.checked ? [...t, s.id] : t.filter((x) => x !== s.id)); }} />
                      {s.text}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {personaIds.map((p) => (
                  <Button key={p} size="sm" variant={persona === p ? "default" : "outline"} aria-pressed={persona === p}
                    onClick={() => setManualPersona(p)} className="h-auto justify-start whitespace-normal py-2 text-start">
                    {personas[p].icon} {personas[p].title.ar}{scored.scores[p] ? ` (${scored.scores[p]})` : ""}
                  </Button>
                ))}
              </div>
              {!persona && ticked.length > 0 && <p className="mt-2 text-xs text-muted-foreground">المؤشرات متقاربة؛ اختر النمط الأقرب يدويًا.</p>}
            </div>

            {persona && (
              <div className={`${card} border-primary`}>
                <h3 className="text-lg font-bold">{personas[persona].icon} {personas[persona].title.ar}</h3>
                <p className="mt-1 rounded-md bg-primary/10 p-2 text-sm font-semibold">القاعدة: {personas[persona].rule}</p>
                <p className="mt-3 font-semibold text-primary">✅ شارك معه</p>
                <ul className="mt-1 space-y-1 text-sm">{personas[persona].share.map((t) => <li key={t}>• {t}</li>)}</ul>
                <p className="mt-3 font-semibold text-destructive">🚫 تجنّب معه</p>
                <ul className="mt-1 space-y-1 text-sm">{personas[persona].avoid.map((t) => <li key={t}>• {t}</li>)}</ul>
                {persona === "enthusiastic" && r.group_type === "individual" && (
                  <p className="mt-3 rounded-md bg-muted p-2 text-sm leading-7"><b>سكريبت التسجيل الجماعي:</b> {groupScript}</p>
                )}
              </div>
            )}

            <div className={card}>
              <h2 className="font-bold">أسئلة الاكتشاف (الدقيقة الأولى)</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {discoveryQuestions.map((d) => (
                  <li key={d.q}>
                    <p className="font-semibold">«{d.q}»</p>
                    <p className="text-muted-foreground">يكشف: {d.reveals}</p>
                    <p>ركّز على: {d.focus}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">لا تطرحها كتحقيق؛ مهّد بجملة مثل: «حتى أوضح لك الجوانب التي تهمك تحديدًا…»</p>
            </div>

            <div className={card}>
              <h2 className="font-bold">الرد على الاعتراضات</h2>
              <div className="mt-3 flex flex-col gap-2">
                {objections.map((o, i) => (
                  <div key={o.q}>
                    <Button variant={openObjection === i ? "secondary" : "outline"} size="sm" className="h-auto w-full justify-start whitespace-normal py-2 text-start"
                      aria-expanded={openObjection === i} onClick={() => setOpenObjection(openObjection === i ? null : i)}>
                      {o.q}
                    </Button>
                    {openObjection === i && <p className="mt-2 rounded-md bg-muted p-3 text-sm leading-7">{o.a}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Closing the call */}
          <div className="space-y-6">
            <div className={card}>
              <h2 className="font-bold">قبل إغلاق المكالمة</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {closingChecklist.map((t, i) => (
                  <li key={t}>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input type="checkbox" className="mt-1" checked={checks.includes(i)}
                        onChange={(e) => setChecks((c) => e.target.checked ? [...c, i] : c.filter((x) => x !== i))} />
                      {t}
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className={card}>
              <h2 className="font-bold">نتيجة المكالمة</h2>
              <div className="mt-3 grid gap-2">
                {outcomeIds.map((o) => (
                  <Button key={o} size="sm" variant={outcome === o ? "default" : "outline"} aria-pressed={outcome === o}
                    onClick={() => chooseOutcome(o)} className="justify-start">
                    {outcomes[o].title.ar}
                  </Button>
                ))}
              </div>
              {outcome && (
                <div className="mt-4 space-y-3 text-sm">
                  <p className="rounded-md bg-muted p-2">{outcomes[outcome].action}</p>
                  {outcome === "no_answer" && noAnswerSoFar + 1 >= MAX_NO_ANSWER_ATTEMPTS && (
                    <p className="text-destructive">هذه المحاولة رقم {noAnswerSoFar + 1}؛ لا متابعة هاتفية بعدها، اكتفِ برسالة واتساب.</p>
                  )}
                  <label className="block">
                    <span className="font-semibold">موعد المتابعة</span>
                    <Input type="datetime-local" dir="ltr" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="mt-1" />
                  </label>
                  <label className="block">
                    <span className="font-semibold">ملاحظات المكالمة</span>
                    <Textarea value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="ما اتُّفق عليه، اعتراضاته، أفضل وقت للاتصال…" />
                  </label>
                  {outcomes[outcome].status && outcomes[outcome].status !== r.status && (
                    <p className="text-xs text-muted-foreground">
                      {access.can.can_update_status ? "سيتم تحديث حالة الطلب تلقائيًا." : "لا تملك صلاحية تحديث حالة الطلب؛ ستُحفظ المكالمة فقط."}
                    </p>
                  )}
                  <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
                    <Check /> حفظ المكالمة
                  </Button>
                  {save.isError && <p role="alert" className="text-destructive">تعذر حفظ المكالمة، حاول مجددًا.</p>}
                </div>
              )}
              {savedOutcome && !outcome && (
                <p className="mt-3 text-sm font-semibold text-primary">تم حفظ المكالمة: {outcomes[savedOutcome].title.ar}</p>
              )}
            </div>

            {message && (
              <div className={card}>
                <h2 className="font-bold">رسالة واتساب جاهزة</h2>
                <p className="mt-1 text-xs text-muted-foreground">أكمل ما بين [ ] قبل الإرسال.</p>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} className="mt-2" />
                <div className="mt-2 flex gap-2">
                  <Button asChild size="sm"><a href={wa(message)} target="_blank" rel="noreferrer"><MessageCircle /> إرسال</a></Button>
                  <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                    <Copy /> {copied ? "تم النسخ" : "نسخ"}
                  </Button>
                </div>
              </div>
            )}

            <div className={card}>
              <h2 className="font-bold">سجل المكالمات ({logs.length})</h2>
              {logs.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">لا توجد مكالمات سابقة. هذه أول مكالمة.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {logs.map((l) => (
                    <li key={l.id} className="py-2">
                      <div className="flex flex-wrap justify-between gap-2">
                        <b>{outcomes[l.outcome as OutcomeId]?.title.ar ?? l.outcome}</b>
                        <span className="text-xs text-muted-foreground" dir="ltr">{new Date(l.created_at).toLocaleString("ar-DZ")}</span>
                      </div>
                      {l.persona && <p className="text-xs">{personas[l.persona as PersonaId]?.icon} {personas[l.persona as PersonaId]?.title.ar}</p>}
                      {l.notes && <p className="mt-1">{l.notes}</p>}
                      {l.follow_up_at && <p className="mt-1 text-xs text-muted-foreground">متابعة: <span dir="ltr">{new Date(l.follow_up_at).toLocaleString("ar-DZ")}</span></p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
