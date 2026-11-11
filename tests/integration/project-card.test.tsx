import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectCard } from "@/components/projects/project-card";
import { getCanonicalProjectByNumber } from "@/data/projects";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("ProjectCard component", () => {
  it("renders project metadata, external repository link, and workspace link", () => {
    const first = getCanonicalProjectByNumber(1)!;
    render(<ProjectCard project={first} />);

    expect(screen.getByText("#001")).toBeInTheDocument();
    expect(screen.getByText("Online Bookstore")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();

    const repoLink = screen.getByRole("link", { name: /repository/i });
    expect(repoLink).toHaveAttribute(
      "href",
      "https://github.com/DarkSoul26/bookstore-mern",
    );

    const workspaceLink = screen.getByRole("link", { name: /open workspace/i });
    expect(workspaceLink).toHaveAttribute("href", "/projects/online-bookstore");
  });

  it("renders reserved placeholder slots cleanly without external repo URL", () => {
    const slot51 = getCanonicalProjectByNumber(51)!;
    render(<ProjectCard project={slot51} />);

    expect(screen.getByText("#051")).toBeInTheDocument();
    expect(screen.getByText(/awaiting repo url/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /inspect slot/i })).toHaveAttribute(
      "href",
      `/projects/${slot51.slug}`,
    );
  });
});
