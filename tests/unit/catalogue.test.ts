import { describe, expect, it } from "vitest";
import {
  getCanonicalProjectById,
  getCanonicalProjectByNumber,
  getCanonicalProjectBySlug,
  projects,
} from "@/data/projects";

describe("Canonical 100-project collection", () => {
  it("contains strictly 100 sequential positions ordered 1 through 100", () => {
    expect(projects).toHaveLength(100);
    projects.forEach((project, idx) => {
      expect(project.number).toBe(idx + 1);
    });
  });

  it("contains 73 specified entries and 27 reserved placeholder slots", () => {
    const placeholders = projects.filter((p) => p.isPlaceholder);
    const defined = projects.filter((p) => !p.isPlaceholder);

    expect(defined).toHaveLength(73);
    expect(placeholders).toHaveLength(27);

    const placeholderNumbers = placeholders.map((p) => p.number);
    expect(placeholderNumbers).toEqual([
      51, 52, 53, 54, 55, 56, 57, 58, 59, 66, 67, 68, 69, 70, 71, 72, 73, 74, 85, 86, 87,
      88, 89, 90, 91, 92, 93,
    ]);

    for (const p of placeholders) {
      expect(p.originalRepoUrl).toBeNull();
      expect(p.verifiedRepoUrl).toBeNull();
    }
  });

  it("maintains unique slugs and IDs across all 100 entries", () => {
    const slugs = new Set(projects.map((p) => p.slug));
    const ids = new Set(projects.map((p) => p.id));

    expect(slugs.size).toBe(100);
    expect(ids.size).toBe(100);
  });

  it("maps difficulty boundaries consistently across 1-30, 31-50, and 51-100", () => {
    for (const p of projects) {
      if (p.number <= 30) expect(p.difficulty).toBe("beginner");
      else if (p.number <= 50) expect(p.difficulty).toBe("intermediate");
      else expect(p.difficulty).toBe("advanced");
    }
  });

  it("preserves canonical lookups and discrepancy audit notes cleanly", () => {
    const first = getCanonicalProjectByNumber(1);
    expect(first?.title).toBe("Online Bookstore");
    expect(first?.slug).toBe("online-bookstore");
    expect(first?.originalRepoUrl).toBe("https://github.com/DarkSoul26/bookstore-mern");

    const bySlug = getCanonicalProjectBySlug("quiz-game-multiplayer");
    expect(bySlug?.number).toBe(24);
    expect(bySlug?.verificationStatus).toBe("needs-review");
    expect(bySlug?.discrepancyNotes).toBeTruthy();

    const slot28 = getCanonicalProjectByNumber(28);
    expect(slot28?.originalRepoUrl).toContain(" ");
    expect(slot28?.verifiedRepoUrl).toBeNull();
    expect(slot28?.verificationStatus).toBe("incorrect-link");
    expect(slot28?.discrepancyNotes).toBeTruthy();

    const slot49 = getCanonicalProjectByNumber(49);
    expect(slot49?.originalRepoUrl).toContain(" ");

    const slot18 = getCanonicalProjectById(projects[17].id);
    expect(slot18?.verificationStatus).toBe("collection-only");
  });
});
