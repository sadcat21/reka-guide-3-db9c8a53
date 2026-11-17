import { describe, expect, it } from "vitest";
import { removeAccount, setAccountToken, upsertAccount, type SavedAccount } from "@/lib/saved-accounts";

const a: SavedAccount = { userId: "1", login: "admin@x.com", label: "Admin", role: "admin", refreshToken: "t1" };
const b: SavedAccount = { userId: "2", login: "sara", label: "Sara", role: "assistant", refreshToken: "t2" };

describe("saved accounts", () => {
  it("re-signing in replaces the old entry instead of duplicating it", () => {
    const list = upsertAccount(upsertAccount([a], b), { ...a, refreshToken: "t3" });
    expect(list.map((x) => x.userId)).toEqual(["1", "2"]);
    expect(list[0]?.refreshToken).toBe("t3");
  });
  it("updates only the matching account's session", () => {
    const list = setAccountToken([a, b], "2", null);
    expect(list[0]?.refreshToken).toBe("t1");
    expect(list[1]?.refreshToken).toBeNull();
  });
  it("forgetting removes the account", () => {
    expect(removeAccount([a, b], "1")).toEqual([b]);
  });
});
