"use client";

import { create } from "zustand";

export interface AuthUser {
  username: string;
  role: "admin" | "user";
}

export type AuthStatus =
  | "loading" // first /api/auth/me in flight
  | "local" // no Redis configured — browser-only mode, no accounts
  | "signedout" // accounts configured, no valid session
  | "guest" // chose to look around without an account — browser-only, nothing syncs
  | "authed";

interface AuthState {
  status: AuthStatus;
  bootstrapped: boolean; // does any account exist yet?
  user: AuthUser | null;
  seats: { taken: number; cap: number } | null;
  error?: string;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; pending?: boolean }>;
  register: (username: string, password: string) => Promise<{ ok: boolean; error?: string; approved?: boolean }>;
  logout: () => Promise<void>;
  enterGuest: () => void;
  leaveGuest: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string; note?: string }>;
  generateRecoveryCode: () => Promise<{ ok: boolean; code?: string; error?: string }>;
  resetWithCode: (username: string, code: string, newPassword: string) => Promise<{ ok: boolean; error?: string; note?: string }>;
}

// Guest choice survives reloads in this browser only. Storage can throw
// (private windows, blocked site data) — the guest view still works without it.
const GUEST_KEY = "halo_guest";
function readGuest(): boolean {
  try { return localStorage.getItem(GUEST_KEY) === "1"; } catch { return false; }
}
function writeGuest(on: boolean) {
  try {
    if (on) localStorage.setItem(GUEST_KEY, "1");
    else localStorage.removeItem(GUEST_KEY);
  } catch { /* ignore */ }
}

async function json<T>(res: Response): Promise<T & { error?: string }> {
  try {
    return (await res.json()) as T & { error?: string };
  } catch {
    return { error: `HTTP ${res.status}` } as T & { error?: string };
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  status: "loading",
  bootstrapped: true,
  user: null,
  seats: null,

  refresh: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await json<{ configured: boolean; bootstrapped?: boolean; user: AuthUser | null; seats?: { taken: number; cap: number } | null }>(res);
      if (!data.configured) {
        set({ status: "local", user: null });
      } else {
        const bootstrapped = data.bootstrapped ?? true;
        // no guest view before the first account exists — that screen is the admin setup
        const guest = !data.user && bootstrapped && readGuest();
        set({
          status: data.user ? "authed" : guest ? "guest" : "signedout",
          bootstrapped,
          user: data.user ?? null,
          seats: data.seats ?? null,
        });
      }
    } catch {
      // network failure: keep the app usable offline with whatever we knew
      if (get().status === "loading") set({ status: "local", user: null });
    }
  },

  login: async (username, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await json<{ ok?: boolean; user?: AuthUser; pending?: boolean }>(res);
    if (res.ok && data.user) {
      writeGuest(false);
      set({ status: "authed", user: data.user });
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "Sign-in failed.", pending: data.pending };
  },

  register: async (username, password) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await json<{ ok?: boolean; approved?: boolean }>(res);
    if (res.ok && data.ok) {
      const seats = get().seats;
      set({
        bootstrapped: true,
        seats: seats ? { ...seats, taken: Math.min(seats.cap, seats.taken + 1) } : seats,
      });
      return { ok: true, approved: data.approved };
    }
    return { ok: false, error: data.error ?? "Registration failed." };
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    set({ status: "signedout", user: null });
  },

  enterGuest: () => {
    writeGuest(true);
    set({ status: "guest", user: null });
  },

  leaveGuest: () => {
    writeGuest(false);
    set({ status: "signedout", user: null });
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await json<{ ok?: boolean; note?: string }>(res);
    if (res.ok && data.ok) return { ok: true, note: data.note };
    return { ok: false, error: data.error ?? "Could not change password." };
  },

  generateRecoveryCode: async () => {
    const res = await fetch("/api/auth/recovery-code", { method: "POST" });
    const data = await json<{ ok?: boolean; code?: string }>(res);
    if (res.ok && data.ok && data.code) return { ok: true, code: data.code };
    return { ok: false, error: data.error ?? "Could not generate a recovery code." };
  },

  resetWithCode: async (username, code, newPassword) => {
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, code, newPassword }),
    });
    const data = await json<{ ok?: boolean; note?: string }>(res);
    if (res.ok && data.ok) return { ok: true, note: data.note };
    return { ok: false, error: data.error ?? "Reset failed." };
  },
}));
