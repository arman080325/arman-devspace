import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getCanonicalProjectBySlug, projects } from "@/data/projects";

describe("Milestone 8 — Robots, Sitemap & Canonical Registry Audit", () => {
  it("disallows private workspace, activity, settings, and auth routes in robots.txt", () => {
    const config = robots();
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];

    expect(disallow).toEqual(
      expect.arrayContaining([
        "/dashboard",
        "/activity",
        "/kanban",
        "/journal",
        "/analytics",
        "/settings",
        "/login",
        "/register",
        "/api/",
      ]),
    );
  });

  it("preserves strictly 100 canonical projects (#001-#100) in catalog and sitemap", () => {
    expect(projects).toHaveLength(100);
    expect(projects.map((p) => p.number)).toEqual(
      Array.from({ length: 100 }, (_, i) => i + 1),
    );
    expect(getCanonicalProjectBySlug("online-bookstore")?.id).toBe("project-1");

    const entries = sitemap();
    expect(entries.length).toBe(107); // 7 static public routes + 100 canonical project routes
  });
});
