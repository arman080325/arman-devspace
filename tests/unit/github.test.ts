import { describe, expect, it } from "vitest";
import { parseGitHubRepoUrl } from "@/services/github";

describe("GitHub URL parser", () => {
  it("parses standard owner/repo URLs cleanly", () => {
    const parsed = parseGitHubRepoUrl("https://github.com/DarkSoul26/bookstore-mern");
    expect(parsed).toEqual({
      owner: "DarkSoul26",
      repo: "bookstore-mern",
      hasSpaceInUrl: false,
      isSubtreePath: false,
      hasFragmentAnchor: false,
      isLikelyCollection: false,
      normalizedRepoUrl: "https://github.com/DarkSoul26/bookstore-mern",
    });
  });

  it("flags whitespace anomalies like projects #28 and #49 while normalizing", () => {
    const parsed = parseGitHubRepoUrl("https://github.com/example/task- app");
    expect(parsed?.hasSpaceInUrl).toBe(true);
    expect(parsed?.normalizedRepoUrl).toBe("https://github.com/example/task-app");
  });

  it("detects /tree/<branch> subtree URLs and collection repos", () => {
    const subtree = parseGitHubRepoUrl("https://github.com/safak/youtube/tree/quiz-app");
    expect(subtree?.isSubtreePath).toBe(true);
    expect(subtree?.normalizedRepoUrl).toBe("https://github.com/safak/youtube");

    const collection = parseGitHubRepoUrl(
      "https://github.com/enaqx/awesome-react#finance",
    );
    expect(collection?.isLikelyCollection).toBe(true);
    expect(collection?.hasFragmentAnchor).toBe(true);
  });

  it("rejects non-GitHub or incomplete URLs", () => {
    expect(parseGitHubRepoUrl("https://gitlab.com/user/repo")).toBeNull();
    expect(parseGitHubRepoUrl("https://github.com/only-owner")).toBeNull();
    expect(parseGitHubRepoUrl("not a url")).toBeNull();
  });
});
