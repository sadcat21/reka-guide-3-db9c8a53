import { registrationSchema, getInterestProfile, type Draft } from "@/lib/journey";
import type { Lang } from "@/i18n/translations";
export async function submitRegistration(data: Draft & { preferred_language: Lang }) {
  const valid = registrationSchema.parse(data);
  const { answers, ...fields } = valid;
  const record = {
    ...fields,
    ...answers,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    interest_profile: getInterestProfile(data.answers),
    registration_status: "local_demo" as const,
    reference: `RIFQA-${Date.now().toString(36).toUpperCase()}`,
  };
  // TODO: Replace local demo handling with a validated server insertion when remote registration is enabled.
  window.localStorage.setItem("rifqa-last-registration", JSON.stringify(record));
  return record;
}
export type RegistrationRecord = Awaited<ReturnType<typeof submitRegistration>>;
export function readLastRegistration(): RegistrationRecord | null {
  try {
    const text = window.localStorage.getItem("rifqa-last-registration");
    if (!text) return null;
    const data = JSON.parse(text);
    if (
      typeof data.id !== "string" ||
      typeof data.reference !== "string" ||
      !["guide", "leader", "digital", "explorer"].includes(data.interest_profile)
    )
      return null;
    const parsed = registrationSchema.safeParse({ ...data, answers: data });
    if (!parsed.success) return null;
    return data as RegistrationRecord;
  } catch {
    return null;
  }
}
