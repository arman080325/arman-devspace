import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SettingsWorkspace } from "@/components/settings";
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  applyWorkspacePreferences,
  loadWorkspacePreferences,
  saveWorkspacePreferences,
} from "@/lib/preferences";
import { updateProfileSchema } from "@/lib/validations";
import type { OperationalDiagnostics } from "@/services/diagnostics";
import type { AccountDetails } from "@/types/project";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockSetTheme = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => "/settings",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: mockSetTheme,
  }),
}));

const sampleAccount: AccountDetails = {
  id: "user-owner-1",
  email: "arman@devspace.dev",
  name: "Arman Khan",
  role: "owner",
  avatarUrl: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  authProvider: "credentials",
  hasPassword: true,
  hasSupabase: false,
};

const sampleDiagnostics: OperationalDiagnostics = {
  timestamp: "2026-11-25T08:00:00.000Z",
  status: "healthy",
  database: {
    configured: true,
    status: "healthy",
    state: "connected",
    latencyMs: 14,
    storageMode: "postgresql",
    host: "aws-0-ap-south-1.pooler.supabase.com:6543",
  },
  github: {
    configured: true,
    connectivity: "connected",
    state: "connected",
    privateRepoCapable: true,
    detail: "Authenticated token active with private repository scope.",
    rateLimit: {
      limit: 5000,
      remaining: 4920,
      resetIso: "2026-11-25T09:00:00.000Z",
    },
  },
  vercel: {
    configured: true,
    projectConfigured: true,
    teamConfigured: false,
    status: "configured",
    state: "configured",
    detail:
      "VERCEL_TOKEN is set server-side. Run live verification to test API authentication.",
  },
  supabaseAuth: {
    configured: true,
    state: "available",
    detail:
      "Supabase public OAuth configuration present (Google provider supported via server callback).",
  },
  system: {
    nodeVersion: "v22.0.0",
    platform: "win32",
    uptimeSeconds: 120,
    environment: "test",
    memory: { heapUsedMb: 42, heapTotalMb: 64, rssMb: 96 },
  },
};

const sampleCoverage = {
  totalDefinedProjects: 100,
  syncedCount: 40,
  verifiedCount: 38,
  latestSyncedAt: "2026-11-24T12:00:00.000Z",
  persistedDeploymentsCount: 7,
  unsyncedSampleIds: ["41", "42", "43"],
};

describe("Milestone 7 — Settings, Preferences & Integrations Center", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-motion");
    document.documentElement.removeAttribute("data-density");
    mockPush.mockClear();
    mockReplace.mockClear();
    mockRefresh.mockClear();
    mockSetTheme.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Workspace Preferences Engine", () => {
    it("persists and restores valid browser preferences and applies DOM attributes", () => {
      const saved = saveWorkspacePreferences({
        landingRoute: "/projects",
        explorerView: "plates",
        reduceMotion: "reduce",
        density: "compact",
      });

      expect(saved.persisted).toBe(true);
      expect(saved.preferences).toEqual({
        landingRoute: "/projects",
        explorerView: "plates",
        reduceMotion: "reduce",
        density: "compact",
      });

      expect(loadWorkspacePreferences()).toEqual(saved.preferences);
      expect(document.documentElement.getAttribute("data-motion")).toBe("reduce");
      expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    });

    it("rejects tampered open-redirect landing routes and falls back cleanly", () => {
      window.localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({
          landingRoute: "//evil.example/phish",
          explorerView: "invalid-mode",
        }),
      );

      expect(loadWorkspacePreferences()).toEqual(DEFAULT_WORKSPACE_PREFERENCES);
    });

    it("handles unavailable browser storage gracefully without throwing", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const res = saveWorkspacePreferences({ reduceMotion: "reduce" });
      expect(res.persisted).toBe(false);
      expect(res.preferences.reduceMotion).toBe("reduce");

      applyWorkspacePreferences(DEFAULT_WORKSPACE_PREFERENCES);
      expect(document.documentElement.hasAttribute("data-motion")).toBe(false);
    });

    it("strips protected role/email fields in updateProfileSchema", () => {
      const parsed = updateProfileSchema.safeParse({
        name: "Arman Updated",
        role: "owner",
        email: "attacker@evil.com",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toEqual({ name: "Arman Updated" });
        expect((parsed.data as Record<string, unknown>).role).toBeUndefined();
      }
    });
  });

  describe("SettingsWorkspace UI", () => {
    it("renders authenticated profile, protected role notice, and persists name via PATCH /api/auth/me", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { ...sampleAccount, name: "Arman Architect" },
          profile: { ...sampleAccount, name: "Arman Architect" },
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <SettingsWorkspace
          initialSection="profile"
          initialAccount={sampleAccount}
          initialDiagnostics={sampleDiagnostics}
          integrationCoverage={sampleCoverage}
        />,
      );

      expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
      expect(screen.getByText("arman@devspace.dev")).toBeInTheDocument();
      expect(screen.getByText("Owner")).toBeInTheDocument();

      const nameInput = screen.getByLabelText(/Display name/i);
      fireEvent.change(nameInput, { target: { value: "Arman Architect" } });
      fireEvent.click(screen.getByRole("button", { name: /Save profile/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/auth/me",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ name: "Arman Architect" }),
          }),
        );
      });

      expect(
        await screen.findByText(/Display name saved and session refreshed/i),
      ).toBeInTheDocument();
    });

    it("switches themes and saves workspace motion preferences cleanly", () => {
      render(
        <SettingsWorkspace
          initialSection="appearance"
          initialAccount={sampleAccount}
          initialDiagnostics={sampleDiagnostics}
          integrationCoverage={sampleCoverage}
        />,
      );

      const dayRadio = screen.getByRole("radio", { name: /Day Shift/i });
      fireEvent.click(dayRadio);
      expect(mockSetTheme).toHaveBeenCalledWith("light");

      const reduceMotionSwitch = screen.getByRole("switch", {
        name: /Reduce motion/i,
      });
      fireEvent.click(reduceMotionSwitch);
      expect(document.documentElement.getAttribute("data-motion")).toBe("reduce");
    });

    it("switches to Account security and executes confirmed sign-out via POST /api/auth/logout", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <SettingsWorkspace
          initialSection="security"
          initialAccount={sampleAccount}
          initialDiagnostics={sampleDiagnostics}
          integrationCoverage={sampleCoverage}
        />,
      );

      expect(screen.getByText(/Local Credentials \(scrypt hash\)/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
      expect(
        screen.getByRole("dialog", { name: /Sign out of Arman/i }),
      ).toBeInTheDocument();

      const confirmButtons = screen.getAllByRole("button", { name: "Sign out" });
      fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
          method: "POST",
        });
      });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("distinguishes GitHub Connected, Vercel Configured -> Connected probe, and never leaks secrets", async () => {
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/diagnostics?probe=vercel")) {
          return {
            ok: true,
            json: async () => ({
              diagnostics: {
                ...sampleDiagnostics,
                vercel: {
                  ...sampleDiagnostics.vercel,
                  state: "connected",
                  detail:
                    "Connected to Vercel REST API (1 recent deployment records inspected).",
                  latestDeployments: [
                    {
                      uid: "dpl_1",
                      name: "arman-devspace",
                      url: "https://arman-devspace.vercel.app",
                      state: "READY",
                      target: "production",
                      created: 1732500000000,
                    },
                  ],
                },
              },
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ diagnostics: sampleDiagnostics }),
        };
      });
      vi.stubGlobal("fetch", fetchMock);

      const { container } = render(
        <SettingsWorkspace
          initialSection="integrations"
          initialAccount={sampleAccount}
          initialDiagnostics={sampleDiagnostics}
          integrationCoverage={sampleCoverage}
        />,
      );

      // GitHub Connected, Vercel Configured (not falsely connected yet!), Supabase/DB Connected
      expect(
        screen.getByText(/Authenticated token active with private repository scope/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/VERCEL_TOKEN is set server-side/i)).toBeInTheDocument();
      expect(
        screen.getByText("aws-0-ap-south-1.pooler.supabase.com:6543"),
      ).toBeInTheDocument();

      // Trigger live Vercel verification probe
      fireEvent.click(
        screen.getByRole("button", { name: /Verify & fetch deployments/i }),
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/diagnostics?probe=vercel",
          expect.objectContaining({ cache: "no-store" }),
        );
      });

      expect(await screen.findByText("arman-devspace")).toBeInTheDocument();
      const deployLink = screen.getByRole("link", { name: /Open deployment/i });
      expect(deployLink).toHaveAttribute("href", "https://arman-devspace.vercel.app");

      // Never expose raw secrets in rendered markup
      expect(container.textContent).not.toContain("ghp_");
      expect(container.textContent).not.toContain("VERCEL_TOKEN=");
    });

    it("handles unconfigured / unavailable providers without fake connect buttons", () => {
      const unconfiguredDiag: OperationalDiagnostics = {
        ...sampleDiagnostics,
        database: {
          configured: false,
          status: "local",
          state: "available",
          latencyMs: null,
          storageMode: "local-store",
          host: null,
        },
        github: {
          configured: false,
          connectivity: "unconfigured",
          state: "unavailable",
          privateRepoCapable: false,
          detail: "GITHUB_TOKEN is not configured server-side.",
          rateLimit: { limit: null, remaining: null, resetIso: null },
        },
        vercel: {
          configured: false,
          projectConfigured: false,
          teamConfigured: false,
          status: "not-configured",
          state: "unavailable",
          detail: "VERCEL_TOKEN is not configured server-side.",
        },
        supabaseAuth: {
          configured: false,
          state: "unavailable",
          detail: "Supabase OAuth environment variables are not configured.",
        },
      };

      render(
        <SettingsWorkspace
          initialSection="integrations"
          initialAccount={sampleAccount}
          initialDiagnostics={unconfiguredDiag}
          integrationCoverage={{ ...sampleCoverage, syncedCount: 0, verifiedCount: 0 }}
        />,
      );

      expect(
        screen.getByRole("button", { name: /Verify & fetch deployments/i }),
      ).toBeDisabled();
      expect(screen.getByText("Local JSON fallback")).toBeInTheDocument();
    });

    it("provides both desktop vertical nav and mobile section tabs for keyboard/responsive navigation", () => {
      render(
        <SettingsWorkspace
          initialSection="profile"
          initialAccount={sampleAccount}
          initialDiagnostics={sampleDiagnostics}
          integrationCoverage={sampleCoverage}
        />,
      );

      expect(
        screen.getByRole("navigation", { name: "Settings sections" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tablist", { name: "Settings sections" }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Workspace" }));
      expect(
        screen.getByLabelText(/Default post-login landing page/i),
      ).toBeInTheDocument();
    });
  });
});
