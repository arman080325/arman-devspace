// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  hashPassword,
  signSessionToken,
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
});
