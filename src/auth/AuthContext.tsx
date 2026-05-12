import { supabase } from "@/src/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authLogger,
  getCurrentPlatform,
  isRoleAllowedOnPlatform,
} from "./authLogger";
import type { UserRole } from "./types";
import { getGuestCart, clearGuestCart, type GuestCartItem } from "@/src/services/guestCart";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_AUTH_STORAGE_KEY = "@supabase.auth.token";

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

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Check if error is related to invalid/expired refresh token
 */
function isRefreshTokenError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message || "";
  const status = error.status || error.code;
  
  // Check for various refresh token related errors
  const refreshTokenPatterns = [
    "Refresh Token Not Found",
    "Invalid Refresh Token",
    "refresh_token",
    "invalid_grant",
    "invalid_token",
    "session not found",
    "Session not found",
    "JWT expired",
    "token expired",
    "Token expired",
  ];
  
  const isRefreshError = refreshTokenPatterns.some(
    (pattern) => message.toLowerCase().includes(pattern.toLowerCase())
  );
  
  // Check status codes
  const isAuthStatusError = status === 400 || status === 401 || status === 403;
  
  return isRefreshError || isAuthStatusError;
}

/**
 * Clear ALL authentication data from storage
 * This ensures no corrupted session data remains
 */
async function clearAllAuthData(): Promise<void> {
  try {
    // Clear Supabase auth token from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(
      (key) =>
        key.includes("supabase") ||
        key.includes("auth") ||
        key.includes("@react-native-auth")
    );
    
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }
    
    // Also try to clear the specific key if it exists
    try {
      await AsyncStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
    } catch {
      // Key might not exist, ignore
    }
  } catch (error) {
    // If clearing fails, still try to sign out from Supabase
    console.warn("Failed to clear auth storage:", error);
  }
}

/**
 * Handle corrupted/expired session by signing out and clearing storage
 */
async function handleCorruptedSession(error: any): Promise<void> {
  const errorMessage = error?.message || String(error);
  const platform = getCurrentPlatform();
  
  authLogger.sessionExpired({
    reason: errorMessage,
    platform,
  });
  
  // First clear local storage to prevent re-loading corrupted session
  await clearAllAuthData();
  
  authLogger.sessionCleared({
    reason: "Corrupted session data cleared",
    platform,
  });
  
  // Then sign out from Supabase (this also clears their internal state)
  try {
    await supabase.auth.signOut();
  } catch (signOutError) {
    // Even if signOut fails, we've already cleared local storage
    console.warn("Supabase signOut failed:", signOutError);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);
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

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        // Nếu lỗi liên quan đến Refresh Token không hợp lệ hoặc không tìm thấy, 
        // thực hiện đăng xuất để xóa token hỏng khỏi storage và cấp lại session ẩn danh.
        if (isRefreshTokenError(error)) {
          await handleCorruptedSession(error);
          
          if (mounted) {
            setSession(null);
            setRole(null);
            setRoleResolved(true);
            setLoading(false);
            setSessionInitialized(true);
          }
          return;
        }
        
        // For other errors, still log and handle
        authLogger.error({
          context: "getSession",
          message: "Failed to restore session",
          error: error?.message || String(error),
        });
      }
      
      authLogger.sessionRestored({
        userId: session?.user?.id ?? null,
        role: null,
        platform,
      });
      setSession(session);

      // Nếu không có session → không tự động cấp phát tài khoản ẩn danh
      if (!session) {
        setRoleResolved(true);
        setLoading(false);
      }
      
      if (mounted) {
        setSessionInitialized(true);
      }
      // Nếu có session → giữ loading=true, chờ useEffect role fetch xử lý
    }).catch(async (err) => {
      if (mounted) {
        // Check if it's a refresh token error even in catch
        if (isRefreshTokenError(err)) {
          await handleCorruptedSession(err);
          setRoleResolved(true);
          setLoading(false);
        } else {
          setRoleResolved(true);
          setLoading(false);
        }
        
        if (mounted) {
          setSessionInitialized(true);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      authLogger.authStateChange({
        event: _event,
        userId: session?.user?.id ?? null,
        platform,
      });

      // ── Handle refresh token failures from auto-refresh ────────────────────
      // When the internal auto-refresh fails, it may emit TOKEN_REFRESHED with
      // null session, or trigger SIGNED_OUT. Clean up gracefully.
      if (_event === "TOKEN_REFRESHED" && !session) {
        await clearAllAuthData();
        setSession(null);
        setRole(null);
        setRoleError(null);
        setRoleResolved(true);
        setLoading(false);
        setSessionInitialized(true);
        return;
      }

      if (!session) {
        // Đăng xuất: reset role và đánh dấu resolved
        setRole(null);
        setRoleError(null);
        setRoleResolved(true);
        setLoading(false);
      }

      // ── Merge Guest Cart khi đăng nhập thành công ─────────────────────────
      if (_event === "SIGNED_IN" && session?.user && !session.user.is_anonymous) {
        try {
          const guestCart = await getGuestCart();
          if (guestCart.length > 0) {
            for (const item of guestCart) {
              // Kiểm tra xem sản phẩm đã tồn tại trong cart DB chưa
              const { data: existing } = await supabase
                .from("cart_items")
                .select("id, quantity")
                .eq("user_id", session.user.id)
                .eq("product_id", item.product_id)
                .eq("color", item.rawColor || "")
                .eq("size", item.rawSize || "")
                .maybeSingle();

              if (existing) {
                // Trùng → cộng dồn quantity
                await supabase
                  .from("cart_items")
                  .update({ quantity: existing.quantity + item.quantity, is_selected: true })
                  .eq("id", existing.id);
              } else {
                // Chưa có → insert mới
                await supabase.from("cart_items").insert({
                  user_id: session.user.id,
                  product_id: Number(item.product_id),
                  quantity: item.quantity,
                  color: item.rawColor || null,
                  size: item.rawSize || null,
                  is_selected: true,
                });
              }
            }
            // Xóa guest cart local sau khi merge thành công
            await clearGuestCart();
          }
        } catch (mergeErr) {
          console.warn("Lỗi merge guest cart:", mergeErr);
        }
      }

      setSession(session);
      setSessionInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Role Sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // CỰC KỲ QUAN TRỌNG: Không đánh giá việc thiếu `userId` cho đến khi quá trình khôi phục session ban đầu hoàn tất!
    if (!sessionInitialized) return;

    if (!userId) {
      setRole(null);
      setRoleError(null);
      setRoleResolved(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setRoleResolved(false);
    refreshRole()
      .then(() => {
      })
      .catch((e) => {
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
    // Clear local storage first, then sign out from Supabase
    await clearAllAuthData();
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
