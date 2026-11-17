import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lock, LockOpen, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { fetchStaffAccess, loginToEmail } from "@/lib/staff";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loadAccounts,
  removeAccount,
  saveAccounts,
  setAccountToken,
  upsertAccount,
  type SavedAccount,
} from "@/lib/saved-accounts";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دخول الإدارة | الرفقة الطيبة" },
      { name: "description", content: "صفحة دخول فريق إدارة برنامج الرفقة الطيبة." },
      { property: "og:title", content: "دخول الإدارة | الرفقة الطيبة" },
      { property: "og:description", content: "Espace administration Al-Rifqa Al-Tayyiba." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const { lang } = useLang();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [showSaved, setShowSaved] = useState(false);
  const [saved, setSaved] = useState<SavedAccount[]>([]);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => setSaved(loadAccounts()), []);

  function persist(list: SavedAccount[]) {
    saveAccounts(list);
    setSaved(list);
  }

  /** Checks the signed-in account has staff access, remembers it, and opens its page. */
  async function finishSignIn(login: string): Promise<boolean> {
    queryClient.removeQueries({ queryKey: ["admin"] });
    const access = await fetchStaffAccess();
    if (!access || (!access.isAdmin && !access.assistant?.is_active)) {
      await supabase.auth.signOut({ scope: "local" });
      if (access) persist(removeAccount(loadAccounts(), access.userId));
      setError(
        access?.assistant
          ? ar ? "حسابك معطّل حاليًا، تواصل مع المدير." : "Votre compte est désactivé."
          : ar ? "هذا الحساب لا يملك صلاحية الدخول." : "Ce compte n’a pas d’accès.",
      );
      return false;
    }
    const { data } = await supabase.auth.getSession();
    persist(
      upsertAccount(loadAccounts(), {
        userId: access.userId,
        login,
        label: access.isAdmin ? (ar ? "المدير" : "Administrateur") : access.assistant?.display_name || login,
        role: access.isAdmin ? "admin" : "assistant",
        refreshToken: data.session?.refresh_token ?? null,
      }),
    );
    queryClient.setQueryData(["admin", "access"], access);
    await navigate({ to: access.can.can_view_registrations ? "/admin" : "/my-stats" });
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginToEmail(email),
      password,
    });
    if (signInError) {
      setError(ar ? "اسم المستخدم أو كلمة المرور غير صحيحة." : "Identifiant ou mot de passe incorrect.");
      setBusy(false);
      return;
    }
    if (!(await finishSignIn(email.trim()))) setBusy(false);
  }

  async function quickSignIn(acc: SavedAccount) {
    if (busy) return;
    setBusy(true);
    setError("");
    if (acc.refreshToken) {
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: acc.refreshToken,
      });
      if (!refreshError && data.session) {
        if (await finishSignIn(acc.login)) return;
        setBusy(false);
        return;
      }
    }
    // Session ended (signed out or expired): fill the username and ask for the password once.
    persist(setAccountToken(loadAccounts(), acc.userId, null));
    setEmail(acc.login);
    setPassword("");
    setShowSaved(false);
    setError(ar ? "انتهت جلسة هذا الحساب، أدخل كلمة المرور مرة واحدة." : "Session expirée : saisissez le mot de passe.");
    setBusy(false);
    setTimeout(() => passwordRef.current?.focus(), 0);
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <button
          type="button"
          onClick={() => setShowSaved((v) => !v)}
          aria-label={ar ? "الحسابات المحفوظة على هذا الجهاز" : "Comptes enregistrés sur cet appareil"}
          aria-expanded={showSaved}
          className="mb-4 rounded-lg text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showSaved ? <LockOpen className="h-10 w-10" /> : <Lock className="h-10 w-10" />}
        </button>
        {showSaved && (
          <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold">{ar ? "دخول سريع" : "Connexion rapide"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ar
                ? "تظهر هنا الحسابات التي سجّلت الدخول سابقًا على هذا الجهاز."
                : "Les comptes déjà connectés sur cet appareil apparaissent ici."}
            </p>
            {saved.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {ar ? "لا توجد حسابات محفوظة بعد." : "Aucun compte enregistré."}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {saved.map((acc) => (
                  <li key={acc.userId} className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto flex-1 justify-start gap-3 py-2 text-start"
                      disabled={busy}
                      onClick={() => quickSignIn(acc)}
                    >
                      <UserRound className="shrink-0" />
                      <span className="flex flex-col">
                        <span className="font-semibold">{acc.label}</span>
                        <span className="text-xs font-normal text-muted-foreground" dir="ltr">
                          {acc.login}
                        </span>
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ar ? `إزالة ${acc.label}` : `Retirer ${acc.label}`}
                      onClick={() => persist(removeAccount(loadAccounts(), acc.userId))}
                    >
                      <X />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <h1 className="text-2xl font-bold text-teal">{ar ? "دخول الإدارة والفريق" : "Connexion équipe"}</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">{ar ? "اسم المستخدم أو البريد الإلكتروني" : "Identifiant ou e-mail"}</Label>
            <Input
              id="admin-email"
              type="text"
              autoCapitalize="none"
              dir="ltr"
              autoComplete="username"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">{ar ? "كلمة المرور" : "Mot de passe"}</Label>
            <Input
              id="admin-password"
              ref={passwordRef}
              type="password"
              dir="ltr"
              autoComplete="current-password"
              required
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy ? (ar ? "جارٍ الدخول…" : "Connexion…") : ar ? "دخول" : "Se connecter"}
          </Button>
        </form>
      </div>
    </section>
  );
}
