import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const registrationStatuses = ["new", "contacted", "confirmed", "cancelled"] as const;
export type RegistrationStatus = (typeof registrationStatuses)[number];

export async function currentUserIsAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export const adminRegistrationsQuery = queryOptions({
  queryKey: ["admin", "registrations"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("murshid_rifqa_registrations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

/** Counts clicks that happen within `windowMs` of each other; returns true on the Nth. */
export function createTapCounter(target: number, windowMs: number, now: () => number = Date.now) {
  let count = 0;
  let last = 0;
  return () => {
    const t = now();
    count = t - last <= windowMs ? count + 1 : 1;
    last = t;
    if (count >= target) {
      count = 0;
      return true;
    }
    return false;
  };
}
