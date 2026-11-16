// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isEligibleOwnerExternalEmail,
  signSessionToken,
  verifyOwnerBootstrapProof,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";

describe("Authentication crypto and JWT helpers", () => {
  it("hashes passwords uniquely with random salts and verifies accurately", () => {
    const hashA = hashPassword("my-secret-password");
    const hashB = hashPassword("my-secret-password");

    expect(hashA).not.toBe(hashB);
    expect(verifyPassword("my-secret-password", hashA)).toBe(true);
    expect(verifyPassword("wrong-password", hashA)).toBe(false);
    expect(verifyPassword("anything", "malformed")).toBe(false);
  });

  it("signs and verifies session JWT payloads cleanly", async () => {
    const user = {
      id: "user-123",
      email: "arman@example.com",
      name: "Arman",
      role: "owner" as const,
    };

    const token = await signSessionToken(user);
    const verified = await verifySessionToken(token);

    expect(verified).toEqual(user);
    expect(await verifySessionToken("tampered.token.value")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
  });

  describe("Owner bootstrap proof and external verification", () => {
    it("validates high-entropy owner bootstrap token against configured owner email", () => {
      const origEmail = process.env.DEVSPACE_OWNER_EMAIL;
      const origToken = process.env.DEVSPACE_OWNER_BOOTSTRAP_TOKEN;

      try {
        process.env.DEVSPACE_OWNER_EMAIL = "arman@example.com";
        process.env.DEVSPACE_OWNER_BOOTSTRAP_TOKEN =
          "super-secret-secure-bootstrap-token-12345";

        expect(
          verifyOwnerBootstrapProof(
            "arman@example.com",
            "super-secret-secure-bootstrap-token-12345",
          ),
        ).toBe(true);
        expect(
          verifyOwnerBootstrapProof(
            " ARMAN@EXAMPLE.COM ",
            "super-secret-secure-bootstrap-token-12345",
          ),
        ).toBe(true);

        expect(
          verifyOwnerBootstrapProof("arman@example.com", "wrong-bootstrap-token-12345"),
        ).toBe(false);
        expect(
          verifyOwnerBootstrapProof(
            "attacker@example.com",
            "super-secret-secure-bootstrap-token-12345",
          ),
        ).toBe(false);
        expect(verifyOwnerBootstrapProof("arman@example.com", undefined)).toBe(false);
        expect(verifyOwnerBootstrapProof("arman@example.com", "")).toBe(false);
      } finally {
        process.env.DEVSPACE_OWNER_EMAIL = origEmail;
        process.env.DEVSPACE_OWNER_BOOTSTRAP_TOKEN = origToken;
      }
    });

    it("requires verified email from external auth provider matching configured owner", () => {
      const origEmail = process.env.DEVSPACE_OWNER_EMAIL;
      try {
        process.env.DEVSPACE_OWNER_EMAIL = "arman@example.com";

        expect(isEligibleOwnerExternalEmail("arman@example.com", true)).toBe(true);
        expect(isEligibleOwnerExternalEmail("ARMAN@EXAMPLE.COM", true)).toBe(true);
        expect(isEligibleOwnerExternalEmail("arman@example.com", false)).toBe(false);
        expect(isEligibleOwnerExternalEmail("other@example.com", true)).toBe(false);
      } finally {
        process.env.DEVSPACE_OWNER_EMAIL = origEmail;
      }
    });
  });
});
