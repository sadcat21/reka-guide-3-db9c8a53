/**
 * Accounts that already signed in on this device, for one-tap switching.
 * Only accounts whose owner entered their own password here are listed; each keeps
 * its own session. Nothing grants access to an account that never signed in here.
 */
export type SavedAccount = {
  userId: string;
  login: string;
  label: string;
  role: "admin" | "assistant";
  refreshToken: string | null;
};

const KEY = "rifqa.savedStaffAccounts";

export function upsertAccount(list: SavedAccount[], acc: SavedAccount): SavedAccount[] {
  return [acc, ...list.filter((a) => a.userId !== acc.userId)].slice(0, 10);
}

export function setAccountToken(list: SavedAccount[], userId: string, token: string | null): SavedAccount[] {
  return list.map((a) => (a.userId === userId ? { ...a, refreshToken: token } : a));
}

export function removeAccount(list: SavedAccount[], userId: string): SavedAccount[] {
  return list.filter((a) => a.userId !== userId);
}

export function loadAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

export function saveAccounts(list: SavedAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}
