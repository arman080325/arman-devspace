import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createStoreBackup,
  mapDeploymentEnvironment,
  mapDeploymentStatus,
  mapNoteType,
  mapProjectStatus,
  mapRoadmapStatus,
  mapVerificationStatus,
  parseIsoDateOrNull,
  parseMilestoneDueDateOrNull,
  runJsonMigration,
  type StoreShapeJson,
  validateAndPlanMigration,
} from "../../prisma/migrate-json";

describe("JSON Migration Utility", () => {
  describe("Enum & Date Transformations", () => {
    it("maps project statuses (including kebab-case) strictly", () => {
      expect(mapProjectStatus("in-development")).toBe("in_development");
      expect(mapProjectStatus("in_development")).toBe("in_development");
      expect(mapProjectStatus("awaiting")).toBe("awaiting");
      expect(mapProjectStatus("completed")).toBe("completed");
      expect(() => mapProjectStatus("non-existent-status")).toThrow();
    });

    it("maps verification statuses strictly", () => {
      expect(mapVerificationStatus("needs-review")).toBe("needs_review");
      expect(mapVerificationStatus("verified")).toBe("verified");
      expect(mapVerificationStatus("incorrect-link")).toBe("incorrect_link");
      expect(mapVerificationStatus("collection-only")).toBe("collection_only");
      expect(() => mapVerificationStatus("bad-status")).toThrow();
    });

    it("maps note, roadmap, and deployment enums accurately", () => {
      expect(mapNoteType("architecture")).toBe("architecture");
      expect(mapRoadmapStatus("in-progress")).toBe("in_progress");
      expect(mapDeploymentEnvironment("production")).toBe("production");
      expect(mapDeploymentStatus("active")).toBe("active");
    });

    it("parses ISO timestamps and calendar due dates deterministically", () => {
      expect(parseIsoDateOrNull("2026-11-12T14:12:30.134Z")?.toISOString()).toBe(
        "2026-11-12T14:12:30.134Z",
      );
      expect(parseIsoDateOrNull(null)).toBeNull();
      expect(() => parseIsoDateOrNull("not-a-date")).toThrow();

      expect(parseMilestoneDueDateOrNull("2026-11-15")?.toISOString()).toBe(
        "2026-11-15T00:00:00.000Z",
      );
      expect(parseMilestoneDueDateOrNull(null)).toBeNull();
      expect(() => parseMilestoneDueDateOrNull("2026-02-30")).toThrow();
    });
  });

  describe("Validation & Planning Engine", () => {
    const mockDbCtx = {
      existingUsers: [
        {
          id: "user-arman",
          email: "arman@devspace.local",
          passwordHash: null,
          supabaseId: null,
          role: "owner",
        },
      ],
      existingProjectIds: new Set(["project-1", "project-2"]),
    };

    it("reconciles user identity by email to existing user-arman without overwriting passwordHash", () => {
      const store: StoreShapeJson = {
        users: [
          {
            id: "user-old-123",
            email: "ARMAN@devspace.local",
            name: "Arman",
            passwordHash: "hash-from-json",
          },
        ],
        progress: {
          "user-old-123:project-1": {
            userId: "user-old-123",
            projectId: "project-1",
            status: "in-development",
          },
        },
      };

      const plan = validateAndPlanMigration(store, mockDbCtx, { mode: "dry-run" }, null);

      expect(plan.validations.passed).toBe(true);
      expect(plan.resolvedUsers["user-old-123"]).toBe("user-arman");
      expect(plan.counts.users.toUpdate).toBe(1);
      expect(plan.counts.progress.toCreate).toBe(1);
    });

    it("detects conflicting user IDs and emails", () => {
      const store: StoreShapeJson = {
        users: [
          {
            id: "user-arman",
            email: "different-user@example.com",
            name: "Conflict User",
          },
        ],
      };

      const plan = validateAndPlanMigration(store, mockDbCtx, { mode: "dry-run" }, null);

      expect(plan.validations.passed).toBe(false);
      expect(plan.validations.errors[0]).toContain("Conflict: JSON user id");
    });

    it("detects unknown project references", () => {
      const store: StoreShapeJson = {
        users: [
          {
            id: "user-1",
            email: "user1@example.com",
            name: "Dev 1",
          },
        ],
        tasks: [
          {
            projectId: "unknown-project-999",
            userId: "user-1",
            title: "Task 1",
          },
        ],
      };

      const plan = validateAndPlanMigration(store, mockDbCtx, { mode: "dry-run" }, null);

      expect(plan.validations.passed).toBe(false);
      expect(plan.validations.errors[0]).toContain(
        'Task references unknown projectId "unknown-project-999"',
      );
    });

    it("flags duplicate roadmap phases for the same project and user", () => {
      const store: StoreShapeJson = {
        users: [
          {
            id: "user-1",
            email: "user1@example.com",
            name: "Dev 1",
          },
        ],
        roadmaps: {
          "user-1:project-1": [
            { phase: 1, title: "Phase 1A", description: "Desc A" },
            { phase: 1, title: "Phase 1B", description: "Desc B" },
          ],
        },
      };

      const plan = validateAndPlanMigration(store, mockDbCtx, { mode: "dry-run" }, null);

      expect(plan.validations.passed).toBe(false);
      expect(plan.validations.errors[0]).toContain("Duplicate roadmap phase 1");
    });
  });

  describe("File Backup & Dry-Run Integrity", () => {
    it("reports cleanly when source file does not exist", async () => {
      const result = await runJsonMigration({
        mode: "dry-run",
        sourcePath: "data/non-existent-store.json",
      });

      expect(result.sourceExists).toBe(false);
      expect(result.validations.passed).toBe(true);
      expect(result.validations.warnings[0]).toContain("Source file does not exist");
      expect(result.counts.progress.toCreate).toBe(0);
    });

    it("creates and verifies a timestamped backup before apply", async () => {
      const tempDir = path.join(process.cwd(), "data", "test-backup-tmp");
      const tempSource = path.join(tempDir, "store.json");
      const tempBackupDir = path.join(tempDir, "backups");

      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(tempSource, JSON.stringify({ users: [], progress: {} }), "utf8");

      try {
        const backupPath = await createStoreBackup(tempSource, tempBackupDir);
        expect(backupPath).not.toBeNull();
        if (backupPath) {
          const exists = await fs
            .stat(backupPath)
            .then(() => true)
            .catch(() => false);
          expect(exists).toBe(true);
          const raw = await fs.readFile(backupPath, "utf8");
          expect(raw).toBe(JSON.stringify({ users: [], progress: {} }));
        }
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
