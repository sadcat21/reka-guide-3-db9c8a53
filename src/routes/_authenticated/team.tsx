import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent } from "react";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  activityQuery,
  assistantsQuery,
  computeStats,
  normalizeUsername,
  permissionKeys,
  permissionLabels,
  staffAccessQuery,
  USERNAME_PATTERN,
  type AssistantRow,
  type PermissionKey,
  type Permissions,
} from "@/lib/staff";
import { createAssistant, deleteAssistant, resetAssistantPassword } from "@/lib/team.functions";
import { StaffNav } from "@/components/StaffNav";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "فريق العمل | الرفقة الطيبة" },
      { name: "description", content: "إدارة مساعدي لوحة التحكم وصلاحياتهم." },
      { property: "og:title", content: "فريق العمل | الرفقة الطيبة" },
      { property: "og:description", content: "Gestion de l’équipe Al-Rifqa Al-Tayyiba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const access = await context.queryClient.ensureQueryData(staffAccessQuery);
    if (!access?.isAdmin) throw redirect({ to: "/my-stats" });
  },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(assistantsQuery),
      context.queryClient.ensureQueryData(activityQuery()),
    ]),
  component: TeamPage,
});

const emptyPerms: Permissions = {
  can_view_registrations: true,
  can_update_status: false,
  can_export_csv: false,
  can_delete_registrations: false,
};

function TeamPage() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const queryClient = useQueryClient();
  const { data: access } = useSuspenseQuery(staffAccessQuery);
  const { data: assistants } = useSuspenseQuery(assistantsQuery);
  const { data: activity } = useSuspenseQuery(activityQuery());
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<AssistantRow | null>(null);
  const [deleteFor, setDeleteFor] = useState<AssistantRow | null>(null);
  const [message, setMessage] = useState("");
  const del = useServerFn(deleteAssistant);

  const statsByUser = useMemo(() => {
    const m = new Map<string, ReturnType<typeof computeStats>>();
    for (const a of assistants) m.set(a.user_id, computeStats(activity.filter((r) => r.actor_id === a.user_id)));
    return m;
  }, [assistants, activity]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AssistantRow> }) => {
      const { error } = await supabase.from("rifqa_assistants").update(patch).eq("user_id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assistantsQuery.queryKey }),
    onError: () => setMessage(ar ? "تعذر حفظ التغيير." : "Échec de l’enregistrement."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await del({ data: { user_id: id } });
      if (!res.ok) throw new Error("failed");
    },
    onSuccess: () => {
      setDeleteFor(null);
      setMessage(ar ? "تم حذف حساب المساعد." : "Compte supprimé.");
      return queryClient.invalidateQueries({ queryKey: assistantsQuery.queryKey });
    },
    onError: () => setMessage(ar ? "تعذر حذف الحساب." : "Échec de la suppression."),
  });

  if (!access) return null;

  return (
    <>
      <StaffNav access={access} />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-teal">{ar ? "فريق العمل والمساعدون" : "Équipe et assistants"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ar
                ? "أضف مساعدين، سلّمهم اسم مستخدم وكلمة مرور، وفعّل لكل منهم الصلاحيات التي تريدها."
                : "Ajoutez des assistants et choisissez les droits de chacun."}
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <UserPlus />
            {ar ? "إضافة مساعد جديد" : "Nouvel assistant"}
          </Button>
        </div>

        {message && (
          <p role="status" className="mt-4 text-sm font-medium text-primary">
            {message}
          </p>
        )}

        {assistants.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {ar ? "لا يوجد مساعدون بعد." : "Aucun assistant pour le moment."}
          </p>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {assistants.map((a) => {
              const s = statsByUser.get(a.user_id);
              return (
                <article key={a.user_id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">{a.display_name}</h2>
                      <p className="text-sm text-muted-foreground" dir="ltr">
                        @{a.username}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <Switch
                        checked={a.is_active}
                        disabled={update.isPending}
                        onCheckedChange={(v) => update.mutate({ id: a.user_id, patch: { is_active: v } })}
                      />
                      {a.is_active ? (ar ? "نشط" : "Actif") : ar ? "معطّل" : "Désactivé"}
                    </label>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label={ar ? "الإنجازات" : "Actions"} value={s?.total ?? 0} />
                    <MiniStat label={ar ? "تواصل" : "Contacts"} value={s?.contacted ?? 0} />
                    <MiniStat label={ar ? "تأكيد" : "Confirmés"} value={s?.confirmed ?? 0} />
                  </dl>

                  <fieldset className="mt-4 space-y-2" disabled={!a.is_active}>
                    <legend className="mb-1 text-sm font-semibold text-muted-foreground">
                      {ar ? "الصلاحيات" : "Droits"}
                    </legend>
                    {permissionKeys.map((k) => (
                      <label key={k} className="flex items-center justify-between gap-3 text-sm">
                        <span className={a.is_active ? "" : "text-muted-foreground"}>{permissionLabels[k][lang]}</span>
                        <Switch
                          checked={a[k]}
                          disabled={update.isPending || !a.is_active || (k !== "can_view_registrations" && !a.can_view_registrations)}
                          onCheckedChange={(v) => update.mutate({ id: a.user_id, patch: { [k]: v } })}
                        />
                      </label>
                    ))}
                  </fieldset>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button variant="outline" size="sm" onClick={() => setResetFor(a)}>
                      <KeyRound />
                      {ar ? "كلمة مرور جديدة" : "Nouveau mot de passe"}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteFor(a)}>
                      <Trash2 />
                      {ar ? "حذف الحساب" : "Supprimer"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <AddAssistantDialog
        open={adding}
        onClose={() => setAdding(false)}
        onDone={(name) => {
          setAdding(false);
          setMessage(ar ? `تمت إضافة ${name}. سلّمه اسم المستخدم وكلمة المرور.` : `${name} a été ajouté.`);
          void queryClient.invalidateQueries({ queryKey: assistantsQuery.queryKey });
        }}
      />
      <ResetPasswordDialog
        assistant={resetFor}
        onClose={() => setResetFor(null)}
        onDone={() => {
          setResetFor(null);
          setMessage(ar ? "تم تغيير كلمة المرور." : "Mot de passe modifié.");
        }}
      />
      <Dialog open={!!deleteFor} onOpenChange={(o) => !o && setDeleteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {ar ? `حذف حساب ${deleteFor?.display_name}؟` : `Supprimer ${deleteFor?.display_name} ?`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {ar
              ? "لن يتمكن من الدخول مجددًا. لتعطيله مؤقتًا استخدم مفتاح «نشط» بدلًا من الحذف."
              : "Il ne pourra plus se connecter. Pour une pause, désactivez plutôt le compte."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFor(null)}>
              {ar ? "إلغاء" : "Annuler"}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteFor && remove.mutate(deleteFor.user_id)}
            >
              {ar ? "حذف" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold text-teal">{value}</dd>
    </div>
  );
}

function AddAssistantDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (name: string) => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const create = useServerFn(createAssistant);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Permissions>(emptyPerms);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setName(""); setUsername(""); setPassword(""); setPerms(emptyPerms); setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const u = normalizeUsername(username);
    if (!USERNAME_PATTERN.test(u)) {
      setError(ar ? "اسم المستخدم: 3 إلى 30 حرفًا لاتينيًا صغيرًا أو أرقامًا أو . _ -" : "Identifiant : 3 à 30 caractères (a-z, 0-9, . _ -).");
      return;
    }
    if (password.length < 8) {
      setError(ar ? "كلمة المرور 8 أحرف على الأقل." : "Mot de passe : 8 caractères minimum.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await create({ data: { display_name: name.trim(), username: u, password, ...perms } });
      if (!res.ok) {
        setError(res.error === "username_taken"
          ? ar ? "اسم المستخدم مستعمل، اختر اسمًا آخر." : "Identifiant déjà utilisé."
          : ar ? "تعذر إنشاء الحساب." : "Échec de la création.");
        return;
      }
      const n = name.trim();
      reset();
      onDone(n);
    } catch {
      setError(ar ? "تعذر إنشاء الحساب." : "Échec de la création.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ar ? "إضافة مساعد جديد" : "Nouvel assistant"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="a-name">{ar ? "اسم المساعد" : "Nom"}</Label>
            <Input id="a-name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-user">{ar ? "اسم المستخدم (للدخول)" : "Identifiant"}</Label>
            <Input id="a-user" dir="ltr" required autoComplete="off" maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ahmed.b" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-pass">{ar ? "كلمة المرور" : "Mot de passe"}</Label>
            <Input id="a-pass" dir="ltr" required autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold">{ar ? "الصلاحيات" : "Droits"}</legend>
            {permissionKeys.map((k: PermissionKey) => (
              <label key={k} className="flex items-center justify-between gap-3 text-sm">
                {permissionLabels[k][lang]}
                <Switch
                  checked={perms[k]}
                  disabled={k !== "can_view_registrations" && !perms.can_view_registrations}
                  onCheckedChange={(v) => setPerms((p) => ({ ...p, [k]: v }))}
                />
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? (ar ? "جارٍ الإنشاء…" : "Création…") : ar ? "إنشاء الحساب" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ assistant, onClose, onDone }: { assistant: AssistantRow | null; onClose: () => void; onDone: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const resetFn = useServerFn(resetAssistantPassword);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!assistant) return;
    if (password.length < 8) {
      setError(ar ? "كلمة المرور 8 أحرف على الأقل." : "8 caractères minimum.");
      return;
    }
    setBusy(true);
    try {
      const res = await resetFn({ data: { user_id: assistant.user_id, password } });
      if (!res.ok) throw new Error();
      setPassword(""); setError("");
      onDone();
    } catch {
      setError(ar ? "تعذر تغيير كلمة المرور." : "Échec.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!assistant} onOpenChange={(o) => { if (!o) { setPassword(""); setError(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {ar ? `كلمة مرور جديدة لـ ${assistant?.display_name}` : `Nouveau mot de passe — ${assistant?.display_name}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input dir="ltr" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(e) => setPassword(e.target.value)} aria-label={ar ? "كلمة المرور" : "Mot de passe"} />
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={busy}>{ar ? "حفظ" : "Enregistrer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
