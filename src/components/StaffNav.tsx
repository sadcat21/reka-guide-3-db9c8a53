import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, ClipboardList, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { StaffAccess } from "@/lib/staff";
import { useLang } from "@/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";

export function StaffNav({ access }: { access: StaffAccess }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const linkCls =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground";
  const active = { className: "bg-muted text-foreground" };

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ["admin"] });
    await navigate({ to: "/" });
  }

  return (
    <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <div className="flex flex-wrap gap-1">
        {access.can.can_view_registrations && (
          <Link to="/admin" className={linkCls} activeProps={active}>
            <ClipboardList className="h-4 w-4" />
            {ar ? "المسجلون" : "Inscriptions"}
          </Link>
        )}
        {access.isAdmin && (
          <Link to="/team" className={linkCls} activeProps={active}>
            <Users className="h-4 w-4" />
            {ar ? "فريق العمل والمساعدون" : "Équipe"}
          </Link>
        )}
        <Link to="/my-stats" className={linkCls} activeProps={active}>
          <BarChart3 className="h-4 w-4" />
          {ar ? "إنجازاتي وإحصائياتي" : "Mes statistiques"}
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {access.isAdmin ? (ar ? "المدير" : "Administrateur") : access.assistant?.display_name}
        </span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut />
          {ar ? "خروج" : "Déconnexion"}
        </Button>
      </div>
    </nav>
  );
}
