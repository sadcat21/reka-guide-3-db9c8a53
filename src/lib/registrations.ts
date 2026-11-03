// Data layer for registration requests. Currently stores locally on the device;
// swap the body of submitRegistration for a backend call later without touching the UI.
import { z } from "zod";

export const packageIds = ["silver", "gold", "diamond"] as const;
export type PackageId = (typeof packageIds)[number];

export const pricing: Record<PackageId, { individual: number; pair: number | null }> = {
  silver: { individual: 45000, pair: null },
  gold: { individual: 48000, pair: null },
  diamond: { individual: 53000, pair: null },
};

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{8,16}$/),
  email: z.union([z.literal(""), z.string().trim().email().max(255)]),
  city: z.string().trim().min(2).max(80),
  pkg: z.enum(packageIds),
  type: z.enum(["individual", "pair"]),
  notes: z.string().trim().max(1000),
});
export type RegistrationInput = z.infer<typeof registrationSchema>;

export async function submitRegistration(input: RegistrationInput) {
  const record = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const key = "rifqa-registrations";
  const list = JSON.parse(window.localStorage.getItem(key) || "[]");
  list.push(record);
  window.localStorage.setItem(key, JSON.stringify(list));
  return record;
}
