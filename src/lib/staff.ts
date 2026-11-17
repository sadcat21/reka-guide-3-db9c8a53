import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AssistantRow = Database["public"]["Tables"]["rifqa_assistants"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["rifqa_registration_activity"]["Row"];

export const permissionKeys = [
  "can_view_registrations",
  "can_update_status",
  "can_export_csv",
  "can_delete_registrations",
] as const;
export type PermissionKey = (typeof permissionKeys)[number];
export type Permissions = Record<PermissionKey, boolean>;

export const permissionLabels: Record<PermissionKey, { ar: string; fr: string }> = {
  can_view_registrations: { ar: "عرض المسجلين وتفاصيلهم", fr: "Voir les inscriptions" },
  can_update_status: { ar: "تحديث حالة الطلب", fr: "Modifier le statut" },
  can_export_csv: { ar: "تصدير البيانات (CSV)", fr: "Exporter (CSV)" },
  can_delete_registrations: { ar: "حذف الطلبات", fr: "Supprimer des demandes" },
};

/** Assistants sign in with a username; the account behind it uses this internal address. */
export const ASSISTANT_EMAIL_DOMAIN = "assistants.refka-guide.app";
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

/** Turns what was typed in the sign-in box into the account e-mail. */
export function loginToEmail(value: string) {
  const v = value.trim();
  return v.includes("@") ? v : `${normalizeUsername(v)}@${ASSISTANT_EMAIL_DOMAIN}`;
}

export type StaffAccess = {
  userId: string;
  isAdmin: boolean;
  assistant: AssistantRow | null;
  /** Effective permissions: admins have all; disabled assistants have none. */
  can: Permissions;
};

export function effectivePermissions(isAdmin: boolean, a: AssistantRow | null): Permissions {
  const active = !!a?.is_active;
  const view = isAdmin || (active && !!a?.can_view_registrations);
  return {
    can_view_registrations: view,
    can_update_status: isAdmin || (view && !!a?.can_update_status),
    can_export_csv: isAdmin || (view && !!a?.can_export_csv),
    can_delete_registrations: isAdmin || (view && !!a?.can_delete_registrations),
  };
}

export async function fetchStaffAccess(): Promise<StaffAccess | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const [{ data: role }, { data: assistant }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    supabase.from("rifqa_assistants").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const isAdmin = !!role;
  return { userId: user.id, isAdmin, assistant, can: effectivePermissions(isAdmin, assistant) };
}

export const staffAccessQuery = queryOptions({
  queryKey: ["admin", "access"],
  queryFn: fetchStaffAccess,
  staleTime: 30_000,
});

export const assistantsQuery = queryOptions({
  queryKey: ["admin", "assistants"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("rifqa_assistants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const activityQuery = (actorId?: string) =>
  queryOptions({
    queryKey: ["admin", "activity", actorId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("rifqa_registration_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (actorId) q = q.eq("actor_id", actorId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

const DAY = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export type StaffStats = {
  total: number;
  contacted: number;
  confirmed: number;
  cancelled: number;
  deleted: number;
  today: number;
  last7: number;
  activeDays: number;
  streak: number;
  daily: { day: string; count: number }[];
};

/** Summarises one person's activity log. `now` is injectable for tests. */
export function computeStats(rows: Pick<ActivityRow, "action" | "to_status" | "created_at">[], now = new Date()): StaffStats {
  const todayKey = dayKey(now);
  const perDay = new Map<string, number>();
  let contacted = 0, confirmed = 0, cancelled = 0, deleted = 0, last7 = 0;
  for (const r of rows) {
    const d = new Date(r.created_at);
    const k = dayKey(d);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    if (now.getTime() - d.getTime() < 7 * DAY) last7++;
    if (r.action === "deleted") deleted++;
    else if (r.to_status === "contacted") contacted++;
    else if (r.to_status === "confirmed") confirmed++;
    else if (r.to_status === "cancelled") cancelled++;
  }
  let streak = 0;
  for (let i = 0; perDay.has(dayKey(new Date(now.getTime() - i * DAY))); i++) streak++;
  const daily = Array.from({ length: 14 }, (_, i) => {
    const day = dayKey(new Date(now.getTime() - (13 - i) * DAY));
    return { day, count: perDay.get(day) ?? 0 };
  });
  return {
    total: rows.length,
    contacted,
    confirmed,
    cancelled,
    deleted,
    today: perDay.get(todayKey) ?? 0,
    last7,
    activeDays: perDay.size,
    streak,
    daily,
  };
}

export type Badge = { id: string; ar: string; fr: string; earned: boolean; progress: number; goal: number };

export function computeBadges(s: StaffStats): Badge[] {
  const b = (id: string, ar: string, fr: string, value: number, goal: number): Badge => ({
    id, ar, fr, goal, progress: Math.min(value, goal), earned: value >= goal,
  });
  return [
    b("first-step", "الخطوة الأولى", "Premier pas", s.total, 1),
    b("first-contact", "أول تواصل", "Premier contact", s.contacted, 1),
    b("contact-10", "10 تواصلات", "10 contacts", s.contacted, 10),
    b("contact-50", "50 تواصلًا", "50 contacts", s.contacted, 50),
    b("first-confirm", "أول تأكيد", "Première confirmation", s.confirmed, 1),
    b("confirm-10", "10 تأكيدات", "10 confirmations", s.confirmed, 10),
    b("confirm-25", "25 تأكيدًا", "25 confirmations", s.confirmed, 25),
    b("streak-3", "3 أيام متتالية", "3 jours d’affilée", s.streak, 3),
    b("streak-7", "أسبوع متواصل", "7 jours d’affilée", s.streak, 7),
    b("century", "100 إنجاز", "100 actions", s.total, 100),
  ];
}
