import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as deleteScreenshotRoute } from "@/app/api/projects/[slug]/screenshots/route";
import * as apiHelpers from "@/lib/api-helpers";
import * as devspaceStore from "@/services/devspace-store";
import * as jsonStore from "@/services/json-store";

describe("Project Screenshot API Authorization and Deletion", () => {
  const user1 = {
    id: "user-1",
    email: "user1@example.com",
    name: "User One",
    role: "owner" as const,
  };

  const user2 = {
    id: "user-2",
    email: "user2@example.com",
    name: "User Two",
    role: "owner" as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest(
      "http://localhost:3000/api/projects/online-bookstore/screenshots?screenshotId=s-1",
      { method: "DELETE" },
    );
    const res = await deleteScreenshotRoute(req, {
      params: Promise.resolve({ slug: "online-bookstore" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for an invalid project slug", async () => {
    vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({ user: user1 });

    const req = new NextRequest(
      "http://localhost:3000/api/projects/unknown-slug/screenshots?screenshotId=s-1",
      { method: "DELETE" },
    );
    const res = await deleteScreenshotRoute(req, {
      params: Promise.resolve({ slug: "unknown-slug" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when screenshotId is missing", async () => {
    vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({ user: user1 });

    const req = new NextRequest(
      "http://localhost:3000/api/projects/online-bookstore/screenshots",
      { method: "DELETE" },
    );
    const res = await deleteScreenshotRoute(req, {
      params: Promise.resolve({ slug: "online-bookstore" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/screenshotId is required/i);
  });

  it("returns 404 when screenshot belongs to another user or does not exist", async () => {
    vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({ user: user2 });
    vi.spyOn(devspaceStore, "deleteProjectScreenshot").mockResolvedValue(false);

    const req = new NextRequest(
      "http://localhost:3000/api/projects/online-bookstore/screenshots?screenshotId=s-u1",
      { method: "DELETE" },
    );
    const res = await deleteScreenshotRoute(req, {
      params: Promise.resolve({ slug: "online-bookstore" }),
    });
    expect(res.status).toBe(404);
    expect(devspaceStore.deleteProjectScreenshot).toHaveBeenCalledWith(
      user2.id,
      "project-1",
      "s-u1",
    );
  });

  it("returns ok: true when user deletes their own screenshot", async () => {
    vi.spyOn(apiHelpers, "requireApiSession").mockResolvedValue({ user: user1 });
    vi.spyOn(devspaceStore, "deleteProjectScreenshot").mockResolvedValue(true);

    const req = new NextRequest(
      "http://localhost:3000/api/projects/online-bookstore/screenshots?screenshotId=s-u1",
      { method: "DELETE" },
    );
    const res = await deleteScreenshotRoute(req, {
      params: Promise.resolve({ slug: "online-bookstore" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(devspaceStore.deleteProjectScreenshot).toHaveBeenCalledWith(
      user1.id,
      "project-1",
      "s-u1",
    );
  });

  it("isolates screenshot deletion across users in jsonStore directly", async () => {
    const s1 = await jsonStore.addProjectScreenshot(user1.id, "project-1", {
      title: "User 1 Architecture Diagram",
      url: "https://example.com/u1-arch.png",
      caption: "User 1 only",
    });

    // User 2 cannot delete user 1's screenshot
    const user2DeleteAttempt = await jsonStore.deleteProjectScreenshot(
      user2.id,
      "project-1",
      s1.id,
    );
    expect(user2DeleteAttempt).toBe(false);

    // Deletion with mismatched projectId fails
    const wrongProjectAttempt = await jsonStore.deleteProjectScreenshot(
      user1.id,
      "project-2",
      s1.id,
    );
    expect(wrongProjectAttempt).toBe(false);

    // User 1 successfully deletes their own screenshot
    const user1Delete = await jsonStore.deleteProjectScreenshot(
      user1.id,
      "project-1",
      s1.id,
    );
    expect(user1Delete).toBe(true);

    // Subsequent deletion returns false (idempotent 404)
    const secondDelete = await jsonStore.deleteProjectScreenshot(
      user1.id,
      "project-1",
      s1.id,
    );
    expect(secondDelete).toBe(false);
  });
});
