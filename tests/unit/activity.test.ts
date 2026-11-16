import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  inferCategoryFromAction,
  inferProviderFromAction,
  inferSeverityFromAction,
  ingestActivityEvent,
  isValidActionUrl,
  parseActivityPayload,
  sanitizeMetadata,
  serializeActivityPayload,
} from "@/services/activity";
import * as devspaceStore from "@/services/devspace-store";
import type { ActivityPayload, IngestActivityInput } from "@/types/activity";

describe("Activity Center Core Service & Deduplication", () => {
  let createdRecords: Array<{
    userId: string;
    projectId: string;
    action: string;
    summary: string;
  }> = [];

  beforeEach(() => {
    createdRecords = [];

    vi.spyOn(devspaceStore, "createActivityRecord").mockImplementation(async (input) => {
      const item = {
        id: `act-${createdRecords.length + 1}`,
        userId: input.userId,
        projectId: input.projectId,
        action: input.action,
        summary: input.summary,
        createdAt: new Date().toISOString(),
      };
      createdRecords.push(input);
      return item;
    });

    vi.spyOn(devspaceStore, "getUserActivities").mockImplementation(async (userId) => {
      return createdRecords
        .filter((r) => r.userId === userId)
        .map((r, i) => ({
          id: `act-${i + 1}`,
          userId: r.userId,
          projectId: r.projectId,
          action: r.action,
          summary: r.summary,
          createdAt: new Date().toISOString(),
          projectTitle: "Test Project",
          projectSlug: "test-project",
          projectNumber: 1,
        }));
    });
  });

  describe("URL Safety Validation", () => {
    it("permits valid HTTPS URLs and internal routes", () => {
      expect(isValidActionUrl("https://github.com/org/repo/actions/runs/123")).toBe(true);
      expect(isValidActionUrl("https://vercel.com/team/project/deployments/456")).toBe(
        true,
      );
      expect(isValidActionUrl("/projects/audio-analysis-engine")).toBe(true);
      expect(isValidActionUrl(null)).toBe(true);
      expect(isValidActionUrl(undefined)).toBe(true);
    });

    it("rejects non-HTTPS and malicious protocols", () => {
      expect(isValidActionUrl("http://example.com/unsecured")).toBe(false);
      expect(isValidActionUrl("javascript:alert(1)")).toBe(false);
      expect(isValidActionUrl("data:text/html,<html>")).toBe(false);
      expect(isValidActionUrl("//evil.com")).toBe(false);
    });

    it("blocks localhost and private network addresses to prevent SSRF", () => {
      expect(isValidActionUrl("https://localhost:3000/internal")).toBe(false);
      expect(isValidActionUrl("https://127.0.0.1/admin")).toBe(false);
      expect(isValidActionUrl("https://192.168.1.1/secret")).toBe(false);
      expect(isValidActionUrl("https://10.0.0.1/metadata")).toBe(false);
      expect(isValidActionUrl("https://cluster.local/api")).toBe(false);
    });
  });

  describe("Metadata Sanitization", () => {
    it("scrubs tokens, passwords, and sensitive keys from metadata", () => {
      const raw = {
        runId: 101,
        branch: "main",
        githubToken: "ghp_secretTokenValue",
        apiPassword: "supersecretpassword",
        authorization: "Bearer sensitive",
        nested: {
          cookie: "session=xyz",
          apiKey: "my-key",
          commitSha: "abc1234",
        },
      };

      const sanitized = sanitizeMetadata(raw);
      expect(sanitized).toBeDefined();
      expect(sanitized?.runId).toBe(101);
      expect(sanitized?.branch).toBe("main");
      expect(sanitized?.githubToken).toBeUndefined();
      expect(sanitized?.apiPassword).toBeUndefined();
      expect(sanitized?.authorization).toBeUndefined();

      const nested = sanitized?.nested as Record<string, unknown>;
      expect(nested).toBeDefined();
      expect(nested.commitSha).toBe("abc1234");
      expect(nested.cookie).toBeUndefined();
      expect(nested.apiKey).toBeUndefined();
    });
  });

  describe("Payload Serialization and Legacy Parsing", () => {
    it("round-trips structured JSON payloads cleanly", () => {
      const payload: ActivityPayload = {
        title: "CI Workflow Run Succeeded",
        description: "Run #42 on branch main completed.",
        category: "ci",
        severity: "success",
        sourceProvider: "github",
        externalId: "12345",
        dedupKey: "github:run:12345:success",
        actionUrl: "https://github.com/org/repo/actions/runs/12345",
        isRead: false,
        readAt: null,
        metadata: { branch: "main" },
      };

      const serialized = serializeActivityPayload(payload);
      const parsed = parseActivityPayload(serialized, "ci.workflow_run.succeeded");

      expect(parsed.title).toBe(payload.title);
      expect(parsed.description).toBe(payload.description);
      expect(parsed.category).toBe("ci");
      expect(parsed.severity).toBe("success");
      expect(parsed.dedupKey).toBe("github:run:12345:success");
      expect(parsed.isRead).toBe(false);
      expect(parsed.actionUrl).toBe(payload.actionUrl);
    });

    it("parses legacy plain-text activity summaries with graceful inference", () => {
      const plainText = "Updated workspace engineering docs";
      const parsed = parseActivityPayload(plainText, "progress.updated");

      expect(parsed.title).toBe("Workspace Progress Updated");
      expect(parsed.description).toBe(plainText);
      expect(parsed.category).toBe("workspace");
      expect(parsed.severity).toBe("info");
      expect(parsed.sourceProvider).toBe("workspace");
      expect(parsed.isRead).toBe(false);
    });
  });

  describe("Event Classification and Category/Severity Inference", () => {
    it("infers appropriate categories from action types", () => {
      expect(inferCategoryFromAction("ci.workflow_run.failed")).toBe("ci");
      expect(inferCategoryFromAction("vercel.deployment.ready")).toBe("deployment");
      expect(inferCategoryFromAction("github.release.detected")).toBe("repository");
      expect(inferCategoryFromAction("workspace.milestone.completed")).toBe("workspace");
    });

    it("infers appropriate severities from action types", () => {
      expect(inferSeverityFromAction("ci.workflow_run.failed")).toBe("warning");
      expect(inferSeverityFromAction("vercel.deployment.failed")).toBe("critical");
      expect(inferSeverityFromAction("vercel.deployment.ready")).toBe("success");
      expect(inferSeverityFromAction("github.release.detected")).toBe("info");
      expect(inferSeverityFromAction("repository.archived")).toBe("warning");
    });

    it("infers source providers correctly", () => {
      expect(inferProviderFromAction("ci.workflow_run")).toBe("github");
      expect(inferProviderFromAction("vercel.deployment.ready")).toBe("vercel");
      expect(inferProviderFromAction("progress.updated")).toBe("workspace");
    });
  });

  describe("Event Ingestion and Deduplication Engine", () => {
    it("ingests an activity event and enforces user-scoped deduplication", async () => {
      const input: IngestActivityInput = {
        userId: "user-arman",
        projectId: "project-1",
        category: "ci",
        type: "ci.workflow_run.succeeded",
        severity: "success",
        title: "Build Succeeded",
        description: "Commit abc1234 passed all unit tests.",
        sourceProvider: "github",
        externalId: "99901",
        dedupKey: "github:run:99901:success",
        actionUrl: "https://github.com/org/repo/actions/runs/99901",
      };

      // First ingestion -> newly created
      const firstResult = await ingestActivityEvent(input);
      expect(firstResult.created).toBe(true);
      expect(firstResult.event.dedupKey).toBe("github:run:99901:success");
      expect(firstResult.event.title).toBe("Build Succeeded");
      expect(createdRecords).toHaveLength(1);

      // Repeated sync -> duplicate detected, no new record created
      const secondResult = await ingestActivityEvent(input);
      expect(secondResult.created).toBe(false);
      expect(secondResult.event.id).toBe(firstResult.event.id);
      expect(createdRecords).toHaveLength(1); // Still exactly 1 record!
    });

    it("validates required input parameters", async () => {
      await expect(
        ingestActivityEvent({
          userId: "",
          projectId: "project-1",
          category: "ci",
          type: "test",
          severity: "info",
          title: "Missing User",
          description: "Desc",
          sourceProvider: "github",
          dedupKey: "key-1",
        }),
      ).rejects.toThrow("valid userId");

      await expect(
        ingestActivityEvent({
          userId: "user-1",
          projectId: "",
          category: "ci",
          type: "test",
          severity: "info",
          title: "Missing Project",
          description: "Desc",
          sourceProvider: "github",
          dedupKey: "key-2",
        }),
      ).rejects.toThrow("valid projectId");
    });
  });
});
