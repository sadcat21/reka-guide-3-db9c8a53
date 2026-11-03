import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { useLang } from "@/i18n/LanguageProvider";
import { packageIds, registrationSchema, submitRegistration, type PackageId } from "@/lib/registrations";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ pkg: z.enum(packageIds).optional() }),
  head: () => ({
    meta: [
      { title: "التسجيل | الرفقة الطيبة — Inscription" },
      { name: "description", content: "استمارة طلب التسجيل في برنامج الرفقة الطيبة لتكوين مرشدي الحج والعمرة." },
      { property: "og:title", content: "التسجيل في برنامج الرفقة الطيبة" },
      { property: "og:description", content: "Demande d'inscription au programme Al-Rifqa Al-Tayyiba." },
    ],
  }),
  component: Register,
});

type Errors = Partial<Record<"fullName" | "phone" | "email" | "city", string>>;
const inputCls = "mt-1.5 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

function Register() {
  const { t } = useLang();
  const f = t.form;
  const search = Route.useSearch();
  const initial = { fullName: "", phone: "", email: "", city: "", pkg: (search.pkg ?? "gold") as PackageId, type: "individual" as "individual" | "pair", notes: "" };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = registrationSchema.safeParse(values);
    if (!res.success) {
      const errs: Errors = {};
      for (const issue of res.error.issues) {
        const k = issue.path[0] as keyof Errors;
        if (k in f.errors) errs[k] = f.errors[k];
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    await submitRegistration(res.data);
    setBusy(false);
    setDone(true);
  }

  if (done) {
    return (
      <section className="ornament min-h-[70vh] py-24">
        <div className="mx-auto max-w-lg rounded-3xl bg-card p-10 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-6 text-2xl font-bold text-teal">{f.successTitle}</h1>
          <p className="mt-3 text-muted-foreground">{f.successText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">{f.back}</Link>
            <button onClick={() => { setValues(initial); setDone(false); }} className="rounded-full border border-border px-6 py-3 font-semibold text-teal">{f.another}</button>
          </div>
        </div>
      </section>
    );
  }

  const field = (k: "fullName" | "phone" | "email" | "city", label: string, ph: string, type = "text") => (
    <label className="block">
      <span className="text-sm font-semibold text-teal">{label}</span>
      <input type={type} value={values[k]} onChange={set(k)} placeholder={ph} className={inputCls} aria-invalid={!!errors[k]} dir={k === "phone" || k === "email" ? "ltr" : undefined} />
      {errors[k] && <span className="mt-1 block text-sm text-destructive">{errors[k]}</span>}
    </label>
  );

  return (
    <section className="ornament py-16 md:py-24">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 block h-1 w-14 rounded-full bg-gold-gradient" />
          <h1 className="text-3xl font-bold text-teal">{f.title}</h1>
          <p className="mt-3 text-muted-foreground">{f.subtitle}</p>
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-3xl bg-card p-6 shadow-card md:p-10">
          {field("fullName", f.fullName, f.fullNamePh)}
          <div className="grid gap-5 md:grid-cols-2">
            {field("phone", f.phone, f.phonePh, "tel")}
            {field("email", f.email, f.emailPh, "email")}
          </div>
          {field("city", f.city, f.cityPh)}
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-teal">{f.pkg}</span>
              <select value={values.pkg} onChange={set("pkg")} className={inputCls}>
                {packageIds.map((id) => <option key={id} value={id}>{t.pricing.names[id]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-teal">{f.type}</span>
              <select value={values.type} onChange={set("type")} className={inputCls}>
                <option value="individual">{f.individual}</option>
                <option value="pair">{f.pair}</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold text-teal">{f.notes}</span>
            <textarea rows={4} maxLength={1000} value={values.notes} onChange={set("notes")} placeholder={f.notesPh} className={inputCls} />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-full bg-gold-gradient px-6 py-4 font-semibold text-gold-foreground shadow-card disabled:opacity-60">{f.submit}</button>
        </form>
      </div>
    </section>
  );
}
