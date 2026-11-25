import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetPrismaClient, getPrismaClient, isDatabaseConfigured } from "@/lib/prisma";

describe("Prisma Runtime Client Lifecycle & Explicit Datasource Binding", () => {
  const originalEnv = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    _resetPrismaClient();
  });

  afterEach(() => {
    _resetPrismaClient();
    process.env.DATABASE_URL = originalEnv;
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("returns false for isDatabaseConfigured when DATABASE_URL is missing, empty, or whitespace", () => {
    delete process.env.DATABASE_URL;
    expect(isDatabaseConfigured()).toBe(false);

    process.env.DATABASE_URL = "";
    expect(isDatabaseConfigured()).toBe(false);

    process.env.DATABASE_URL = "   ";
    expect(isDatabaseConfigured()).toBe(false);
  });

  it("returns true for isDatabaseConfigured when DATABASE_URL is provided", () => {
    process.env.DATABASE_URL =
      "postgresql://user:pass@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
    expect(isDatabaseConfigured()).toBe(true);
  });

  it("returns null when DATABASE_URL is absent or blank, failing safely without connecting", () => {
    delete process.env.DATABASE_URL;
    expect(getPrismaClient()).toBeNull();

    process.env.DATABASE_URL = "   ";
    expect(getPrismaClient()).toBeNull();
  });

  it("instantiates PrismaClient with the explicit DATABASE_URL datasource and preserves singleton identity", () => {
    const testUrl =
      "postgresql://postgres.test:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
    process.env.DATABASE_URL = testUrl;

    const client1 = getPrismaClient();
    expect(client1).not.toBeNull();
    expect(typeof client1?.$connect).toBe("function");
    expect(typeof client1?.$disconnect).toBe("function");

    const client2 = getPrismaClient();
    // Strict singleton preservation within the process
    expect(client2 === client1).toBe(true);
  });

  it("resets singleton cleanly when _resetPrismaClient is invoked", () => {
    process.env.DATABASE_URL =
      "postgresql://postgres.test:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

    const client1 = getPrismaClient();
    expect(client1).not.toBeNull();
    expect(typeof client1?.$connect).toBe("function");

    _resetPrismaClient();

    const client2 = getPrismaClient();
    expect(client2).not.toBeNull();
    expect(typeof client2?.$connect).toBe("function");
    expect(client2 === client1).toBe(false);
  });
});
