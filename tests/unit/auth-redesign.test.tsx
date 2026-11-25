import React from "react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthForm } from "@/components/auth/auth-form";
import { getSafeRedirectPath } from "@/lib/api-helpers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { saveWorkspacePreferences } from "@/lib/preferences";
import { proxy } from "@/proxy";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => "/login",
}));

describe("Milestone 7 — Authentication Polish, Security & Route Protection", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockClear();
    mockRefresh.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Open Redirect & Proxy Protection", () => {
    it("blocks protocol-relative, backslash, external, and control-char open redirects", () => {
      expect(getSafeRedirectPath("https://evil.com/steal", "/dashboard")).toBe(
        "/dashboard",
      );
      expect(getSafeRedirectPath("//evil.com/steal", "/dashboard")).toBe("/dashboard");
      expect(getSafeRedirectPath("/\\evil.com/steal", "/dashboard")).toBe("/dashboard");
      expect(getSafeRedirectPath("/projects?tab=github", "/dashboard")).toBe(
        "/projects?tab=github",
      );
      expect(getSafeRedirectPath("/settings?section=integrations", "/dashboard")).toBe(
        "/settings?section=integrations",
      );
    });

    it("redirects unauthenticated requests for protected routes including /settings and /activity", () => {
      for (const path of ["/settings", "/activity", "/dashboard", "/kanban"]) {
        const req = new NextRequest(`http://localhost:3000${path}`);
        const res = proxy(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location");
        expect(location).toContain(`/login?redirect=${encodeURIComponent(path)}`);
      }
    });

    it("sets X-Robots-Tag and security headers when session cookie is present", () => {
      const req = new NextRequest("http://localhost:3000/settings", {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=dummy.jwt.token`,
        },
      });
      const res = proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    });
  });

  describe("AuthForm UX, Accessibility & Validation", () => {
    it("renders login form with semantic autofill attributes, password visibility toggle, and invalid credential handling", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Invalid email or password." }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<AuthForm mode="login" initialError="Your session has expired." />);

      expect(screen.getByRole("alert")).toHaveTextContent("Your session has expired.");

      const emailInput = screen.getByLabelText(/Email address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      expect(emailInput).toHaveAttribute("autocomplete", "username");
      expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleBtn = screen.getByRole("button", { name: /Show password/i });
      expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByRole("button", { name: /Hide password/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      fireEvent.change(emailInput, { target: { value: "arman@devspace.dev" } });
      fireEvent.change(passwordInput, { target: { value: "wrong-password" } });
      fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/auth/login",
          expect.objectContaining({ method: "POST" }),
        );
      });

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Invalid email or password.",
      );
    });

    it("honors explicit redirect over preference, or uses saved landing preference when implicit", async () => {
      saveWorkspacePreferences({ landingRoute: "/projects" });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: "u1" } }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(<AuthForm mode="login" hasExplicitRedirect={false} />);

      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: "dev@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "valid-secret-123" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/projects");
      });
    });

    it("renders register form without false owner-privilege claim and validates password rules", async () => {
      render(<AuthForm mode="register" />);

      expect(
        screen.queryByText(/first registered account receives workspace owner/i),
      ).not.toBeInTheDocument();

      const pwInput = screen.getByLabelText(/^Password/i, { selector: "input" });
      expect(pwInput).toHaveAttribute("autocomplete", "new-password");

      fireEvent.change(screen.getByLabelText(/Full name/i), {
        target: { value: "Developer User" },
      });
      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: "dev@example.com" },
      });
      fireEvent.change(pwInput, { target: { value: "short" } });
      fireEvent.blur(pwInput);

      expect(
        await screen.findByText(/Password must be at least 8 characters/i),
      ).toBeInTheDocument();
      expect(pwInput).toHaveAttribute("aria-invalid", "true");
    });
  });
});
