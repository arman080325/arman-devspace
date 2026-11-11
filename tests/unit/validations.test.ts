import { describe, expect, it } from "vitest";
import {
  createDeploymentSchema,
  createNoteSchema,
  createTaskSchema,
  githubVerifySchema,
  isSafeHttpUrl,
  loginSchema,
  projectProgressUpdateSchema,
  sanitizePlainText,
  signupSchema,
} from "@/lib/validations";

describe("Validation and sanitization helpers", () => {
  it("accepts http/https URLs and blocks unsafe schemes", () => {
    expect(isSafeHttpUrl("https://github.com/arman080325/arman-devspace")).toBe(true);
    expect(isSafeHttpUrl("http://localhost:3000")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<h1>x</h1>")).toBe(false);
    expect(isSafeHttpUrl("not-a-url")).toBe(false);
  });

  it("strips unsafe control characters from plain text", () => {
    expect(sanitizePlainText("  hello\u0000world\u0007  ")).toBe("helloworld");
    expect(sanitizePlainText("line1\nline2")).toBe("line1\nline2");
  });

  it("validates signup & login forms strictly", () => {
    expect(
      signupSchema.safeParse({
        name: "Arman",
        email: "ARMAN@example.com",
        password: "strongpassword123",
      }).success,
    ).toBe(true);

    expect(
      signupSchema.safeParse({
        name: "A",
        email: "bad-email",
        password: "short",
      }).success,
    ).toBe(false);

    expect(
      loginSchema.safeParse({
        email: "dev@example.com",
        password: "",
      }).success,
    ).toBe(false);
  });

  it("validates workspace mutations against injection and malformed URLs", () => {
    expect(
      projectProgressUpdateSchema.safeParse({
        status: "in-development",
        deploymentUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);

    expect(
      projectProgressUpdateSchema.safeParse({
        status: "testing",
        localClonePath: "D:\\Workspaces\\online-bookstore",
        deploymentUrl: "https://bookstore-preview.vercel.app",
      }).success,
    ).toBe(true);

    expect(createTaskSchema.safeParse({ title: "Write tests" }).success).toBe(true);

    expect(
      createNoteSchema.safeParse({
        projectId: "proj-1",
        title: "Architecture",
        content: "Separated DB access behind services/devspace-store.",
        type: "architecture",
      }).success,
    ).toBe(true);

    expect(
      createDeploymentSchema.safeParse({
        environment: "production",
        url: "https://app.example.com",
        provider: "Vercel",
      }).success,
    ).toBe(true);

    expect(
      githubVerifySchema.safeParse({
        projectId: "proj-1",
        overrideUrl: "ftp://invalid.com/repo",
      }).success,
    ).toBe(false);
  });
});
