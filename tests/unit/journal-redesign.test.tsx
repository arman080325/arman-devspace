import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { EngineeringJournalClient, type JournalNoteRecord } from "@/components/journal";
import { projects as canonicalProjects } from "@/data/projects";

const mockNotes: JournalNoteRecord[] = [
  {
    id: "note-1",
    projectId: canonicalProjects[0].id,
    userId: "user-1",
    title: "Prisma Migration Strategy",
    content: "Replaced raw Mongoose schemas with typed Prisma transactions.",
    type: "architecture",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectTitle: canonicalProjects[0].title,
    projectSlug: canonicalProjects[0].slug,
    projectNumber: canonicalProjects[0].number,
  },
  {
    id: "note-2",
    projectId: canonicalProjects[1].id,
    userId: "user-1",
    title: "Fixed Race Condition in Quiz Timer",
    content: "Added cleanup cancellation on unmount.",
    type: "bug",
    createdAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86_400_000 * 3).toISOString(),
    projectTitle: canonicalProjects[1].title,
    projectSlug: canonicalProjects[1].slug,
    projectNumber: canonicalProjects[1].number,
  },
];

const mockProjectOptions = canonicalProjects.slice(0, 4).map((p) => ({
  id: p.id,
  number: p.number,
  title: p.title,
  slug: p.slug,
  isPlaceholder: p.isPlaceholder,
}));

describe("Milestone 6 — Engineering Journal Redesign", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders persisted notes with project workspace links and entry counts", () => {
    render(
      <EngineeringJournalClient initialNotes={mockNotes} projects={mockProjectOptions} />,
    );

    expect(
      screen.getByRole("heading", { name: "Engineering Journal" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2 persisted entries across 2 projects/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Prisma Migration Strategy")).toBeInTheDocument();
    expect(screen.getByText("Fixed Race Condition in Quiz Timer")).toBeInTheDocument();

    const workspaceLink = screen.getByRole("link", {
      name: new RegExp(`#001 ${canonicalProjects[0].title}`, "i"),
    });
    expect(workspaceLink).toHaveAttribute(
      "href",
      `/projects/${canonicalProjects[0].slug}?tab=docs`,
    );
  });

  it("filters notes by search keyword, #number, category tab, and project dropdown", () => {
    render(
      <EngineeringJournalClient initialNotes={mockNotes} projects={mockProjectOptions} />,
    );

    // Search by keyword
    const searchInput = screen.getByLabelText("Search journal entries");
    fireEvent.change(searchInput, { target: { value: "Mongoose" } });
    expect(screen.getByText("Prisma Migration Strategy")).toBeInTheDocument();
    expect(
      screen.queryByText("Fixed Race Condition in Quiz Timer"),
    ).not.toBeInTheDocument();

    // Clear search and filter by category tab
    fireEvent.change(searchInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("tab", { name: /Bug/i }));
    expect(screen.getByText("Fixed Race Condition in Quiz Timer")).toBeInTheDocument();
    expect(screen.queryByText("Prisma Migration Strategy")).not.toBeInTheDocument();

    // Reset and filter by project
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    const projectSelect = screen.getByLabelText("Filter journal by project");
    fireEvent.change(projectSelect, { target: { value: canonicalProjects[0].id } });
    expect(screen.getByText("Prisma Migration Strategy")).toBeInTheDocument();
    expect(
      screen.queryByText("Fixed Race Condition in Quiz Timer"),
    ).not.toBeInTheDocument();
  });

  it("creates a new journal note via POST /api/notes", async () => {
    const createdNote: JournalNoteRecord = {
      id: "note-3",
      projectId: canonicalProjects[0].id,
      userId: "user-1",
      title: "Verified OAuth PKCE flow",
      content: "Tested state parameter verification and token exchange.",
      type: "solution",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectTitle: canonicalProjects[0].title,
      projectSlug: canonicalProjects[0].slug,
      projectNumber: canonicalProjects[0].number,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ note: createdNote }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EngineeringJournalClient initialNotes={mockNotes} projects={mockProjectOptions} />,
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Verified OAuth PKCE flow" },
    });
    fireEvent.change(screen.getByLabelText("Technical Notes"), {
      target: { value: "Tested state parameter verification and token exchange." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Publish Journal Entry/i }));

    await waitFor(() => {
      expect(screen.getByText("Verified OAuth PKCE flow")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("deletes a note via DELETE /api/notes and opens note detail preview", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EngineeringJournalClient initialNotes={mockNotes} projects={mockProjectOptions} />,
    );

    // Inspect detail modal
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect note Prisma Migration Strategy" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    // Delete note
    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete note Fixed Race Condition in Quiz Timer",
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Fixed Race Condition in Quiz Timer"),
      ).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/notes?noteId=note-2",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("renders empty state when journal has zero notes", () => {
    render(<EngineeringJournalClient initialNotes={[]} projects={mockProjectOptions} />);

    expect(screen.getByText("Your engineering journal is empty.")).toBeInTheDocument();
  });
});
