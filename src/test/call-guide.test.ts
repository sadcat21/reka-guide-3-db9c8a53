import { describe, expect, it } from "vitest";
import { dueFollowUps, nextFollowUp, scorePersona, toWhatsAppNumber, whatsappTemplate, type CallLogRow } from "@/lib/call-guide";
import { computeStats } from "@/lib/staff";

const now = new Date("2026-11-17T12:00:00Z");
const h = (d: Date | null) => (d ? (d.getTime() - now.getTime()) / 3_600_000 : null);

describe("follow-up cadence from the call guide", () => {
  it("calls a hot lead back after 24 hours", () => expect(h(nextFollowUp("hot", now))).toBe(24));
  it("follows a hesitant caller up after 3 days", () => expect(h(nextFollowUp("hesitant", now))).toBe(72));
  it("confirms receipt with a confirmed registrant within 24 hours", () => expect(h(nextFollowUp("confirmed", now))).toBe(24));
  it("stops calling after 3 unanswered attempts", () => {
    expect(nextFollowUp("no_answer", now, 2)).not.toBeNull();
    expect(nextFollowUp("no_answer", now, 3)).toBeNull();
  });
  it("schedules nothing for someone who declined", () => expect(nextFollowUp("declined", now)).toBeNull());
});

describe("live personality analysis", () => {
  it("suggests the personality with the most observed signals", () => {
    expect(scorePersona(["skeptic-0", "skeptic-1", "neutral-0"]).persona).toBe("skeptic");
  });
  it("makes no suggestion when signals are tied", () => {
    expect(scorePersona(["skeptic-0", "neutral-0"]).persona).toBeNull();
  });
});

describe("due follow-ups", () => {
  const log = (registration_id: string, follow_up_at: string | null, created_at: string): CallLogRow => ({
    id: Math.random().toString(), registration_id, actor_id: "a", persona: null, outcome: "hot", notes: "", follow_up_at, created_at,
  });
  it("uses only the latest call of each registrant", () => {
    const due = dueFollowUps([
      log("A", "2026-11-17T11:00:00Z", "2026-11-16T11:00:00Z"),
      log("B", "2026-11-18T11:00:00Z", "2026-11-17T10:00:00Z"),
      log("B", "2026-11-17T09:00:00Z", "2026-11-15T10:00:00Z"),
    ], now);
    expect([...due]).toEqual(["A"]);
  });
});

describe("WhatsApp", () => {
  it("turns an Algerian local number into an international one", () => {
    expect(toWhatsAppNumber("0555 12 34 56")).toBe("213555123456");
    expect(toWhatsAppNumber("+213 555123456")).toBe("213555123456");
  });
  it("quotes the official per-person price of the chosen package", () => {
    expect(whatsappTemplate("serious", { full_name: "Ali B", package_type: "gold", group_type: "pair" })).toContain("47,000");
  });
});

describe("staff statistics", () => {
  it("counts logged calls without counting them as confirmations", () => {
    const s = computeStats([{ action: "call_logged", to_status: null, created_at: now.toISOString() }], now);
    expect([s.calls, s.confirmed, s.total]).toEqual([1, 0, 1]);
  });
});
