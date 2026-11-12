import { z } from "zod";

export const PROJECT_STATUSES = [
  "awaiting",
  "backlog",
  "cloned",
  "analyzing",
  "planning",
  "in-development",
  "testing",
  "completed",
] as const;

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export const VERIFICATION_STATUSES = [
  "verified",
  "needs-review",
  "archived",
  "unavailable",
  "incorrect-link",
  "collection-only",
] as const;

export const NOTE_TYPES = [
  "general",
  "architecture",
  "bug",
  "solution",
  "learning",
] as const;

export const ROADMAP_STATUSES = ["pending", "in-progress", "completed"] as const;

export const DEPLOYMENT_ENVIRONMENTS = ["preview", "staging", "production"] as const;

export const DEPLOYMENT_STATUSES = ["active", "failed", "pending"] as const;

/**
 * Strips potentially unsafe control chars and trims plain text inputs.
 */
export function sanitizePlainText(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be under 80 characters."),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be under 128 characters."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export const projectProgressUpdateSchema = z.object({
  status: z.enum(PROJECT_STATUSES).optional(),
  bookmarked: z.boolean().optional(),
  completionPercentage: z.number().int().min(0).max(100).optional(),
  localClonePath: z
    .string()
    .trim()
    .max(500, "Local path must be under 500 characters.")
    .nullable()
    .optional(),
  deploymentUrl: z
    .string()
    .trim()
    .max(500)
    .refine((val) => val === "" || isSafeHttpUrl(val), {
      message: "Deployment URL must start with http:// or https://",
    })
    .nullable()
    .optional(),
  originalArchitecture: z.string().max(12000).nullable().optional(),
  modernizationArchitecture: z.string().max(12000).nullable().optional(),
  technicalDocumentation: z.string().max(20000).nullable().optional(),
  testingSummary: z.string().max(12000).nullable().optional(),
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Task title must be at least 2 characters.")
    .max(200, "Task title must be under 200 characters."),
  phase: z.string().trim().min(2).max(60).default("Development"),
});

export const toggleTaskSchema = z.object({
  taskId: z.string().min(1),
  completed: z.boolean(),
});

export const createNoteSchema = z.object({
  projectId: z.string().min(1),
  title: z
    .string()
    .trim()
    .min(2, "Note title must be at least 2 characters.")
    .max(160, "Note title must be under 160 characters."),
  content: z
    .string()
    .trim()
    .min(4, "Note content must be at least 4 characters.")
    .max(20000, "Note content is too long."),
  type: z.enum(NOTE_TYPES).default("general"),
});

export const updateRoadmapItemSchema = z.object({
  roadmapId: z.string().min(1),
  status: z.enum(ROADMAP_STATUSES),
});

const CALENDAR_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcCalendarDate(value: string): Date | null {
  const match = CALENDAR_DATE_REGEX.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1) {
    return null;
  }
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Validates a calendar date string in strict `YYYY-MM-DD` Gregorian calendar form. */
export function isValidCalendarDate(value: string): boolean {
  return toUtcCalendarDate(value.trim()) !== null;
}

/**
 * Deterministically converts a validated `YYYY-MM-DD` calendar date to UTC midnight
 * without local timezone drift, returning `null` for empty/nullish values.
 */
export function parseCalendarDateToUtc(value: string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = toUtcCalendarDate(trimmed);
  if (!parsed) {
    throw new Error(`Invalid calendar date "${value}". Expected YYYY-MM-DD.`);
  }
  return parsed;
}

const calendarDateSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .refine((val) => val === null || isValidCalendarDate(val), {
    message: "Due date must be a valid calendar date in YYYY-MM-DD format.",
  });

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(160),
  dueDate: calendarDateSchema.nullable().optional(),
});

export const createDeploymentSchema = z.object({
  environment: z.enum(DEPLOYMENT_ENVIRONMENTS).default("production"),
  url: z.string().trim().refine(isSafeHttpUrl, {
    message: "Deployment URL must be a valid http(s) URL.",
  }),
  provider: z.string().trim().min(1).max(60).default("Vercel"),
  status: z.enum(DEPLOYMENT_STATUSES).default("active"),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const createScreenshotSchema = z.object({
  title: z.string().trim().min(2).max(120),
  url: z.string().trim().refine(isSafeHttpUrl, {
    message: "Screenshot URL must be a valid http(s) URL.",
  }),
  caption: z.string().trim().max(400).nullable().optional(),
});

export const githubVerifySchema = z.object({
  projectId: z.string().min(1),
  overrideUrl: z
    .string()
    .trim()
    .refine((val) => val === "" || isSafeHttpUrl(val), {
      message: "Override URL must be a valid http(s) URL.",
    })
    .optional(),
});
