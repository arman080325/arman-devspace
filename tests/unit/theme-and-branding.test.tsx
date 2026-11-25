import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getWorkspaceBrandName } from "@/lib/brand";
import { Wordmark, Lockup } from "@/components/redesign/brand";
import { Sidebar, TopBar } from "@/components/shell";

// Mock next/navigation
const currentPathname = "/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mutable mock for next-themes to test theme toggle and state transition
let mockTheme = "dark";
let mockResolvedTheme = "dark";
const mockSetTheme = vi.fn((newTheme: string) => {
  mockTheme = newTheme;
  mockResolvedTheme = newTheme;
});

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: mockTheme,
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("Theme Toggle Runtime & Lifecycle Stabilization", () => {
  beforeEach(() => {
    mockTheme = "dark";
    mockResolvedTheme = "dark";
    mockSetTheme.mockClear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with type='button' and proper accessibility label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /Switch to Day Shift/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("type", "button");
  });

  it("switches theme instantly on client click without reload or navigation", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /Switch to Day Shift/i });

    // Click to toggle from dark to light
    fireEvent.click(btn);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("day");
  });

  it("switches from light back to dark on subsequent toggle", () => {
    mockTheme = "light";
    mockResolvedTheme = "light";

    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /Switch to Night Shift/i });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("night");
  });

  it("prevents accidental form submission or event propagation", () => {
    const handleSubmit = vi.fn();
    render(
      <form onSubmit={handleSubmit}>
        <ThemeToggle />
      </form>,
    );

    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(mockSetTheme).toHaveBeenCalledTimes(1);
  });

  it("synchronizes color-scheme meta and data-theme DOM attributes", () => {
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "color-scheme");
      document.head.appendChild(meta);
    }

    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);

    expect(document.documentElement.getAttribute("data-theme")).toBe("day");
    expect(meta.getAttribute("content")).toBe("light");
  });
});

describe("Dynamic Workspace Branding Logic & Presentation", () => {
  describe("getWorkspaceBrandName pure helper", () => {
    it("derives first name correctly for single names", () => {
      expect(getWorkspaceBrandName("Arman")).toBe("Arman's Devspace");
      expect(getWorkspaceBrandName("Rahul")).toBe("Rahul's Devspace");
      expect(getWorkspaceBrandName("Sanjana")).toBe("Sanjana's Devspace");
    });

    it("derives first name correctly for full names", () => {
      expect(getWorkspaceBrandName("Arman Khan")).toBe("Arman's Devspace");
      expect(getWorkspaceBrandName("Rahul Verma")).toBe("Rahul's Devspace");
      expect(getWorkspaceBrandName("Sanjana Patel")).toBe("Sanjana's Devspace");
      expect(getWorkspaceBrandName("Dr. Ada Lovelace")).toBe("Dr.'s Devspace");
    });

    it("returns neutral fallback for unauthenticated, null, or empty values", () => {
      expect(getWorkspaceBrandName(null)).toBe("Devspace");
      expect(getWorkspaceBrandName(undefined)).toBe("Devspace");
      expect(getWorkspaceBrandName("")).toBe("Devspace");
      expect(getWorkspaceBrandName("   ")).toBe("Devspace");
    });
  });

  describe("Wordmark and Lockup Components", () => {
    it("renders dynamic workspace brand for authenticated user", () => {
      render(<Wordmark name="Rahul Sharma" />);
      expect(screen.getByText("Rahul's Devspace")).toBeInTheDocument();
    });

    it("renders neutral fallback Devspace when name is absent", () => {
      render(<Wordmark />);
      expect(screen.getByText("Devspace")).toBeInTheDocument();
    });

    it("honors explicit brandText override", () => {
      render(<Wordmark brandText="Custom Platform" />);
      expect(screen.getByText("Custom Platform")).toBeInTheDocument();
    });

    it("renders Lockup with dynamic name and matching accessibility label", () => {
      render(<Lockup name="Sanjana" />);
      expect(screen.getByLabelText("Sanjana's Devspace")).toBeInTheDocument();
      expect(screen.getByText("Sanjana's Devspace")).toBeInTheDocument();
    });
  });

  describe("Application Shell Dynamic Branding Integration", () => {
    it("renders personalized branding in Sidebar for authenticated session", () => {
      render(
        <Sidebar
          collapsed={false}
          sessionUser={{
            id: "u2",
            email: "rahul@example.com",
            name: "Rahul Verma",
            role: "developer",
          }}
        />,
      );
      expect(screen.getByLabelText("Rahul's Devspace, overview")).toBeInTheDocument();
      expect(screen.getByText("Rahul's Devspace")).toBeInTheDocument();
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });

    it("renders neutral fallback in Sidebar when unauthenticated", () => {
      render(<Sidebar collapsed={false} sessionUser={null} />);
      expect(screen.getByLabelText("Devspace, overview")).toBeInTheDocument();
      expect(screen.getByText("Devspace")).toBeInTheDocument();
      expect(screen.getByText("Devspace Account")).toBeInTheDocument();
    });

    it("renders personalized brand in TopBar pageTitle fallback and mark", () => {
      render(
        <TopBar
          onOpenMobileNav={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          sessionUser={{
            id: "u3",
            email: "sanjana@example.com",
            name: "Sanjana",
            role: "developer",
          }}
        />,
      );
      expect(screen.getByLabelText("Sanjana's Devspace, overview")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Sanjana's Devspace" })).toBeInTheDocument();
    });

    it("renders neutral brand in TopBar when unauthenticated", () => {
      render(
        <TopBar
          onOpenMobileNav={vi.fn()}
          onOpenCommandPalette={vi.fn()}
          sessionUser={null}
        />,
      );
      expect(screen.getByLabelText("Devspace, overview")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Devspace" })).toBeInTheDocument();
    });
  });
});
