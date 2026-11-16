import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOperationalDiagnostics } from "@/services/diagnostics";

describe("Production Operations & Health Diagnostics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("produces structured diagnostics without leaking credentials", async () => {
    process.env.DATABASE_URL =
      "postgresql://postgres_user:super_secret_password_1234@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

    const diag = await getOperationalDiagnostics();

    expect(diag).toBeDefined();
    expect(diag.timestamp).toBeDefined();
    expect(["healthy", "degraded", "unhealthy"]).toContain(diag.status);

    // Database diagnostics
    expect(diag.database).toBeDefined();
    expect(diag.database.host).toBe("aws-0-ap-south-1.pooler.supabase.com:5432");

    // Zero secret leakage check
    const serialized = JSON.stringify(diag);
    expect(serialized).not.toContain("super_secret_password_1234");
    expect(serialized).not.toContain("postgres_user");

    // System metrics
    expect(diag.system.nodeVersion).toBeDefined();
    expect(diag.system.platform).toBeDefined();
    expect(diag.system.memory.heapUsedMb).toBeGreaterThan(0);
  });

  it("reports local storage mode cleanly when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;

    const diag = await getOperationalDiagnostics();

    expect(diag.database.configured).toBe(false);
    expect(diag.database.status).toBe("local");
    expect(diag.database.storageMode).toBe("local-store");
    expect(diag.database.host).toBeNull();
  });
});
