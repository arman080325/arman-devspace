import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Mark,
  Wordmark,
  Lockup,
  Tagline,
  PhaseBadge,
  StatusGlyph,
  HealthTag,
  DeployTag,
  SpecPlate,
  LoopTrack,
  CellFace,
  Button,
  Kbds,
  Panel,
  Empty,
  SegBar,
  type SpecPlateProject,
} from "@/components/redesign";

describe("Redesign Milestone 1 Primitives", () => {
  describe("Brand Components", () => {
    it("renders Mark SVG with accessible label", () => {
      render(<Mark size={32} />);
      const el = screen.getByLabelText("Arman’s Devspace");
      expect(el).toBeInTheDocument();
      expect(el.tagName.toLowerCase()).toBe("svg");
    });

    it("renders Wordmark with correct text", () => {
      render(<Wordmark />);
      expect(screen.getByText("Arman’s Devspace")).toBeInTheDocument();
    });

    it("renders Lockup with Mark and Wordmark", () => {
      render(<Lockup size={20} />);
      expect(screen.getByLabelText("Arman’s Devspace")).toBeInTheDocument();
      expect(screen.getByText("Arman’s Devspace")).toBeInTheDocument();
    });

    it("renders Tagline with all four lifecycle words", () => {
      render(<Tagline />);
      const el = screen.getByLabelText("Explore. Build. Break. Rebuild.");
      expect(el).toBeInTheDocument();
      expect(screen.getByText("Explore.")).toBeInTheDocument();
      expect(screen.getByText("Build.")).toBeInTheDocument();
      expect(screen.getByText("Rebuild.")).toBeInTheDocument();
    });
  });

  describe("Glyphs & Visual Distinctions", () => {
    it("renders PhaseBadge for each lifecycle phase", () => {
      const { rerender } = render(<PhaseBadge phase="exploring" />);
      expect(screen.getByText("Exploring")).toBeInTheDocument();

      rerender(<PhaseBadge phase="shipped" />);
      expect(screen.getByText("Shipped")).toBeInTheDocument();

      rerender(<PhaseBadge phase="breaking" />);
      expect(screen.getByText("Breaking")).toBeInTheDocument();
    });

    it("renders StatusGlyph with appropriate accessible aria-labels", () => {
      const { rerender } = render(<StatusGlyph status="success" />);
      expect(screen.getByLabelText("Succeeded")).toBeInTheDocument();

      rerender(<StatusGlyph status="failed" />);
      expect(screen.getByLabelText("Failed")).toBeInTheDocument();

      rerender(<StatusGlyph status="running" />);
      expect(screen.getByLabelText("Running")).toBeInTheDocument();
    });

    it("renders HealthTag and DeployTag correctly", () => {
      render(
        <div>
          <HealthTag h="good" />
          <DeployTag d="ready" />
        </div>,
      );
      expect(screen.getByText("Good")).toBeInTheDocument();
      expect(screen.getByText("Live")).toBeInTheDocument();
    });
  });

  describe("SpecPlate Component", () => {
    const mockProject: SpecPlateProject = {
      num: 31,
      id: "031",
      name: "SiteShield WAF",
      slug: "siteshield-waf",
      description: "Distributed Web Application Firewall & Edge Rate Limiter",
      phase: "building",
      stack: ["Next.js", "TypeScript", "Redis", "Cloudflare Workers"],
      repo: "arman080325/siteshield-waf",
      health: "good",
      stars: 42,
    };

    it("renders project identification and technical metadata", () => {
      render(<SpecPlate p={mockProject} />);
      expect(screen.getByText("031")).toBeInTheDocument();
      expect(screen.getByText("SiteShield WAF")).toBeInTheDocument();
      expect(
        screen.getByText(/Distributed Web Application Firewall/),
      ).toBeInTheDocument();
      expect(screen.getByText("Building")).toBeInTheDocument();
      expect(screen.getByText("Next.js")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Redis")).toBeInTheDocument();
      expect(screen.getByText("+1")).toBeInTheDocument();
    });

    it("links to the canonical project workspace route", () => {
      render(<SpecPlate p={mockProject} />);
      const link = screen.getByRole("link", { name: "SiteShield WAF" });
      expect(link).toHaveAttribute("href", "/projects/siteshield-waf");
    });
  });

  describe("Hundred Matrix CellFace Geometry", () => {
    it("renders non-colour geometric faces for each cell phase", () => {
      const { container, rerender } = render(<CellFace phase="exploring" />);
      expect(container.firstChild).toBeInTheDocument();

      rerender(<CellFace phase="shipped" />);
      expect(container.firstChild).toBeInTheDocument();

      rerender(<CellFace phase="breaking" />);
      // Breaking cell includes an SVG crack cutout for accessibility
      expect(container.querySelector("svg")).toBeInTheDocument();

      rerender(<CellFace phase="rebuilding" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("LoopTrack Component", () => {
    it("renders loop progression steps in correct sequence", () => {
      render(<LoopTrack phase="building" loops={1} />);
      expect(screen.getByText("Explore")).toBeInTheDocument();
      expect(screen.getByText("Build")).toBeInTheDocument();
      expect(screen.getByText("Break")).toBeInTheDocument();
      expect(screen.getByText("Rebuild")).toBeInTheDocument();
      expect(screen.getByText("Shipped")).toBeInTheDocument();
      expect(screen.getByText("Rebuilt once")).toBeInTheDocument();
    });
  });

  describe("Core UI Primitives", () => {
    it("renders Button with variants and loading spinner", () => {
      const { rerender } = render(<Button variant="primary">Deploy</Button>);
      expect(screen.getByRole("button", { name: "Deploy" })).toBeInTheDocument();

      rerender(
        <Button variant="secondary" loading>
          Processing
        </Button>,
      );
      const btn = screen.getByRole("button", { name: /Processing/ });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-busy", "true");
    });

    it("renders Kbd and Kbds shortcuts", () => {
      render(<Kbds keys={["⌘", "K"]} />);
      expect(screen.getByText("⌘")).toBeInTheDocument();
      expect(screen.getByText("K")).toBeInTheDocument();
    });

    it("renders Panel with title and content", () => {
      render(
        <Panel title="The Hundred" footer="Telemetry synced">
          <p>Matrix Content</p>
        </Panel>,
      );
      expect(screen.getByText("The Hundred")).toBeInTheDocument();
      expect(screen.getByText("Matrix Content")).toBeInTheDocument();
      expect(screen.getByText("Telemetry synced")).toBeInTheDocument();
    });

    it("renders Empty state", () => {
      render(
        <Empty title="No signals detected" action={<Button>Refresh</Button>}>
          Telemetry idle
        </Empty>,
      );
      expect(screen.getByText("No signals detected")).toBeInTheDocument();
      expect(screen.getByText("Telemetry idle")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });

    it("renders SegBar progress bar", () => {
      render(<SegBar value={70} total={100} label="Deployment completion" />);
      const bar = screen.getByRole("progressbar", { name: "Deployment completion" });
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveAttribute("aria-valuenow", "70");
    });
  });
});
