/**
 * authLogger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized debug logger dành riêng cho luồng xác thực (auth).
 *
 * Mục đích:
 *  - Ghi log chi tiết về trạng thái đăng nhập (login state)
 *  - Ghi log lỗi đăng nhập (login errors)
 *  - Phát hiện và ghi log vi phạm quy tắc nền tảng:
 *      · admin  → chỉ được đăng nhập trên WEB (webadmin)
 *      · staff  → chỉ được đăng nhập trên WEB (webstaff)
 *      · user   → được đăng nhập trên cả APP lẫn WEB
 *
 * Quy tắc nền tảng (Platform Policy):
 *  ┌─────────┬──────────┬──────────┐
 *  │  Role   │  Mobile  │   Web    │
 *  ├─────────┼──────────┼──────────┤
 *  │  user   │    ✓     │    ✓     │
 *  │  admin  │    ✗     │    ✓     │
 *  │  staff  │    ✗     │    ✓     │
 *  └─────────┴──────────┴──────────┘
 *
 * Sử dụng:
 *   import { authLogger } from '@/src/auth/authLogger';
 *   authLogger.loginAttempt({ email, platform });
 *   authLogger.loginSuccess({ userId, role, platform });
 *   authLogger.loginError({ email, reason, error });
 *   authLogger.rolePolicyViolation({ userId, role, platform });
 *   authLogger.sessionRestored({ userId, role, platform });
 *   authLogger.logout({ userId, role });
 */

import { Platform } from 'react-native';
import type { UserRole } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthPlatform = 'mobile' | 'web';

export interface AuthLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  event: AuthEventType;
  userId?: string | null;
  role?: UserRole | null;
  email?: string;
  platform: AuthPlatform;
  reason?: string;
  errorCode?: string | null;
  errorMessage?: string;
  meta?: Record<string, unknown>;
}

export type AuthEventType =
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_ERROR'
  | 'LOGIN_BLOCKED_ROLE_PLATFORM'   // admin/staff cố đăng nhập trên mobile
  | 'SESSION_RESTORED'
  | 'ROLE_FETCH_START'
  | 'ROLE_FETCH_SUCCESS'
  | 'ROLE_FETCH_ERROR'
  | 'LOGOUT'
  | 'AUTH_STATE_CHANGE';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Trả về nền tảng hiện tại ('mobile' | 'web').
 * Expo + React Native: Platform.OS === 'web' khi chạy trong trình duyệt.
 */
export function getCurrentPlatform(): AuthPlatform {
  return Platform.OS === 'web' ? 'web' : 'mobile';
}

/**
 * Kiểm tra xem role có được phép đăng nhập trên platform hiện tại không.
 *
 * Quy tắc:
 *  - 'user'  → được phép ở mọi nơi
 *  - 'admin' → chỉ được phép trên web
 *  - 'staff' → chỉ được phép trên web
 *
 * @returns true nếu được phép, false nếu bị chặn
 */
export function isRoleAllowedOnPlatform(
  role: UserRole | null,
  platform: AuthPlatform,
): boolean {
  if (!role) return true; // chưa xác định role → không chặn
  if (role === 'user') return true;
  if (role === 'admin' || role === 'staff') {
    return platform === 'web';
  }
  return true;
}

/**
 * Trả về thông báo lỗi tiếng Việt khi bị chặn theo platform.
 */
export function getRolePlatformErrorMessage(role: UserRole): string {
  const roleLabel = role === 'admin' ? 'Quản trị viên (Admin)' : 'Nhân viên (Staff)';
  return (
    `Tài khoản ${roleLabel} không được phép đăng nhập trên ứng dụng di động.\n` +
    `Vui lòng sử dụng giao diện Web ${role === 'admin' ? '(Web Admin)' : '(Web Staff)'} để đăng nhập.`
  );
}

// ─── Logger Core ──────────────────────────────────────────────────────────────

function formatTimestamp(): string {
  return new Date().toISOString();
}

function buildEntry(
  level: AuthLogEntry['level'],
  event: AuthEventType,
  fields: Omit<AuthLogEntry, 'timestamp' | 'level' | 'event' | 'platform'> & { platform?: AuthPlatform },
): AuthLogEntry {
  return {
    timestamp: formatTimestamp(),
    level,
    event,
    platform: fields.platform ?? getCurrentPlatform(),
    ...fields,
  };
}

function printLog(entry: AuthLogEntry): void {
  const prefix = `[AUTH][${entry.level}][${entry.event}]`;
  const summary = `platform=${entry.platform} | userId=${entry.userId ?? '—'} | role=${entry.role ?? '—'}`;

  if (entry.level === 'ERROR') {
    console.error(prefix, summary, entry.reason ?? entry.errorMessage ?? '', entry);
  } else if (entry.level === 'WARN') {
    console.warn(prefix, summary, entry.reason ?? '', entry);
  } else {
    console.log(prefix, summary, entry);
  }
}

// ─── Public Logger API ────────────────────────────────────────────────────────

export const authLogger = {

  /**
   * Ghi log khi người dùng bắt đầu thực hiện đăng nhập.
   */
  loginAttempt(params: { email: string; platform?: AuthPlatform }): void {
    const entry = buildEntry('INFO', 'LOGIN_ATTEMPT', {
      email: params.email,
      platform: params.platform,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi đăng nhập thành công.
   */
  loginSuccess(params: {
    userId: string;
    role: UserRole | null;
    platform?: AuthPlatform;
  }): void {
    const entry = buildEntry('INFO', 'LOGIN_SUCCESS', {
      userId: params.userId,
      role: params.role,
      platform: params.platform,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi đăng nhập thất bại (lỗi từ Supabase hoặc logic).
   */
  loginError(params: {
    email?: string;
    reason: string;
    errorCode?: string | null;
    errorMessage?: string;
    platform?: AuthPlatform;
    meta?: Record<string, unknown>;
  }): void {
    const entry = buildEntry('ERROR', 'LOGIN_ERROR', {
      email: params.email,
      reason: params.reason,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      platform: params.platform,
      meta: params.meta,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi tài khoản admin/staff bị chặn đăng nhập trên mobile.
   * Đây là vi phạm chính sách nền tảng — mức WARN.
   */
  rolePolicyViolation(params: {
    userId?: string | null;
    role: UserRole;
    platform: AuthPlatform;
    email?: string;
  }): void {
    const entry = buildEntry('WARN', 'LOGIN_BLOCKED_ROLE_PLATFORM', {
      userId: params.userId,
      role: params.role,
      email: params.email,
      platform: params.platform,
      reason: `Role '${params.role}' is not permitted to sign in on '${params.platform}'. Web login required.`,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi session được khôi phục từ storage (app restart / tab reload).
   */
  sessionRestored(params: {
    userId: string | null;
    role: UserRole | null;
    platform?: AuthPlatform;
  }): void {
    const entry = buildEntry('INFO', 'SESSION_RESTORED', {
      userId: params.userId,
      role: params.role,
      platform: params.platform,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi bắt đầu fetch role từ database.
   */
  roleFetchStart(params: { userId: string }): void {
    const entry = buildEntry('INFO', 'ROLE_FETCH_START', {
      userId: params.userId,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi fetch role thành công.
   */
  roleFetchSuccess(params: { userId: string; role: UserRole | null }): void {
    const entry = buildEntry('INFO', 'ROLE_FETCH_SUCCESS', {
      userId: params.userId,
      role: params.role,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi fetch role thất bại.
   */
  roleFetchError(params: {
    userId: string;
    errorCode?: string | null;
    errorMessage: string;
  }): void {
    const entry = buildEntry('ERROR', 'ROLE_FETCH_ERROR', {
      userId: params.userId,
      reason: params.errorMessage,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi người dùng đăng xuất.
   */
  logout(params: { userId: string | null; role: UserRole | null }): void {
    const entry = buildEntry('INFO', 'LOGOUT', {
      userId: params.userId,
      role: params.role,
    });
    printLog(entry);
  },

  /**
   * Ghi log khi onAuthStateChange được kích hoạt.
   */
  authStateChange(params: {
    event: string;
    userId: string | null;
    platform?: AuthPlatform;
  }): void {
    const entry = buildEntry('INFO', 'AUTH_STATE_CHANGE', {
      userId: params.userId,
      platform: params.platform,
      meta: { supabaseEvent: params.event },
    });
    printLog(entry);
  },
};
