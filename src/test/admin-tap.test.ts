import { describe, expect, it } from "vitest";
import { createTapCounter } from "@/lib/admin";

describe("logo 4-tap admin shortcut", () => {
  it("opens on the 4th quick tap", () => {
    let t = 0;
    const tap = createTapCounter(4, 1500, () => t);
    expect([tap(), (t += 200, tap()), (t += 200, tap()), (t += 200, tap())]).toEqual([false, false, false, true]);
  });
  it("does not open after only 3 taps", () => {
    let t = 0;
    const tap = createTapCounter(4, 1500, () => t);
    expect([tap(), (t += 200, tap()), (t += 200, tap())]).toEqual([false, false, false]);
  });
  it("restarts the count when taps are too slow", () => {
    let t = 0;
    const tap = createTapCounter(4, 1500, () => t);
    tap(); t += 200; tap(); t += 200; tap(); t += 3000;
    expect(tap()).toBe(false);
  });
});
