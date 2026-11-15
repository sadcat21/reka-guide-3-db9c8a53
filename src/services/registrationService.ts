import { supabase } from "@/integrations/supabase/client";
import { registrationSchema, getInterestProfile, type Draft } from "@/lib/journey";
import type { Lang } from "@/i18n/translations";

const LAST_KEY = "rifqa-last-registration";

export async function submitRegistration(data: Draft & { preferred_language: Lang }) {
  const valid = registrationSchema.parse(data);
  const { answers, consent: _consent, ...fields } = valid;
  const interest_profile = getInterestProfile(data.answers);
  const reference = `RIFQA-${Date.now().toString(36).toUpperCase()}`;
  const { error } = await supabase.from("murshid_rifqa_registrations").insert({
    full_name: fields.full_name,
    phone: fields.phone,
    wilaya: fields.wilaya,
    gender: fields.gender,
    age_range: fields.age_range,
    group_type: fields.group_type,
    package_type: fields.package_type,
    accommodation: fields.accommodation,
    has_companion: fields.has_companion,
    companion_transport: fields.companion_transport,
    notes: fields.notes,
    preferred_language: fields.preferred_language,
    interest_profile,
    reference,
    status: "new",
    motivation: answers["motivation"] ?? [],
    previous_group_experience: answers["previous_group_experience"] ?? [],
    professional_ambition: answers["professional_ambition"] ?? [],
    training_priorities: answers["training_priorities"] ?? [],
    discovery_group_type: answers["group_type"] ?? [],
  });
  if (error) throw error;
  const record = {
    ...fields,
    ...answers,
    created_at: new Date().toISOString(),
    interest_profile,
    reference,
  };
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(record));
  } catch {
    // The request was sent; the on-device summary is optional.
  }
  return record;
}
export type RegistrationRecord = Awaited<ReturnType<typeof submitRegistration>>;
export function readLastRegistration(): RegistrationRecord | null {
  try {
    const text = window.localStorage.getItem(LAST_KEY);
    if (!text) return null;
    const data = JSON.parse(text);
    if (
      typeof data.reference !== "string" ||
      typeof data.full_name !== "string" ||
      !["guide", "leader", "digital", "explorer"].includes(data.interest_profile) ||
      !["silver", "gold", "diamond"].includes(data.package_type)
    )
      return null;
    return data as RegistrationRecord;
  } catch {
    return null;
  }
}
