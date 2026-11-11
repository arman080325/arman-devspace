import { cn } from "cn";

export { cn };

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "…";
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "text-emerald-400";
    case "intermediate":
      return "text-amber-400";
    case "advanced":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

export function getDifficultyBgColor(difficulty: string): string {
  switch (difficulty) {
    case "beginner":
      return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
    case "intermediate":
      return "bg-amber-400/10 text-amber-400 border-amber-400/20";
    case "advanced":
      return "bg-red-400/10 text-red-400 border-red-400/20";
    default:
      return "bg-slate-400/10 text-slate-400 border-slate-400/20";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
    case "in-development":
      return "bg-violet-400/10 text-violet-400 border-violet-400/20";
    case "testing":
      return "bg-sky-400/10 text-sky-400 border-sky-400/20";
    case "planning":
      return "bg-amber-400/10 text-amber-400 border-amber-400/20";
    case "analyzing":
      return "bg-blue-400/10 text-blue-400 border-blue-400/20";
    case "cloned":
      return "bg-teal-400/10 text-teal-400 border-teal-400/20";
    case "backlog":
      return "bg-slate-400/10 text-slate-400 border-slate-400/20";
    case "awaiting":
      return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    default:
      return "bg-slate-400/10 text-slate-400 border-slate-400/20";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "in-development":
      return "In Development";
    case "awaiting":
      return "Awaiting";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
