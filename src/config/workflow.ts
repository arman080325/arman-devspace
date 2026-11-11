import type { Difficulty, ProjectStatus, VerificationStatus } from "@/types/project";

export interface WorkflowPhaseSpec {
  phase: number;
  title: string;
  shortTitle: string;
  description: string;
}

export const WORKFLOW_PHASES: WorkflowPhaseSpec[] = [
  {
    phase: 1,
    title: "Discover & Clone",
    shortTitle: "Clone",
    description:
      "Inspect the original repository URL, verify branch availability, record discrepancies, and store your local workspace path.",
  },
  {
    phase: 2,
    title: "Architecture Analysis",
    shortTitle: "Analyze",
    description:
      "Audit dependencies, folder structure, data models, auth boundaries, and technical debt in the legacy codebase.",
  },
  {
    phase: 3,
    title: "Modernization Plan",
    shortTitle: "Plan",
    description:
      "Define the upgraded stack, map missing features, outline target architecture diagrams, and break down tasks.",
  },
  {
    phase: 4,
    title: "Core Implementation",
    shortTitle: "Build",
    description:
      "Rebuild features cleanly with strict TypeScript, modular server boundaries, accessible UI, and persistent storage.",
  },
  {
    phase: 5,
    title: "Automated Testing",
    shortTitle: "Test",
    description:
      "Verify core invariants, API validation, and end-to-end user flows with Vitest, Testing Library, and Playwright.",
  },
  {
    phase: 6,
    title: "Documentation & Polish",
    shortTitle: "Document",
    description:
      "Capture architectural notes, lessons learned, engineering journal logs, screenshots, and repository documentation.",
  },
  {
    phase: 7,
    title: "Deployment & Review",
    shortTitle: "Ship",
    description:
      "Publish live preview/production URLs, log release metadata, audit metrics, and mark the milestone complete.",
  },
];

export const KANBAN_COLUMNS: Array<{
  status: ProjectStatus;
  label: string;
  description: string;
}> = [
  {
    status: "backlog",
    label: "Backlog",
    description: "Queued for evaluation and initial scoping.",
  },
  {
    status: "cloned",
    label: "Cloned",
    description: "Source repository inspected and cloned locally.",
  },
  {
    status: "analyzing",
    label: "Analyzing",
    description: "Auditing original stack, patterns, and missing features.",
  },
  {
    status: "planning",
    label: "Planning",
    description: "Modernized stack, roadmap, and tasks prepared.",
  },
  {
    status: "in-development",
    label: "In Development",
    description: "Actively building modernized implementation.",
  },
  {
    status: "testing",
    label: "Testing",
    description: "Verifying unit, integration, E2E checks, and deployment.",
  },
  {
    status: "completed",
    label: "Completed",
    description: "Documented, verified, deployed, and archived.",
  },
];

export interface LearningPathSpec {
  level: Difficulty;
  title: string;
  rangeLabel: string;
  minNumber: number;
  maxNumber: number;
  summary: string;
  complexityNote: string;
  outcomes: string[];
  recommendedSkills: string[];
}

export const LEARNING_PATHS: Record<Difficulty, LearningPathSpec> = {
  beginner: {
    level: "beginner",
    title: "Beginner Engineering Track",
    rangeLabel: "Projects 1–30",
    minNumber: 1,
    maxNumber: 30,
    summary:
      "Master full-stack fundamentals, component composition, REST API consumption, CRUD modeling, and stateful client interfaces.",
    complexityNote:
      "Repositories in positions 1–30 emphasize single-service apps, React state flows, and introductory MERN patterns. Several entries (e.g., #18 curated repo list and #24 repository link mismatch) benefit from upfront repository verification.",
    outcomes: [
      "Audit and refactor legacy React class or untyped CRA/MERN templates into strict TypeScript & Next.js App Router.",
      "Design clean data validation schemas, loading/error states, and keyboard-accessible forms.",
      "Establish repeatable cloning, inspection, testing, and documentation habits before scaling to distributed apps.",
    ],
    recommendedSkills: [
      "TypeScript Strict Mode",
      "React 19 & Next.js App Router",
      "Tailwind CSS & Semantic HTML",
      "REST API Integration & Validation",
      "Relational Data Modeling",
    ],
  },
  intermediate: {
    level: "intermediate",
    title: "Intermediate Systems Track",
    rangeLabel: "Projects 31–50",
    minNumber: 31,
    maxNumber: 50,
    summary:
      "Architect role-based workflows, real-time sockets, media pipelines, headless CMS backends, and production dashboards.",
    complexityNote:
      "Repositories in positions 31–50 frequently involve multi-service setups, webhook security, OAuth flows, or WebSockets. Watch for subtree/monorepo URLs (#32, #47) and whitespace anomalies (#49) flagged in verification metadata.",
    outcomes: [
      "Implement role-based authorization, webhook signature verification, and server-side pagination.",
      "Integrate external SDKs (Stripe, WebRTC/Socket.IO, object storage, headless CMS) behind cleanly isolated service layers.",
      "Instrument automated component and API regression suites before deploying.",
    ],
    recommendedSkills: [
      "PostgreSQL & Prisma ORM",
      "Authentication & RBAC",
      "Real-Time Sockets & Streaming",
      "Background Jobs & Webhooks",
      "Integration & Contract Testing",
    ],
  },
  advanced: {
    level: "advanced",
    title: "Advanced Architecture Track",
    rangeLabel: "Projects 51–100",
    minNumber: 51,
    maxNumber: 100,
    summary:
      "Engineer multi-tenant SaaS systems, collaborative canvas tools, distributed queues, microservices, and enterprise security boundaries.",
    complexityNote:
      "Positions 51–100 include 23 specified complex repositories plus 27 reserved slots (51–59, 66–74, 85–93) explicitly marked as awaiting source data. Actual codebase difficulty varies widely and should always be audited per repo.",
    outcomes: [
      "Design fault-tolerant multi-tenant schemas, caching strategies, and rate-limited external integrations.",
      "Modernize monorepos, GraphQL/tRPC APIs, microservices, and complex canvas or IDE interfaces.",
      "Enforce security hardening, Playwright E2E coverage, observability, and CI/CD gates.",
    ],
    recommendedSkills: [
      "Distributed Architecture & Queues",
      "Multi-Tenant Postgres Isolation",
      "GraphQL / Microservices",
      "Performance & Web Vitals Auditing",
      "End-to-End CI/CD Verification",
    ],
  },
};

export function getVerificationMeta(status: VerificationStatus): {
  label: string;
  classes: string;
} {
  switch (status) {
    case "verified":
      return {
        label: "Verified",
        classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      };
    case "needs-review":
      return {
        label: "Needs Review",
        classes: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      };
    case "archived":
      return {
        label: "Archived",
        classes: "border-slate-500/30 bg-slate-500/10 text-slate-400",
      };
    case "unavailable":
      return {
        label: "Unavailable",
        classes: "border-red-500/30 bg-red-500/10 text-red-400",
      };
    case "incorrect-link":
      return {
        label: "Link Anomaly",
        classes: "border-orange-500/30 bg-orange-500/10 text-orange-400",
      };
    case "collection-only":
      return {
        label: "Collection Only",
        classes: "border-sky-500/30 bg-sky-500/10 text-sky-400",
      };
    default:
      return {
        label: "Unchecked",
        classes: "border-border bg-muted text-muted-foreground",
      };
  }
}
