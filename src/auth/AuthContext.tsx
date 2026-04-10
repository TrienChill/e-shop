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
  // roleResolved: true khi đã hoàn thành ít nhất một lần fetch role (hoặc xác định không có session)
  const [roleResolved, setRoleResolved] = useState(false);

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

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.warn("[AUTH_DEBUG] 1. getSession Error:", error.message);
        // Nếu lỗi liên quan đến Refresh Token không hợp lệ hoặc không tìm thấy, 
        // thực hiện đăng xuất để xóa token hỏng khỏi storage.
        if (
          error.message?.includes("Refresh Token Not Found") || 
          error.message?.includes("invalid_grant") ||
          (error as any).status === 400 || 
          (error as any).status === 401
        ) {
          supabase.auth.signOut().catch(() => {});
          setSession(null);
          setRole(null);
          setRoleResolved(true);
          setLoading(false);
          return;
        }
      }

      console.log("[AUTH_DEBUG] 1. Session Restored:", session?.user?.id || "None");
      authLogger.sessionRestored({
        userId: session?.user?.id ?? null,
        role: null,
        platform,
      });
      setSession(session);
      // Nếu không có session → không cần fetch role, đánh dấu đã resolved ngay
      if (!session) {
        setRoleResolved(true);
        setLoading(false);
      }
      // Nếu có session → giữ loading=true, chờ useEffect role fetch xử lý
    }).catch((err) => {
      console.error("[AUTH_DEBUG] 1. getSession Critical Error:", err);
      if (mounted) {
        setRoleResolved(true);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[AUTH_DEBUG] 2. Auth State Changed:", _event, session?.user?.id || "None");
      authLogger.authStateChange({
        event: _event,
        userId: session?.user?.id ?? null,
        platform,
      });
      if (!session) {
        // Đăng xuất: reset role và đánh dấu resolved
        setRole(null);
        setRoleError(null);
        setRoleResolved(true);
        setLoading(false);
      }
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Role Sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setRole(null);
      setRoleError(null);
      setRoleResolved(true);
      setLoading(false);
      return;
    }

    console.log("[AUTH_DEBUG] 3. Starting Role Fetch for:", userId);
    setLoading(true);
    setRoleResolved(false);
    refreshRole()
      .then(() => {
        console.log("[AUTH_DEBUG] 4. Role Fetch Done");
      })
      .catch((e) => {
        console.error("[AUTH_DEBUG] Error Fetching Role:", e);
        setRole(null);
        setRoleError((e as Error)?.message ?? "Failed to fetch role");
      })
      .finally(() => {
        setRoleResolved(true);
        setLoading(false);
      });
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
  // loading thực sự = đang tải HOẶC có session nhưng role chưa được resolve
  const isLoading = loading || (session !== null && !roleResolved);

  const value = useMemo<AuthState>(
    () => ({
      session,
      userId,
      role,
      roleError,
      loading: isLoading,
      isPlatformBlocked,
      refreshRole,
      signOut,
    }),
    [session, userId, role, roleError, isLoading, isPlatformBlocked],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
