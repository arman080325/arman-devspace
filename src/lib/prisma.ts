import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getPrismaClient(): PrismaClient | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return null;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return globalForPrisma.prisma;
}

/**
 * Resets the cached singleton client (for testing purposes only).
 */
export function _resetPrismaClient(): void {
  globalForPrisma.prisma = undefined;
}
