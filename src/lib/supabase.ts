import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthError, createClient, SupabaseClient } from "@supabase/supabase-js";
import { AppState, AppStateStatus } from "react-native";
import "react-native-url-polyfill/auto";

// ─── Constants ─────────────────────────────────────────────────────────────────
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Thiếu cấu hình Supabase trong file .env");
}

// ─── Refresh Token Error Detection ────────────────────────────────────────────
const REFRESH_TOKEN_PATTERNS = [
  "Refresh Token Not Found",
  "Invalid Refresh Token",
  "refresh_token",
  "invalid_grant",
  "invalid_token",
  "session not found",
  "JWT expired",
  "token expired",
];

function isRefreshTokenError(error: unknown): boolean {
  if (!error) return false;
  const message = (error as any)?.message || String(error);
  const status = (error as any)?.status || (error as any)?.code;
  const isMessageMatch = REFRESH_TOKEN_PATTERNS.some((p) =>
    message.toLowerCase().includes(p.toLowerCase()),
  );
  const isStatusMatch = status === 400 || status === 401 || status === 403;
  return isMessageMatch || isStatusMatch;
}

async function clearAuthStorage(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(
      (k) =>
        k.includes("supabase") ||
        k.includes("auth") ||
        k.includes("@react-native-auth"),
    );
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }
  } catch {
    // ignore
  }
}

// ─── Safe Auth Wrapper ─────────────────────────────────────────────────────────
// Wraps auth methods so invalid refresh tokens never crash the app.
function wrapAuthClient(client: SupabaseClient): SupabaseClient {
  const originalSignInWithPassword = client.auth.signInWithPassword.bind(
    client.auth,
  );
  const originalSignInWithOAuth = client.auth.signInWithOAuth.bind(client.auth);
  const originalSignInWithOtp = client.auth.signInWithOtp.bind(client.auth);
  const originalGetUser = client.auth.getUser.bind(client.auth);
  const originalGetSession = client.auth.getSession.bind(client.auth);
  const originalRefreshSession = (client.auth as any).refreshSession?.bind(
    client.auth,
  );

  client.auth.signInWithPassword = async (
    ...args: Parameters<typeof originalSignInWithPassword>
  ) => {
    try {
      return await originalSignInWithPassword(...args);
    } catch (error) {
      if (isRefreshTokenError(error)) {
        await clearAuthStorage();
        return {
          data: { user: null, session: null },
          error: error as AuthError,
        };
      }
      throw error;
    }
  };

  client.auth.signInWithOAuth = async (
    ...args: Parameters<typeof originalSignInWithOAuth>
  ) => {
    try {
      return await originalSignInWithOAuth(...args);
    } catch (error) {
      if (isRefreshTokenError(error)) {
        await clearAuthStorage();
        const provider = args[0]?.provider ?? null;
        return {
          data: { url: null, provider, session: null },
          error: error as AuthError,
        };
      }
      throw error;
    }
  };

  client.auth.signInWithOtp = async (
    ...args: Parameters<typeof originalSignInWithOtp>
  ) => {
    try {
      return await originalSignInWithOtp(...args);
    } catch (error) {
      if (isRefreshTokenError(error)) {
        await clearAuthStorage();
        return {
          data: { user: null, session: null },
          error: error as AuthError,
        };
      }
      throw error;
    }
  };

  client.auth.getSession = async (
    ...args: Parameters<typeof originalGetSession>
  ) => {
    const response = await originalGetSession(...args);
    if (response.error && isRefreshTokenError(response.error)) {
      await clearAuthStorage();
      return { data: { session: null }, error: response.error };
    }
    return response;
  };

  if (originalRefreshSession) {
    client.auth.refreshSession = async (
      ...args: Parameters<typeof originalRefreshSession>
    ) => {
      const response = await originalRefreshSession(...args);
      if (response.error && isRefreshTokenError(response.error)) {
        await clearAuthStorage();
        return { data: { session: null }, error: response.error };
      }
      return response;
    };
  }

  client.auth.getUser = async (...args: Parameters<typeof originalGetUser>) => {
    try {
      return await originalGetUser(...args);
    } catch (error) {
      if (isRefreshTokenError(error)) {
        await clearAuthStorage();
        return { data: { user: null }, error: error as AuthError };
      }
      throw error;
    }
  };

  return client;
}

// ─── Client Creation ───────────────────────────────────────────────────────────
export const supabase = wrapAuthClient(
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }),
);

export const supabaseAdmin = serviceRoleKey
  ? wrapAuthClient(
      createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
    )
  : null;

// ─── AppState Listener ─────────────────────────────────────────────────────────
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;

function startAppStateListener(client: SupabaseClient) {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener(
    "change",
    async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        try {
          const { data, error } = await client.auth.getSession();
          if (error && isRefreshTokenError(error)) {
            await clearAuthStorage();
            await client.auth.signOut();
          }
          if (!data.session) {
            // Session hết hạn hoặc bị xóa → buộc refresh
            await client.auth.setSession(null as any);
          }
        } catch {
          // ignore
        }
      }
    },
  );
}

startAppStateListener(supabase);
