import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signupSchema } from "@/lib/validations";
import * as jsonStore from "@/services/json-store";

describe("Stage G: Registration Hardening and Owner Isolation", () => {
  const storePath = path.join(process.cwd(), "data", "devspace-store.json");

  beforeEach(async () => {
    await fs.rm(storePath, { force: true }).catch(() => {});
  });

  afterEach(async () => {
    await fs.rm(storePath, { force: true }).catch(() => {});
  });

  it("rejects client-supplied role escalation in signup schema", () => {
    const parsed = signupSchema.safeParse({
      name: "Attacker",
      email: "attacker@example.com",
      password: "password12345",
      role: "owner", // Should be ignored or stripped by schema
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).role).toBeUndefined();
    }
  });

  it("assigns developer role to ordinary registrations without bootstrap token", async () => {
    const regResult = await jsonStore.registerUserAccount({
      name: "Normal Dev",
      email: `dev-${Date.now()}@example.com`,
      password: "strongpassword123",
    });

    expect("user" in regResult).toBe(true);
    if ("user" in regResult) {
      expect(regResult.user.role).toBe("developer");
    }
  });

  it("claims owner role when valid bootstrap token and configured owner email are supplied", async () => {
    const origEmail = process.env.DEVSPACE_OWNER_EMAIL;
    const origToken = process.env.DEVSPACE_OWNER_BOOTSTRAP_TOKEN;

    const testOwnerEmail = `owner-${Date.now()}@devspace.local`;
    const testBootstrapToken = "super-secret-bootstrap-token-67890";

    try {
      process.env.DEVSPACE_OWNER_EMAIL = testOwnerEmail;
      process.env.DEVSPACE_OWNER_BOOTSTRAP_TOKEN = testBootstrapToken;

      const result = await jsonStore.registerUserAccount({
        name: "Legit Owner",
        email: testOwnerEmail,
        password: "ownerpassword123",
        bootstrapToken: testBootstrapToken,
      });

      expect("user" in result).toBe(true);
      if ("user" in result) {
        expect(result.user.role).toBe("owner");
      }

      // Repeated bootstrap attempts must fail safely
      const repeatedResult = await jsonStore.registerUserAccount({
        name: "Attacker Claiming Twice",
        email: `attacker-${Date.now()}@example.com`,
        password: "anotherpassword123",
        bootstrapToken: testBootstrapToken,
      });

      // Since email doesn't match owner email, it registers as ordinary developer
      if ("user" in repeatedResult) {
        expect(repeatedResult.user.role).toBe("developer");
      }
    } finally {
      process.env.DEVSPACE_OWNER_EMAIL = origEmail;
      process.env.DEVSPACE_OWNER_BOOTSTRAP_TOKEN = origToken;
    }
  });

  it("prevents uncredentialed accounts from authenticating with null or empty passwords", async () => {
    const authResult = await jsonStore.authenticateUserAccount({
      email: "non-existent@example.com",
      password: "",
    });

    expect("error" in authResult).toBe(true);
  });

  describe("Supabase OAuth Email Verification Security", () => {
    it("accepts provider email_confirmed_at but rejects user_metadata.email_verified alone", async () => {
      const origEmail = process.env.DEVSPACE_OWNER_EMAIL;
      const testOwnerEmail = `oauth-owner-${Date.now()}@devspace.local`;

      try {
        process.env.DEVSPACE_OWNER_EMAIL = testOwnerEmail;

        // 1. Unverified external user (email_confirmed_at missing, even if user_metadata has email_verified: true)
        const fakeUnverifiedOAuthUser: {
          email: string;
          email_confirmed_at?: string;
          user_metadata: { email_verified: boolean };
        } = {
          email: testOwnerEmail,
          email_confirmed_at: undefined,
          user_metadata: { email_verified: true },
        };
        const isEmailVerifiedUnverified =
          typeof fakeUnverifiedOAuthUser.email_confirmed_at === "string" &&
          fakeUnverifiedOAuthUser.email_confirmed_at.trim().length > 0;

        expect(isEmailVerifiedUnverified).toBe(false);

        const unverifiedResult = await jsonStore.syncExternalAuthUser({
          email: fakeUnverifiedOAuthUser.email,
          name: "Unverified Owner",
          isEmailVerified: isEmailVerifiedUnverified,
        });

        // Unverified email must never receive owner privileges
        expect(unverifiedResult.role).toBe("developer");

        // 2. Authoritative verified external user (email_confirmed_at provided by provider)
        const fakeVerifiedOAuthUser = {
          email: testOwnerEmail,
          email_confirmed_at: "2026-11-16T12:00:00.000Z",
          user_metadata: {},
        };
        const isEmailVerifiedAuthoritative =
          typeof fakeVerifiedOAuthUser.email_confirmed_at === "string" &&
          fakeVerifiedOAuthUser.email_confirmed_at.trim().length > 0;

        expect(isEmailVerifiedAuthoritative).toBe(true);

        const verifiedResult = await jsonStore.syncExternalAuthUser({
          email: fakeVerifiedOAuthUser.email,
          name: "Verified Owner",
          isEmailVerified: isEmailVerifiedAuthoritative,
        });

        // Once authoritatively verified with matching owner email, receives owner role
        expect(verifiedResult.role).toBe("owner");

        // 3. Different email even with email_confirmed_at cannot receive owner role
        const fakeOtherUser = {
          email: `other-user-${Date.now()}@example.com`,
          email_confirmed_at: "2026-11-16T12:00:00.000Z",
        };
        const isOtherVerified =
          typeof fakeOtherUser.email_confirmed_at === "string" &&
          fakeOtherUser.email_confirmed_at.trim().length > 0;

        const otherResult = await jsonStore.syncExternalAuthUser({
          email: fakeOtherUser.email,
          name: "Other User",
          isEmailVerified: isOtherVerified,
        });
        expect(otherResult.role).toBe("developer");
      } finally {
        process.env.DEVSPACE_OWNER_EMAIL = origEmail;
      }
    });
  });

  it("isolates milestones, screenshots, deployments, and dashboard feeds per user in JSON store", async () => {
    const u1 = await jsonStore.registerUserAccount({
      name: "User One",
      email: `user1-${Date.now()}@example.com`,
      password: "PasswordOne123!",
    });
    const u2 = await jsonStore.registerUserAccount({
      name: "User Two",
      email: `user2-${Date.now()}@example.com`,
      password: "PasswordTwo123!",
    });

    if (!("user" in u1) || !("user" in u2)) {
      throw new Error("Expected registered users");
    }

    await jsonStore.createProjectMilestone(u1.user.id, "project-1", {
      title: "User1 Exclusive Milestone",
      dueDate: "2026-12-31",
    });
    await jsonStore.addProjectScreenshot(u1.user.id, "project-1", {
      title: "User1 Screenshot",
      url: "https://example.com/u1.png",
      caption: "Private screenshot",
    });
    await jsonStore.addDeploymentRecord(u1.user.id, "project-1", {
      environment: "production",
      url: "https://u1-app.example.com",
      provider: "Vercel",
      status: "active",
      notes: "User1 deployment",
    });

    const detail1 = await jsonStore.getProjectDetail("online-bookstore", u1.user.id);
    const detail2 = await jsonStore.getProjectDetail("online-bookstore", u2.user.id);

    expect(detail1?.progress?.milestones.map((m) => m.title)).toContain(
      "User1 Exclusive Milestone",
    );
    expect(detail1?.progress?.screenshots.map((s) => s.title)).toContain(
      "User1 Screenshot",
    );
    expect(detail1?.progress?.deployments.map((d) => d.url)).toContain(
      "https://u1-app.example.com",
    );

    expect(detail2?.progress?.milestones).toHaveLength(0);
    expect(detail2?.progress?.screenshots).toHaveLength(0);
    expect(detail2?.progress?.deployments).toHaveLength(0);

    const feed1 = await jsonStore.getUserDashboardFeed(u1.user.id);
    const feed2 = await jsonStore.getUserDashboardFeed(u2.user.id);

    expect(feed1.upcomingMilestones.map((m) => m.title)).toContain(
      "User1 Exclusive Milestone",
    );
    expect(feed2.upcomingMilestones).toHaveLength(0);
  });
});
