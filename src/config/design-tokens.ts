/**
 * Arman's Devspace — Design Tokens
 *
 * Central design system tokens for consistent theming
 * across the entire application.
 */

export const colors = {
  background: {
    DEFAULT: "#0B0D12",
    secondary: "#11151D",
    surface: "#151B26",
  },
  accent: {
    DEFAULT: "#8B5CF6",
    hover: "#7C3AED",
    muted: "rgba(139, 92, 246, 0.15)",
  },
  secondary: {
    DEFAULT: "#38BDF8",
    hover: "#0EA5E9",
    muted: "rgba(56, 189, 248, 0.15)",
  },
  text: {
    primary: "#F8FAFC",
    secondary: "#94A3B8",
    muted: "#64748B",
  },
  border: {
    DEFAULT: "#263244",
    hover: "#334155",
    subtle: "#1E293B",
  },
  status: {
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  difficulty: {
    beginner: "#22C55E",
    intermediate: "#F59E0B",
    advanced: "#EF4444",
  },
} as const;

export const spacing = {
  page: {
    x: "px-4 sm:px-6 lg:px-8",
    y: "py-6 sm:py-8 lg:py-12",
  },
  section: {
    y: "py-16 sm:py-20 lg:py-24",
  },
  container: "max-w-7xl mx-auto",
} as const;

export const typography = {
  h1: "text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight",
  h2: "text-3xl sm:text-4xl font-bold tracking-tight",
  h3: "text-2xl sm:text-3xl font-semibold",
  h4: "text-xl sm:text-2xl font-semibold",
  body: "text-base text-slate-400 leading-relaxed",
  small: "text-sm text-slate-500",
  mono: "font-mono text-sm",
} as const;
