import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { Download, PhoneCall, RefreshCw, Trash2 } from "lucide-react";
import { callLogsQuery, dueFollowUps, latestCallByRegistration, outcomes, type OutcomeId } from "@/lib/call-guide";
import { supabase } from "@/integrations/supabase/client";
import { staffAccessQuery } from "@/lib/staff";
import { StaffNav } from "@/components/StaffNav";
import {
  adminRegistrationsQuery,
  registrationStatuses,
  type RegistrationStatus,
} from "@/lib/admin";
import {
  accommodationLabels,
  answerLabel,
  groupLabels,
  packageLabels,
  profiles,
  type AnswerKey,
  type GroupId,
  type PackageId,
  type ProfileId,
} from "@/lib/journey";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | الرفقة الطيبة" },
      { name: "description", content: "متابعة طلبات التسجيل في برنامج الرفقة الطيبة." },
      { property: "og:title", content: "لوحة الإدارة | الرفقة الطيبة" },
      { property: "og:description", content: "Tableau de bord Al-Rifqa Al-Tayyiba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const access = await context.queryClient.ensureQueryData(staffAccessQuery);
    if (!access || (!access.isAdmin && !access.assistant?.is_active)) {
      await supabase.auth.signOut();
      context.queryClient.removeQueries({ queryKey: ["admin"] });
      throw redirect({ to: "/admin-login" });
    }
    if (!access.can.can_view_registrations) throw redirect({ to: "/my-stats" });
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(adminRegistrationsQuery),
      context.queryClient.ensureQueryData(callLogsQuery),
    ]),
  component: AdminDashboard,
});

const statusLabels: Record<RegistrationStatus, { ar: string; fr: string }> = {
  new: { ar: "جديد", fr: "Nouveau" },
  contacted: { ar: "تم التواصل", fr: "Contacté" },
  confirmed: { ar: "مؤكد", fr: "Confirmé" },
  cancelled: { ar: "ملغى", fr: "Annulé" },
};

const pick = <T extends Record<string, { ar: string; fr: string }>>(
  map: T,
  key: string,
  lang: "ar" | "fr",
) => map[key as keyof T]?.[lang] ?? (key || "—");

function AdminDashboard() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const queryClient = useQueryClient();
  const { data: access } = useSuspenseQuery(staffAccessQuery);
  const can = access?.can;
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { data: rows, refetch, isFetching } = useSuspenseQuery(adminRegistrationsQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | RegistrationStatus>("all");
  const [pkg, setPkg] = useState<"all" | PackageId>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: callLogs } = useSuspenseQuery(callLogsQuery);
  const lastCall = useMemo(() => latestCallByRegistration(callLogs), [callLogs]);
  const due = useMemo(() => dueFollowUps(callLogs), [callLogs]);
  const [onlyDue, setOnlyDue] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!onlyDue || due.has(r.id)) &&
        (status === "all" || r.status === status) &&
        (pkg === "all" || r.package_type === pkg) &&
        (!q ||
          [r.full_name, r.phone, r.wilaya, r.reference].some((v) => v.toLowerCase().includes(q))),
    );
  }, [rows, search, status, pkg, onlyDue, due]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: RegistrationStatus }) => {
      const { error } = await supabase
        .from("murshid_rifqa_registrations")
        .update({ status: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });

  const removeRegistration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("murshid_rifqa_registrations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmDelete(null);
      setOpenId(null);
      return queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  function exportCsv() {
    const header = [
      "reference", "created_at", "status", "full_name", "phone", "wilaya", "gender", "age_range",
      "package_type", "group_type", "accommodation", "has_companion", "companion_transport",
      "interest_profile", "notes",
    ] as const;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header.join(","), ...filtered.map((r) => header.map((h) => esc(r[h])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `rifqa-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const count = (s: RegistrationStatus) => rows.filter((r) => r.status === s).length;
  const selectCls = "h-10 rounded-md border border-input bg-background px-3 text-sm";

  if (!access || !can) return null;

  return (
    <>
    <StaffNav access={access} />
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-teal">{ar ? "لوحة الإدارة" : "Tableau de bord"}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
            {ar ? "تحديث" : "Actualiser"}
          </Button>
          {can.can_export_csv && (
            <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
              <Download />
              {ar ? "تصدير CSV" : "Exporter CSV"}
            </Button>
          )}
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-6">
        <Stat label={ar ? "إجمالي الطلبات" : "Total"} value={rows.length} />
        {registrationStatuses.map((s) => (
          <Stat key={s} label={statusLabels[s][lang]} value={count(s)} />
        ))}
        <Stat label={ar ? "متابعات مستحقة" : "Relances dues"} value={due.size} />
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder={ar ? "بحث بالاسم، الهاتف، الولاية…" : "Nom, téléphone, wilaya…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={ar ? "بحث" : "Recherche"}
        />
        <Button variant={onlyDue ? "default" : "outline"} aria-pressed={onlyDue} onClick={() => setOnlyDue((v) => !v)}>
          <PhoneCall />
          {ar ? `المتابعات المستحقة (${due.size})` : `Relances dues (${due.size})`}
        </Button>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label={ar ? "الحالة" : "Statut"}>
          <option value="all">{ar ? "كل الحالات" : "Tous les statuts"}</option>
          {registrationStatuses.map((s) => (
            <option key={s} value={s}>{statusLabels[s][lang]}</option>
          ))}
        </select>
        <select className={selectCls} value={pkg} onChange={(e) => setPkg(e.target.value as typeof pkg)} aria-label={ar ? "الباقة" : "Formule"}>
          <option value="all">{ar ? "كل الباقات" : "Toutes les formules"}</option>
          {(Object.keys(packageLabels) as PackageId[]).map((p) => (
            <option key={p} value={p}>{packageLabels[p][lang]}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-start text-muted-foreground">
            <tr>
              {[ar ? "التاريخ" : "Date", ar ? "الاسم" : "Nom", ar ? "الهاتف" : "Téléphone", ar ? "الولاية" : "Wilaya", ar ? "الباقة" : "Formule", ar ? "نوع التسجيل" : "Inscription", ar ? "الإقامة" : "Hébergement", ar ? "الملف" : "Profil", ar ? "الحالة" : "Statut", ar ? "المكالمة" : "Appel"].map((h) => (
                <th key={h} className="px-3 py-3 text-start font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                  {ar ? "لا توجد طلبات بعد." : "Aucune demande pour le moment."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <Fragment key={r.id}>
                <tr
                  className="cursor-pointer border-t border-border hover:bg-muted/50"
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                >
                  <td className="px-3 py-3 whitespace-nowrap" dir="ltr">{new Date(r.created_at).toLocaleString(ar ? "ar-DZ" : "fr-DZ")}</td>
                  <td className="px-3 py-3 font-semibold">{r.full_name}</td>
                  <td className="px-3 py-3" dir="ltr"><a href={`tel:${r.phone}`} onClick={(e) => e.stopPropagation()} className="text-primary underline">{r.phone}</a></td>
                  <td className="px-3 py-3">{r.wilaya}</td>
                  <td className="px-3 py-3">{pick(packageLabels, r.package_type, lang)}</td>
                  <td className="px-3 py-3">{pick(groupLabels, r.group_type as GroupId, lang)}</td>
                  <td className="px-3 py-3">{pick(accommodationLabels, r.accommodation, lang)}</td>
                  <td className="px-3 py-3">{profiles[r.interest_profile as ProfileId]?.title[lang] ?? r.interest_profile}</td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      className={selectCls}
                      value={r.status}
                      disabled={updateStatus.isPending || !can.can_update_status}
                      onChange={(e) => updateStatus.mutate({ id: r.id, value: e.target.value as RegistrationStatus })}
                      aria-label={ar ? `حالة ${r.full_name}` : `Statut de ${r.full_name}`}
                    >
                      {registrationStatuses.map((s) => (
                        <option key={s} value={s}>{statusLabels[s][lang]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Button asChild size="sm" variant={due.has(r.id) ? "default" : "outline"}>
                      <Link to="/call/$id" params={{ id: r.id }}>
                        <PhoneCall />
                        {due.has(r.id) ? (ar ? "متابعة الآن" : "Relancer") : ar ? "مساعد المكالمة" : "Appeler"}
                      </Link>
                    </Button>
                    {lastCall.get(r.id) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {outcomes[lastCall.get(r.id)!.outcome as OutcomeId]?.title[lang]}
                      </p>
                    )}
                  </td>
                </tr>
                {openId === r.id && (
                  <tr className="bg-muted/30">
                    <td colSpan={10} className="px-4 py-4">
                      <dl className="grid gap-3 md:grid-cols-2">
                        <Detail label={ar ? "المرجع" : "Référence"} value={r.reference} />
                        <Detail label={ar ? "الجنس / العمر" : "Sexe / âge"} value={`${r.gender || "—"} / ${r.age_range || "—"}`} />
                        <Detail label={ar ? "مرافق" : "Accompagnant"} value={r.has_companion ? (ar ? "نعم" : "Oui") + (r.companion_transport ? (ar ? " + نقل" : " + transport") : "") : ar ? "لا" : "Non"} />
                        <Detail label={ar ? "اللغة" : "Langue"} value={r.preferred_language} />
                        {(["motivation", "previous_group_experience", "professional_ambition", "training_priorities"] as AnswerKey[]).map((k) => (
                          <Detail key={k} label={k.replace(/_/g, " ")} value={answerLabel(k, r[k as keyof typeof r] as string[], lang) || "—"} />
                        ))}
                        <Detail label={ar ? "ملاحظات" : "Notes"} value={r.notes || "—"} />
                      </dl>
                      {can.can_delete_registrations && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {confirmDelete === r.id ? (
                            <>
                              <span className="text-sm font-semibold text-destructive">
                                {ar ? "تأكيد حذف هذا الطلب نهائيًا؟" : "Supprimer définitivement ?"}
                              </span>
                              <Button size="sm" variant="destructive" disabled={removeRegistration.isPending} onClick={() => removeRegistration.mutate(r.id)}>
                                {ar ? "نعم، احذف" : "Oui, supprimer"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>
                                {ar ? "إلغاء" : "Annuler"}
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(r.id)}>
                              <Trash2 />
                              {ar ? "حذف الطلب" : "Supprimer la demande"}
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {updateStatus.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {ar ? "تعذر تحديث الحالة، حاول مجددًا." : "Échec de la mise à jour du statut."}
        </p>
      )}
      {removeRegistration.isError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {ar ? "تعذر حذف الطلب." : "Échec de la suppression."}
        </p>
      )}
    </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-teal">{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
