import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivityFeed, syncProjectActivityIntelligence } from "@/services/activity";
import * as devspaceStore from "@/services/devspace-store";
import * as githubService from "@/services/github";
import * as vercelService from "@/services/vercel";
import type { ProjectActivityItem } from "@/types/project";

describe("Activity Center End-to-End Intelligence Integration", () => {
  let storedActivities: ProjectActivityItem[] = [];

  beforeEach(() => {
    storedActivities = [];

    vi.spyOn(devspaceStore, "createActivityRecord").mockImplementation(async (input) => {
      const item: ProjectActivityItem = {
        id: `act-${storedActivities.length + 1}`,
        userId: input.userId,
        projectId: input.projectId,
        action: input.action,
        summary: input.summary,
        createdAt: new Date().toISOString(),
      };
      storedActivities.push(item);
      return item;
    });

    vi.spyOn(devspaceStore, "getUserActivities").mockImplementation(async (userId) => {
      return storedActivities
        .filter((a) => a.userId === userId)
        .map((a) => ({
          ...a,
          projectTitle: "Audio Analysis Engine",
          projectSlug: "audio-analysis-engine",
          projectNumber: 1,
        }));
    });

    vi.spyOn(devspaceStore, "getProjectDetail").mockResolvedValue({
      project: {
        id: "project-1",
        number: 1,
        slug: "audio-analysis-engine",
        title: "Audio Analysis Engine",
        description: "Test description",
        difficulty: "intermediate",
        complexityReviewed: "intermediate",
        category: "Audio",
        originalRepoUrl: "https://github.com/org/audio-analysis",
        verifiedRepoUrl: "https://github.com/org/audio-analysis",
        discrepancyNotes: null,
        verificationStatus: "verified",
        isPlaceholder: false,
        learningObjectives: [],
        existingFeatures: [],
        missingFeatures: [],
        recommendedStack: [],
        technologies: [],
        status: "in-development",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        repositoryMetadata: {
          projectId: "project-1",
          owner: "org",
          repoName: "audio-analysis",
          defaultBranch: "main",
          description: "Audio processing tool",
          primaryLanguage: "TypeScript",
          stars: 120,
          forks: 15,
          openIssues: 2,
          lastUpdated: new Date().toISOString(),
          isArchived: false,
          hasReadme: true,
          license: "MIT",
          topics: ["audio"],
          frameworkVersions: undefined,
          dependencySummary: null,
          activityLevel: "active",
          verifiedAt: new Date().toISOString(),
          latestRelease: {
            tagName: "v2.0.0",
            name: "Release 2.0.0",
            publishedAt: new Date().toISOString(),
            url: "https://github.com/org/audio-analysis/releases/tag/v2.0.0",
          },
        },
      },
      progress: null,
    });
  });

  it("ingests GitHub Actions workflow runs, releases, and Vercel deployments", async () => {
    vi.spyOn(githubService, "fetchRepositoryWorkflowRuns").mockResolvedValue({
      available: true,
      totalCount: 1,
      runs: [
        {
          id: 7001,
          name: "CI Pipeline",
          status: "completed",
          conclusion: "success",
          branch: "main",
          commitSha: "f00ba42c0de",
          commitShortSha: "f00ba42",
          url: "https://github.com/org/audio-analysis/actions/runs/7001",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          event: "push",
          actor: "dev",
        },
      ],
    });

    vi.spyOn(vercelService, "isVercelConfigured").mockReturnValue(true);
    vi.spyOn(vercelService, "fetchVercelDeployments").mockResolvedValue({
      configured: true,
      deployments: [
        {
          uid: "dpl_vercel_001",
          name: "audio-analysis-engine",
          url: "audio-analysis.vercel.app",
          created: Date.now(),
          state: "READY",
          creator: { username: "arman" },
          inspectorUrl: "https://vercel.com/inspect/dpl_001",
        },
      ],
    });

    const result = await syncProjectActivityIntelligence(
      "user-arman",
      "audio-analysis-engine",
    );

    expect(result.synced).toBe(true);
    // Should have created CI run + Release detected + Vercel deployment ready = 3 events
    expect(result.newEventsCount).toBe(3);

    const feed = await getActivityFeed("user-arman");
    expect(feed.events).toHaveLength(3);

    const ciEvent = feed.events.find((e) => e.category === "ci");
    expect(ciEvent).toBeDefined();
    expect(ciEvent?.severity).toBe("success");
    expect(ciEvent?.title).toContain('CI Workflow "CI Pipeline" success');

    const releaseEvent = feed.events.find((e) => e.type === "github.release.detected");
    expect(releaseEvent).toBeDefined();
    expect(releaseEvent?.title).toContain("Release v2.0.0 Detected");

    const vercelEvent = feed.events.find((e) => e.category === "deployment");
    expect(vercelEvent).toBeDefined();
    expect(vercelEvent?.severity).toBe("success");
    expect(vercelEvent?.title).toContain("Vercel Deployment ready");
  });

  it("is completely idempotent on repeated synchronizations", async () => {
    vi.spyOn(githubService, "fetchRepositoryWorkflowRuns").mockResolvedValue({
      available: true,
      totalCount: 1,
      runs: [
        {
          id: 7001,
          name: "CI Pipeline",
          status: "completed",
          conclusion: "success",
          branch: "main",
          commitSha: "f00ba42c0de",
          commitShortSha: "f00ba42",
          url: "https://github.com/org/audio-analysis/actions/runs/7001",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          event: "push",
          actor: "dev",
        },
      ],
    });

    vi.spyOn(vercelService, "isVercelConfigured").mockReturnValue(true);
    vi.spyOn(vercelService, "fetchVercelDeployments").mockResolvedValue({
      configured: true,
      deployments: [
        {
          uid: "dpl_vercel_001",
          name: "audio-analysis-engine",
          url: "audio-analysis.vercel.app",
          created: Date.now(),
          state: "READY",
          creator: { username: "arman" },
        },
      ],
    });

    // Run 1: discovers and persists events
    const firstSync = await syncProjectActivityIntelligence(
      "user-arman",
      "audio-analysis-engine",
    );
    expect(firstSync.newEventsCount).toBe(3);

    // Run 2: same telemetry, zero duplicate events created!
    const secondSync = await syncProjectActivityIntelligence(
      "user-arman",
      "audio-analysis-engine",
    );
    expect(secondSync.newEventsCount).toBe(0);

    const feed = await getActivityFeed("user-arman");
    expect(feed.events).toHaveLength(3); // Count remains strictly 3!
  });

  it("handles unconfigured Vercel and GitHub errors gracefully without throwing", async () => {
    vi.spyOn(githubService, "fetchRepositoryWorkflowRuns").mockRejectedValue(
      new Error("GitHub API unreachable"),
    );
    vi.spyOn(vercelService, "isVercelConfigured").mockReturnValue(false);

    const result = await syncProjectActivityIntelligence(
      "user-arman",
      "audio-analysis-engine",
    );

    expect(result.synced).toBe(true);
    // Release still indexed from metadata
    expect(result.newEventsCount).toBe(1);
  });
});
