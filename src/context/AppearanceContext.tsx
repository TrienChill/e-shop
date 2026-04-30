import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorSchemeId = 'emerald' | 'blue' | 'violet' | 'rose' | 'orange' | 'slate';
export type DensityMode = 'compact' | 'comfortable' | 'spacious';

// ─── Color palette ────────────────────────────────────────────────────────────
export const COLOR_MAP: Record<ColorSchemeId, { primary: string; light: string; hover: string }> = {
  emerald: { primary: '#059669', light: '#ECFDF5', hover: '#047857' },
  blue:    { primary: '#2563EB', light: '#EFF6FF', hover: '#1D4ED8' },
  violet:  { primary: '#7C3AED', light: '#F5F3FF', hover: '#6D28D9' },
  rose:    { primary: '#E11D48', light: '#FFF1F2', hover: '#BE123C' },
  orange:  { primary: '#EA580C', light: '#FFF7ED', hover: '#C2410C' },
  slate:   { primary: '#475569', light: '#F8FAFC', hover: '#334155' },
};

// ─── Density → content padding ───────────────────────────────────────────────
export const DENSITY_PADDING: Record<DensityMode, number> = {
  compact:     24,
  comfortable: 36,
  spacious:    52,
};

// ─── Storage key ─────────────────────────────────────────────────────────────
const KEY = 'admin_appearance_v1';

interface Stored { theme: ThemeMode; colorScheme: ColorSchemeId; density: DensityMode }

function load(): Stored {
  const def: Stored = { theme: 'light', colorScheme: 'emerald', density: 'compact' };
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { return { ...def, ...JSON.parse(window.localStorage.getItem(KEY) ?? '{}') }; }
    catch { /* ignore */ }
  }
  return def;
}

function save(s: Stored) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }
}

/** Chuyển hex (#RRGGBB) + alpha (0–1) sang rgba() — RN Web không hỗ trợ 8-digit hex */
export function hexToRgba(hex: string, alpha: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}

function applyTheme(theme: ThemeMode) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    const prefersDark =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

    // Toggle dark class on <html>
    document.documentElement.classList.toggle('dark', isDark);

    // Inject a <style> tag thay vì gán trực tiếp style (tránh lỗi RN Web)
    const STYLE_ID = 'admin-theme-override';
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = isDark ? 'body{background-color:#0F172A!important}' : '';
  } catch { /* ignore - môi trường không hỗ trợ DOM */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppearanceContextType extends Stored {
  primaryColor: string;
  primaryLight: string;
  primaryHover: string;
  contentPadding: number;
  setTheme: (t: ThemeMode) => void;
  setColorScheme: (c: ColorSchemeId) => void;
  setDensity: (d: DensityMode) => void;
}

const Ctx = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const init = load();
  const [theme, setThemeState]           = useState<ThemeMode>(init.theme);
  const [colorScheme, setColorSchemeState] = useState<ColorSchemeId>(init.colorScheme);
  const [density, setDensityState]       = useState<DensityMode>(init.density);

  // Apply theme on mount
  useEffect(() => { applyTheme(theme); }, []);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t); applyTheme(t);
    save({ theme: t, colorScheme, density });
  };
  const setColorScheme = (c: ColorSchemeId) => {
    setColorSchemeState(c);
    save({ theme, colorScheme: c, density });
  };
  const setDensity = (d: DensityMode) => {
    setDensityState(d);
    save({ theme, colorScheme, density: d });
  };

  const colors = COLOR_MAP[colorScheme];
  const value: AppearanceContextType = {
    theme, colorScheme, density,
    primaryColor: colors.primary,
    primaryLight: colors.light,
    primaryHover: colors.hover,
    contentPadding: DENSITY_PADDING[density],
    setTheme, setColorScheme, setDensity,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppearance() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider');
  return ctx;
}
