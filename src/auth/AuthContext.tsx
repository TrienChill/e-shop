import { supabase } from "@/src/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserRole } from "./types";

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7797/ingest/e442deb0-be17-422a-a916-36b6ffe053c6", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "763e45",
    },
    body: JSON.stringify({
      sessionId: "763e45",
      runId: "pre-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => { });
  // #endregion
}

type AuthState = {
  session: Session | null;
  userId: string | null;
  role: UserRole | null;
  roleError: string | null;
  loading: boolean;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchMyRole(userId: string): Promise<UserRole | null> {
  debugLog("H1_profiles_mismatch_or_missing", "src/auth/AuthContext.tsx:fetchMyRole", "fetchMyRole:start", { userId });
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    debugLog("H2_profiles_select_blocked", "src/auth/AuthContext.tsx:fetchMyRole", "fetchMyRole:error", {
      userId,
      errorMessage: error.message,
      errorCode: (error as any).code ?? null,
    });
    throw error;
  }

  const nextRole = (data?.role as UserRole | null) ?? null;
  debugLog("H1_profiles_mismatch_or_missing", "src/auth/AuthContext.tsx:fetchMyRole", "fetchMyRole:done", {
    userId,
    hasRow: Boolean(data),
    role: nextRole,
  });
  return nextRole;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id ?? null;

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

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      debugLog("H3_session_not_loaded", "src/auth/AuthContext.tsx:useEffect(getSession)", "getSession:done", {
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
      });
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      debugLog("H3_session_not_loaded", "src/auth/AuthContext.tsx:onAuthStateChange", "authStateChange", {
        event: _event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null,
      });
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Keep role in sync with auth state.
    setLoading(true);
    refreshRole()
      .catch((e) => {
        setRole(null);
        setRoleError((e as Error)?.message ?? "Failed to fetch role");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      userId,
      role,
      roleError,
      loading,
      refreshRole,
    }),
    [session, userId, role, roleError, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

