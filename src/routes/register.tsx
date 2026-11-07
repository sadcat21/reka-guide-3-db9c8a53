import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Pencil, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { useJourney } from "@/components/JourneyProvider";
import { QuestionChoices } from "@/components/DiscoveryQuestionnaire";
import { copy } from "@/i18n/journey-copy";
import {
  activeQuestions,
  answerLabel,
  packageIds,
  groupIds,
  groupLabels,
  packageLabels,
  accommodationLabels,
  pricing,
  formatPrice,
  personalSchema,
  registrationSchema,
  type Draft,
} from "@/lib/journey";
import { submitRegistration } from "@/services/registrationService";
export const Route = createFileRoute("/register")({
  validateSearch: z.object({ pkg: z.enum(packageIds).optional() }),
  head: () => ({
    meta: [
      { title: "التسجيل المتدرج | الرفقة الطيبة" },
      {
        name: "description",
        content: "اكتشف اهتماماتك وأكمل طلب التسجيل التجريبي في تكوين مرشدي الحج والعمرة.",
      },
      { property: "og:title", content: "التسجيل | AL-RIFQA AL-TAYYIBA" },
      {
        property: "og:description",
        content: "Votre parcours d’inscription guidée au programme Al-Rifqa Al-Tayyiba.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Register,
});
const inputCls =
  "mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring/30";
function Register() {
  const { lang, t } = useLang();
  const { draft, ready, patch, answer } = useJourney();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (ready && search.pkg) patch({ package_type: search.pkg });
  }, [ready, search.pkg]);
  const titles = [copy.personal, copy.experience, copy.interests, copy.details, copy.review];
  const list = activeQuestions(draft.answers).filter((q) =>
    step === 1
      ? [
          "visited_haram",
          "hajj_umrah_experience",
          "trip_highlight",
          "previous_group_experience",
        ].includes(q.id)
      : ["motivation", "professional_ambition", "knowledge_level", "training_priorities"].includes(
          q.id,
        ),
  );
  const complete = list.every((q) => draft.answers[q.id]?.length);
  const current = list[Math.min(questionIndex, list.length - 1)];
  const changeStep = (value: number) => {
    setStep(value);
    setQuestionIndex(0);
    setEditing(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const next = () => {
    setError("");
    if (step === 0 && !personalSchema.safeParse(draft).success) {
      setError(copy.invalid[lang]);
      return;
    }
    if ((step === 1 || step === 2) && (!complete || editing)) {
      if (!current || !draft.answers[current.id]?.length) {
        setError(copy.select[lang]);
        return;
      }
      if (questionIndex < list.length - 1) {
        setQuestionIndex((q) => q + 1);
        return;
      }
      if (!complete) {
        setQuestionIndex(list.findIndex((q) => !draft.answers[q.id]?.length));
        return;
      }
    }
    changeStep(step + 1);
  };
  async function submit() {
    if (busy) return;
    const parsed = registrationSchema.safeParse({ ...draft, preferred_language: lang });
    if (!parsed.success) {
      setError(copy.invalid[lang]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await submitRegistration({ ...draft, preferred_language: lang });
      await navigate({ to: "/registration-success" });
    } catch {
      setError(copy.storageError[lang]);
    } finally {
      setBusy(false);
    }
  }
  const field = (key: "full_name" | "phone" | "wilaya", label: string) => (
    <label className="block">
      <span className="font-semibold text-teal">{label} *</span>
      <input
        value={draft[key]}
        onChange={(e) => patch({ [key]: e.target.value })}
        maxLength={key === "phone" ? 30 : key === "wilaya" ? 80 : 100}
        type={key === "phone" ? "tel" : "text"}
        dir={key === "phone" ? "ltr" : undefined}
        autoComplete={key === "full_name" ? "name" : key === "phone" ? "tel" : "address-level1"}
        required
        className={inputCls}
        aria-invalid={!!error && !personalSchema.safeParse(draft).success}
      />
    </label>
  );
  const select = <K extends keyof Draft>(
    key: K,
    label: string,
    options: { id: string; label: string }[],
  ) => (
    <label className="block">
      <span className="font-semibold text-teal">{label}</span>
      <select
        className={inputCls}
        value={String(draft[key])}
        onChange={(e) => patch({ [key]: e.target.value })}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <p className="text-sm font-semibold text-primary">
        {copy.steps[lang]} · {step + 1} / 5
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-relaxed text-teal">{titles[step]?.[lang]}</h1>
      <progress
        className="journey-progress mt-6 w-full"
        value={(step + 1) * 20}
        max={100}
        aria-label={copy.steps[lang]}
      />
      <p className="mt-2 text-end text-xs text-muted-foreground">{(step + 1) * 20}%</p>
      <div className="mt-7 min-h-72 space-y-6" key={`${step}-${questionIndex}`}>
        {step === 0 && (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              {field("full_name", t.form.fullName)}
              {field("phone", t.form.phone)}
            </div>
            {field("wilaya", lang === "ar" ? "الولاية" : "Wilaya")}
            <div className="grid gap-6 sm:grid-cols-2">
              {select("gender", copy.gender[lang], [
                { id: "", label: copy.unspecified[lang] },
                { id: "male", label: copy.male[lang] },
                { id: "female", label: copy.female[lang] },
              ])}
              {select("age_range", copy.age[lang], [
                { id: "", label: copy.unspecified[lang] },
                ...["under18", "18-25", "26-35", "36-50", "over50"].map((id, i) => ({
                  id,
                  label: ["< 18", "18–25", "26–35", "36–50", "> 50"][i] ?? id,
                })),
              ])}
            </div>
          </>
        )}
        {(step === 1 || step === 2) &&
          (complete && !editing ? (
            <>
              <p className="flex gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                {copy.reused[lang]}
              </p>
              <dl className="divide-y divide-border">
                {list.map((q, i) => (
                  <div key={q.id} className="flex items-start justify-between gap-3 py-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">{q.title[lang]}</dt>
                      <dd className="mt-2 font-medium">
                        {answerLabel(q.id, draft.answers[q.id], lang)}
                      </dd>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={copy.edit[lang]}
                      aria-label={`${copy.edit[lang]}: ${q.title[lang]}`}
                      onClick={() => {
                        setEditing(true);
                        setQuestionIndex(i);
                      }}
                    >
                      <Pencil />
                    </Button>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            current && (
              <>
                <p className="text-sm text-primary">
                  {questionIndex + 1} / {list.length}
                </p>
                <QuestionChoices question={current} />
              </>
            )
          ))}
        {step === 3 && (
          <>
            <fieldset>
              <legend className="mb-3 font-semibold text-teal">{t.form.type}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {groupIds.map((id) => (
                  <Button
                    key={id}
                    variant="outline"
                    className={`h-auto min-h-14 whitespace-normal ${draft.group_type === id ? "border-primary bg-primary/10" : ""}`}
                    aria-pressed={draft.group_type === id}
                    onClick={() => {
                      patch({ group_type: id });
                      answer("group_type", [id]);
                    }}
                  >
                    {groupLabels[id][lang]}
                  </Button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 font-semibold text-teal">{t.form.pkg}</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {packageIds.map((id) => (
                  <Button
                    key={id}
                    variant="outline"
                    className={`h-auto min-h-20 flex-col whitespace-normal ${draft.package_type === id ? "border-primary bg-primary/10" : ""}`}
                    aria-pressed={draft.package_type === id}
                    onClick={() => patch({ package_type: id })}
                  >
                    {packageLabels[id][lang]}
                    <span dir="ltr">
                      {formatPrice(pricing[id][draft.group_type])} {t.pricing.currency}
                    </span>
                  </Button>
                ))}
              </div>
            </fieldset>
            <p className="border-s-4 border-gold bg-mist p-4 text-lg font-bold">
              {copy.price[lang]}:{" "}
              <span dir="ltr">
                {formatPrice(pricing[draft.package_type][draft.group_type])} {t.pricing.currency}
              </span>
            </p>
            {select(
              "accommodation",
              copy.accommodation[lang],
              Object.entries(accommodationLabels).map(([id, label]) => ({
                id,
                label: label[lang],
              })),
            )}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{copy.separate[lang]}</p>
              <p>{copy.hotelRates[lang]}</p>
              <p>{copy.dormRates[lang]}</p>
            </div>
            <label className="flex items-center gap-3 font-medium">
              <input
                type="checkbox"
                checked={draft.has_companion}
                onChange={(e) =>
                  patch({ has_companion: e.target.checked, companion_transport: false })
                }
                className="h-5 w-5 accent-primary"
              />
              {copy.companion[lang]}
            </label>
            {draft.has_companion && (
              <>
                <p className="text-sm text-muted-foreground">{copy.transportInfo[lang]}</p>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-primary"
                    checked={draft.companion_transport}
                    onChange={(e) => patch({ companion_transport: e.target.checked })}
                  />
                  {copy.transport[lang]}
                </label>
              </>
            )}
            <label className="block">
              <span className="font-semibold text-teal">{t.form.notes}</span>
              <textarea
                className={inputCls}
                rows={3}
                maxLength={1000}
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </label>
          </>
        )}
        {step === 4 && (
          <>
            {[0, 1, 2, 3].map((section) => (
              <div key={section} className="border-b border-border pb-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-bold text-teal">{titles[section]?.[lang]}</h2>
                  <Button
                    variant="ghost"
                    onClick={() => changeStep(section)}
                    aria-label={`${copy.edit[lang]}: ${titles[section]?.[lang]}`}
                  >
                    <Pencil />
                    {copy.edit[lang]}
                  </Button>
                </div>
                {section === 0 ? (
                  <p>
                    {draft.full_name} · <bdi>{draft.phone}</bdi> · {draft.wilaya}
                    <br />
                    {draft.gender === "male"
                      ? copy.male[lang]
                      : draft.gender === "female"
                        ? copy.female[lang]
                        : copy.unspecified[lang]}{" "}
                    · {draft.age_range || copy.unspecified[lang]}
                  </p>
                ) : section === 3 ? (
                  <div className="space-y-2">
                    <p>
                      {packageLabels[draft.package_type][lang]} ·{" "}
                      {groupLabels[draft.group_type][lang]}
                    </p>
                    <p className="font-bold text-primary">
                      {copy.price[lang]}:{" "}
                      <bdi>
                        {formatPrice(pricing[draft.package_type][draft.group_type])}{" "}
                        {t.pricing.currency}
                      </bdi>
                    </p>
                    <p>
                      {copy.accommodation[lang]}: {accommodationLabels[draft.accommodation][lang]}
                    </p>
                    <p className="text-sm">{copy.separate[lang]}</p>
                    <p>
                      {copy.companion[lang]} {draft.has_companion ? copy.yes[lang] : copy.no[lang]}
                      {draft.companion_transport ? ` · ${copy.transport[lang]}` : ""}
                    </p>
                    {draft.notes && <p>{draft.notes}</p>}
                  </div>
                ) : (
                  <dl className="space-y-3">
                    {activeQuestions(draft.answers)
                      .filter((q) =>
                        section === 1
                          ? [
                              "visited_haram",
                              "hajj_umrah_experience",
                              "trip_highlight",
                              "previous_group_experience",
                            ].includes(q.id)
                          : [
                              "motivation",
                              "professional_ambition",
                              "knowledge_level",
                              "training_priorities",
                            ].includes(q.id),
                      )
                      .map((q) => (
                        <div key={q.id}>
                          <dt className="text-xs text-muted-foreground">{q.title[lang]}</dt>
                          <dd className="mt-1 text-sm">
                            {answerLabel(q.id, draft.answers[q.id], lang)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </div>
            ))}
            <p>
              {copy.language[lang]}: {lang === "ar" ? "العربية" : "Français"}
            </p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-primary"
                checked={draft.consent}
                onChange={(e) => patch({ consent: e.target.checked })}
              />
              {copy.consent[lang]}
            </label>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-5 text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        {copy.demo[lang]}
      </p>
      <div className="mt-6 flex justify-between gap-3">
        <Button
          variant="ghost"
          disabled={(step === 0 && questionIndex === 0) || busy}
          onClick={() => {
            if ((step === 1 || step === 2) && questionIndex > 0 && (!complete || editing))
              setQuestionIndex((q) => q - 1);
            else changeStep(step - 1);
          }}
        >
          {copy.back[lang]}
        </Button>
        {step === 4 ? (
          <Button
            className="h-auto min-h-12 whitespace-normal"
            disabled={!draft.consent || busy || !ready}
            onClick={submit}
          >
            {busy ? "…" : copy.submit[lang]}
          </Button>
        ) : (
          <Button className="h-12" disabled={!ready} onClick={next}>
            {copy.next[lang]}
          </Button>
        )}
      </div>
    </section>
  );
}
