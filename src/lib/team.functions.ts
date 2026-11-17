import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ASSISTANT_EMAIL_DOMAIN, USERNAME_PATTERN } from "@/lib/staff";

const password = z.string().min(8).max(72);
const perms = {
  can_view_registrations: z.boolean(),
  can_update_status: z.boolean(),
  can_export_csv: z.boolean(),
  can_delete_registrations: z.boolean(),
};

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string };
async function assertAdmin(context: Ctx) {
  // Reads the caller's own role row (allowed by RLS), so no callable role function is exposed.
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const createAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(2).max(80),
        username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN),
        password,
        ...perms,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin
      .from("rifqa_assistants")
      .select("user_id")
      .eq("username", data.username)
      .maybeSingle();
    if (taken) return { ok: false as const, error: "username_taken" };
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: `${data.username}@${ASSISTANT_EMAIL_DOMAIN}`,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name },
    });
    if (error || !created.user) {
      console.error("createAssistant", error);
      return { ok: false as const, error: error?.message?.includes("already") ? "username_taken" : "failed" };
    }
    const { password: _p, ...row } = data;
    const { error: insertError } = await supabaseAdmin
      .from("rifqa_assistants")
      .insert({ ...row, user_id: created.user.id, is_active: true });
    if (insertError) {
      console.error("createAssistant insert", insertError);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, error: "failed" };
    }
    return { ok: true as const };
  });

export const resetAssistantPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid(), password }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("rifqa_assistants")
      .select("user_id")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (!row) return { ok: false as const };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) console.error("resetAssistantPassword", error);
    return { ok: !error };
  });

export const deleteAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("rifqa_assistants")
      .select("user_id")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (!row) return { ok: false as const };
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) console.error("deleteAssistant", error);
    return { ok: !error };
  });
