import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { SessionUser } from "@/types/project";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/constants";

export { SESSION_COOKIE_NAME };

let cachedSecret: Uint8Array | null = null;

function getSessionSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    cachedSecret = new TextEncoder().encode(envSecret);
    return cachedSecret;
  }

  // Persist an auto-generated random secret locally in gitignored data/ so
  // sessions survive restarts without storing hardcoded secrets in code.
  const secretDir = path.join(process.cwd(), "data");
  const secretFile = path.join(secretDir, ".session-secret");
  try {
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, "utf8").trim();
      if (existing.length >= 32) {
        cachedSecret = new TextEncoder().encode(existing);
        return cachedSecret;
      }
    }
    fs.mkdirSync(secretDir, { recursive: true });
    const generated = randomBytes(32).toString("hex");
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    cachedSecret = new TextEncoder().encode(generated);
    return cachedSecret;
  } catch {
    // Ephemeral fallback if filesystem is read-only (e.g. serverless build step)
    const ephemeral = randomBytes(32).toString("hex");
    cachedSecret = new TextEncoder().encode(ephemeral);
    return cachedSecret;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuffer = Buffer.from(keyHex, "hex");
    const derived = scryptSync(password, salt, 64);
    if (keyBuffer.length !== derived.length) return false;
    return timingSafeEqual(keyBuffer, derived);
  } catch {
    return false;
  }
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "Developer",
      role: payload.role === "owner" ? "owner" : "developer",
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
