import { describe, expect, it } from "vitest";
import {
  mapPrismaActivity,
  mapPrismaDeployment,
  mapPrismaMilestone,
  mapPrismaNote,
  mapPrismaRoadmap,
  parseMilestoneDueDate,
  toAppDifficulty,
  toAppProjectStatus,
  toAppRoadmapStatus,
  toAppVerificationStatus,
  toPrismaProjectStatus,
  toPrismaRoadmapStatus,
  toPrismaVerificationStatus,
} from "@/lib/prisma-mappers";

describe("Prisma DTO Mappers and Value Converters", () => {
  describe("Enum Bidirectional Mappings", () => {
    it("converts ProjectStatus between Prisma and App DTOs accurately", () => {
      expect(toAppProjectStatus("in_development")).toBe("in-development");
      expect(toAppProjectStatus("awaiting")).toBe("awaiting");
      expect(toAppProjectStatus("completed")).toBe("completed");

      expect(toPrismaProjectStatus("in-development")).toBe("in_development");
      expect(toPrismaProjectStatus("awaiting")).toBe("awaiting");
      expect(toPrismaProjectStatus("completed")).toBe("completed");
    });

    it("converts VerificationStatus between Prisma and App DTOs accurately", () => {
      expect(toAppVerificationStatus("needs_review")).toBe("needs-review");
      expect(toAppVerificationStatus("incorrect_link")).toBe("incorrect-link");
      expect(toAppVerificationStatus("collection_only")).toBe("collection-only");
      expect(toAppVerificationStatus("verified")).toBe("verified");

      expect(toPrismaVerificationStatus("needs-review")).toBe("needs_review");
      expect(toPrismaVerificationStatus("incorrect-link")).toBe("incorrect_link");
      expect(toPrismaVerificationStatus("collection-only")).toBe("collection_only");
      expect(toPrismaVerificationStatus("verified")).toBe("verified");
    });

    it("converts RoadmapStatus between Prisma and App DTOs accurately", () => {
      expect(toAppRoadmapStatus("in_progress")).toBe("in-progress");
      expect(toAppRoadmapStatus("pending")).toBe("pending");
      expect(toAppRoadmapStatus("completed")).toBe("completed");

      expect(toPrismaRoadmapStatus("in-progress")).toBe("in_progress");
      expect(toPrismaRoadmapStatus("pending")).toBe("pending");
      expect(toPrismaRoadmapStatus("completed")).toBe("completed");
    });

    it("converts Difficulty safely", () => {
      expect(toAppDifficulty("beginner")).toBe("beginner");
      expect(toAppDifficulty("intermediate")).toBe("intermediate");
      expect(toAppDifficulty("advanced")).toBe("advanced");
    });
  });

  describe("Record Mappers & Date Handling", () => {
    it("maps milestone dates deterministically without local timezone shift", () => {
      const parsedUtc = parseMilestoneDueDate("2026-11-15");
      expect(parsedUtc?.toISOString()).toBe("2026-11-15T00:00:00.000Z");

      const milestoneDto = mapPrismaMilestone({
        id: "m-1",
        projectId: "project-1",
        title: "Initial Launch",
        dueDate: parsedUtc,
        completed: false,
        completedAt: null,
      });

      expect(milestoneDto.dueDate).toBe("2026-11-15");
      expect(milestoneDto.completed).toBe(false);
      expect(milestoneDto.completedAt).toBeNull();
    });

    it("rejects invalid calendar dates during milestone parsing", () => {
      expect(() => parseMilestoneDueDate("2026-02-30")).toThrow(
        'Invalid calendar milestone dueDate "2026-02-30"',
      );
      expect(parseMilestoneDueDate(null)).toBeNull();
      expect(parseMilestoneDueDate("")).toBeNull();
    });

    it("maps notes, deployments, roadmaps, and activities cleanly to application DTOs", () => {
      const now = new Date("2026-11-12T12:00:00.000Z");

      const noteDto = mapPrismaNote({
        id: "n-1",
        projectId: "project-1",
        userId: "user-1",
        title: "DB Architecture",
        content: "Using Prisma and PostgreSQL",
        type: "architecture",
        createdAt: now,
        updatedAt: now,
      });
      expect(noteDto.type).toBe("architecture");
      expect(noteDto.createdAt).toBe("2026-11-12T12:00:00.000Z");

      const depDto = mapPrismaDeployment({
        id: "d-1",
        projectId: "project-1",
        environment: "production",
        url: "https://demo.vercel.app",
        provider: "Vercel",
        status: "active",
        deployedAt: now,
        notes: "Initial deployment",
      });
      expect(depDto.environment).toBe("production");
      expect(depDto.status).toBe("active");

      const roadmapDto = mapPrismaRoadmap({
        id: "r-1",
        projectId: "project-1",
        phase: 1,
        title: "Acquisition",
        description: "Cloned upstream",
        status: "in_progress",
        order: 1,
      });
      expect(roadmapDto.status).toBe("in-progress");

      const actDto = mapPrismaActivity({
        id: "a-1",
        projectId: "project-1",
        userId: "user-1",
        action: "task.created",
        summary: "Created task #1",
        createdAt: now,
      });
      expect(actDto.action).toBe("task.created");
    });
  });
});
