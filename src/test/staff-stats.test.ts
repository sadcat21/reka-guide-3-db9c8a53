import { describe, expect, it } from "vitest";
import { computeBadges, computeStats, effectivePermissions, loginToEmail, type AssistantRow } from "@/lib/staff";

const now = new Date("2026-11-17T12:00:00Z");
const at = (daysAgo: number, to_status: string | null, action = "status_change") => ({
  action, to_status, created_at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
});

describe("assistant statistics", () => {
  it("counts contacts, confirmations and today's work", () => {
    const s = computeStats([at(0, "contacted"), at(0, "confirmed"), at(2, "contacted"), at(10, "cancelled")], now);
    expect([s.total, s.contacted, s.confirmed, s.cancelled, s.today, s.last7]).toEqual([4, 2, 1, 1, 2, 3]);
  });
  it("counts consecutive active days ending today", () => {
    expect(computeStats([at(0, "contacted"), at(1, "contacted"), at(2, "contacted"), at(4, "contacted")], now).streak).toBe(3);
  });
  it("earns the first confirmation badge after one confirmation", () => {
    const badges = computeBadges(computeStats([at(0, "confirmed")], now));
    expect(badges.find((b) => b.id === "first-confirm")?.earned).toBe(true);
    expect(badges.find((b) => b.id === "confirm-10")?.earned).toBe(false);
  });
});

describe("assistant permissions", () => {
  const base: AssistantRow = {
    user_id: "u", display_name: "Ali", username: "ali", is_active: true,
    can_view_registrations: true, can_update_status: true, can_export_csv: false,
    can_delete_registrations: false, created_at: "", updated_at: "",
  };
  it("gives a disabled assistant no access", () => {
    expect(Object.values(effectivePermissions(false, { ...base, is_active: false }))).toEqual([false, false, false, false]);
  });
  it("keeps only the permissions the admin switched on", () => {
    expect(effectivePermissions(false, base)).toEqual({
      can_view_registrations: true, can_update_status: true, can_export_csv: false, can_delete_registrations: false,
    });
  });
  it("signs assistants in by username", () => {
    expect(loginToEmail(" Ali ")).toBe("ali@assistants.refka-guide.app");
    expect(loginToEmail("rifqa.admin.panel@gmail.com")).toBe("rifqa.admin.panel@gmail.com");
  });
});
