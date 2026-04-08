import { supabase } from "@/src/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  authLogger,
  getCurrentPlatform,
  isRoleAllowedOnPlatform,
} from "./authLogger";
import type { UserRole } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthState = {
  session: Session | null;
  userId: string | null;
  role: UserRole | null;
  roleError: string | null;
  loading: boolean;
  /** true nếu role vi phạm chính sách nền tảng (admin/staff trên mobile) */
  isPlatformBlocked: boolean;
  refreshRole: () => Promise<void>;
  signOut: () => Promise<void>;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | undefined>(undefined);

// ─── Role Fetcher ─────────────────────────────────────────────────────────────

async function fetchMyRole(userId: string): Promise<UserRole | null> {
  authLogger.roleFetchStart({ userId });

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    authLogger.roleFetchError({
      userId,
      errorCode: (error as any).code ?? null,
      errorMessage: error.message,
    });
    throw error;
  }

  const nextRole = (data?.role as UserRole | null) ?? null;
  authLogger.roleFetchSuccess({ userId, role: nextRole });
  return nextRole;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id ?? null;
  const platform = getCurrentPlatform();

  /**
   * isPlatformBlocked = true khi:
   *   - role là 'admin' hoặc 'staff'
   *   - đang chạy trên mobile (không phải web)
   */
  const isPlatformBlocked = !isRoleAllowedOnPlatform(role, platform);

  const refreshRole = async () => {
    if (!userId) {
      setRole(null);
      setRoleError(null);
      return;
    }
    const nextRole = await fetchMyRole(userId);
    setRole(nextRole);
    setRoleError(null);
  };

  // ── Session Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      authLogger.sessionRestored({
        userId: session?.user?.id ?? null,
        role: null, // role chưa được fetch tại thời điểm này
        platform,
      });
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authLogger.authStateChange({
        event: _event,
        userId: session?.user?.id ?? null,
        platform,
      });
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Role Sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    refreshRole()
      .catch((e) => {
        setRole(null);
        setRoleError((e as Error)?.message ?? "Failed to fetch role");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Platform Block Logging ────────────────────────────────────────────────
  useEffect(() => {
    if (isPlatformBlocked && role && userId) {
      authLogger.rolePolicyViolation({
        userId,
        role,
        platform,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlatformBlocked, role, userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // ─────────────────────────────────────────────────────────────────────────
  const value = useMemo<AuthState>(
    () => ({
      session,
      userId,
      role,
      roleError,
      loading,
      isPlatformBlocked,
      refreshRole,
      signOut,
    }),
    [session, userId, role, roleError, loading, isPlatformBlocked],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
