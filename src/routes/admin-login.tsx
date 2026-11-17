import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { fetchStaffAccess, loginToEmail } from "@/lib/staff";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    queryClient.removeQueries({ queryKey: ["admin"] });
    const access = await fetchStaffAccess();
    if (!access || (!access.isAdmin && !access.assistant?.is_active)) {
      await supabase.auth.signOut();
      setError(
        access?.assistant
          ? ar ? "حسابك معطّل حاليًا، تواصل مع المدير." : "Votre compte est désactivé."
          : ar ? "هذا الحساب لا يملك صلاحية الدخول." : "Ce compte n’a pas d’accès.",
      );
      setBusy(false);
      return;
    }
    queryClient.setQueryData(["admin", "access"], access);
    await navigate({ to: access.can.can_view_registrations ? "/admin" : "/my-stats" });
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Lock className="mb-4 h-10 w-10 text-primary" />
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
