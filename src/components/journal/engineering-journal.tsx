"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, BookText, Expand, Plus, Search, Trash2, X } from "lucide-react";
import {
  Button,
  Dialog,
  Empty,
  ErrorBanner,
  IconButton,
  Panel,
  Tabs,
  cx,
} from "@/components/redesign/ui";
import { formatDate } from "@/lib/utils";
import { NOTE_TYPES } from "@/lib/validations";
import type { NoteType, Project, ProjectNote } from "@/types/project";

export interface JournalNoteRecord extends ProjectNote {
  projectTitle: string;
  projectSlug: string;
  projectNumber: number;
}

export interface EngineeringJournalClientProps {
  initialNotes: JournalNoteRecord[];
  projects: Array<Pick<Project, "id" | "number" | "title" | "slug" | "isPlaceholder">>;
}

type TypeFilter = "all" | NoteType;

const TYPE_BADGE_STYLE: Record<NoteType, string> = {
  architecture: "border-rebuild/40 bg-rebuild/10 text-rebuild",
  bug: "border-break/40 bg-break/10 text-break",
  solution: "border-ship/40 bg-ship/10 text-ship",
  learning: "border-explore/40 bg-explore/10 text-explore",
  general: "border-edge bg-inset text-fg2",
};

function getDayGroup(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const iso = d.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    if (iso === today) return "Today";
    if (iso === yesterday) return "Yesterday";
    return formatDate(d);
  } catch {
    return "Earlier";
  }
}

export function EngineeringJournalClient({
  initialNotes,
  projects,
}: EngineeringJournalClientProps) {
  const [notes, setNotes] = React.useState<JournalNoteRecord[]>(initialNotes);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [projectFilter, setProjectFilter] = React.useState<string>("all");
  const [previewNote, setPreviewNote] = React.useState<JournalNoteRecord | null>(null);

  const definedProjects = React.useMemo(
    () => projects.filter((p) => !p.isPlaceholder),
    [projects],
  );

  const [selectedProjectId, setSelectedProjectId] = React.useState(
    definedProjects[0]?.id ?? projects[0]?.id ?? "",
  );
  const [noteType, setNoteType] = React.useState<NoteType>("architecture");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const distinctProjectsWithNotes = React.useMemo(() => {
    const map = new Map<string, { id: string; number: number; title: string }>();
    for (const n of notes) {
      if (!map.has(n.projectId)) {
        map.set(n.projectId, {
          id: n.projectId,
          number: n.projectNumber,
          title: n.projectTitle,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.number - b.number);
  }, [notes]);

  const filteredNotes = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const numericQ = q.replace(/^#/, "");
    return notes.filter((note) => {
      if (typeFilter !== "all" && note.type !== typeFilter) return false;
      if (projectFilter !== "all" && note.projectId !== projectFilter) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.projectTitle.toLowerCase().includes(q) ||
        String(note.projectNumber) === numericQ ||
        String(note.projectNumber).padStart(3, "0").includes(numericQ)
      );
    });
  }, [notes, search, typeFilter, projectFilter]);

  const groupedNotes = React.useMemo(() => {
    const groups: Array<{ day: string; items: JournalNoteRecord[] }> = [];
    for (const note of filteredNotes) {
      const day = getDayGroup(note.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.day === day) {
        last.items.push(note);
      } else {
        groups.push({ day, items: [note] });
      }
    }
    return groups;
  }, [filteredNotes]);

  const countByType = React.useMemo(() => {
    const map: Record<TypeFilter, number> = {
      all: notes.length,
      architecture: 0,
      bug: 0,
      solution: 0,
      learning: 0,
      general: 0,
    };
    for (const n of notes) {
      map[n.type] = (map[n.type] ?? 0) + 1;
    }
    return map;
  }, [notes]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || submitting) return;
    setSubmitting(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title,
          content,
          type: noteType,
        }),
      });
      const json = (await response.json()) as {
        error?: string;
        note?: JournalNoteRecord;
      };
      if (!response.ok || !json.note) {
        setStatusMessage({
          type: "error",
          text: json.error ?? "Failed to create journal entry.",
        });
        return;
      }

      setNotes((prev) => [json.note!, ...prev]);
      setTitle("");
      setContent("");
      setStatusMessage({
        type: "success",
        text: "Journal entry saved to workspace database.",
      });
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error while saving journal entry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (deletingId) return;
    setDeletingId(noteId);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/notes?noteId=${encodeURIComponent(noteId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        setStatusMessage({
          type: "error",
          text: err.error ?? "Could not delete journal entry.",
        });
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (previewNote?.id === noteId) {
        setPreviewNote(null);
      }
      setStatusMessage({ type: "success", text: "Journal entry deleted." });
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error while deleting journal entry.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const hasFilters =
    search.trim() !== "" || typeFilter !== "all" || projectFilter !== "all";

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
        <div className="min-w-0">
          <h1 className="display text-2xl leading-tight text-fg sm:text-3xl">
            Engineering Journal
          </h1>
          <p className="tnum mt-1 font-mono text-xs text-fg2 sm:text-sm">
            {notes.length} persisted {notes.length === 1 ? "entry" : "entries"} across{" "}
            {distinctProjectsWithNotes.length}{" "}
            {distinctProjectsWithNotes.length === 1 ? "project" : "projects"}
          </p>
        </div>

        <Link href="/projects">
          <Button
            size="s"
            variant="secondary"
            icon={<BookText size={14} strokeWidth={1.5} />}
          >
            Browse project docs
          </Button>
        </Link>
      </header>

      {statusMessage && (
        <div className="mb-4">
          {statusMessage.type === "error" ? (
            <ErrorBanner
              action={
                <IconButton
                  label="Dismiss error"
                  size="s"
                  onClick={() => setStatusMessage(null)}
                >
                  <X size={14} strokeWidth={1.5} />
                </IconButton>
              }
            >
              {statusMessage.text}
            </ErrorBanner>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-between gap-3 rounded-panel border border-ship/40 bg-ship/10 px-3 py-2 text-xs text-fg"
            >
              <span>{statusMessage.text}</span>
              <IconButton
                label="Dismiss message"
                size="s"
                onClick={() => setStatusMessage(null)}
              >
                <X size={14} strokeWidth={1.5} />
              </IconButton>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Composer Panel */}
        <div className="lg:col-span-4">
          <Panel
            titleId="new-journal-entry-title"
            title="New Journal Entry"
            footer="Notes persist per project and appear inside that workspace's Docs & Screenshots tab."
          >
            <form onSubmit={handleCreateNote} className="space-y-3.5 p-4 sm:p-5">
              <div className="space-y-1">
                <label
                  htmlFor="journal-project"
                  className="block text-2xs font-medium text-fg2"
                >
                  Target Project
                </label>
                <select
                  id="journal-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-9 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
                >
                  {definedProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      #{String(proj.number).padStart(3, "0")} — {proj.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="journal-type"
                  className="block text-2xs font-medium text-fg2"
                >
                  Entry Category
                </label>
                <select
                  id="journal-type"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as NoteType)}
                  className="h-9 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
                >
                  {NOTE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="journal-title"
                  className="block text-2xs font-medium text-fg2"
                >
                  Title
                </label>
                <input
                  id="journal-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Migrated legacy Mongoose queries to Prisma"
                  className="h-9 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="journal-content"
                  className="block text-2xs font-medium text-fg2"
                >
                  Technical Notes
                </label>
                <textarea
                  id="journal-content"
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Document architecture choices, root causes, and verification details..."
                  className="w-full rounded-ctl border border-edge bg-inset p-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="m"
                loading={submitting}
                disabled={!selectedProjectId}
                icon={<Plus size={14} strokeWidth={1.5} />}
                className="w-full"
              >
                Publish Journal Entry
              </Button>
            </form>
          </Panel>
        </div>

        {/* Right Chronological Journal Feed */}
        <div className="min-w-0 lg:col-span-8">
          <section
            aria-label="Engineering journal entries"
            className="rounded-panel border border-line bg-surface"
          >
            <Tabs
              label="Filter by note category"
              scroll
              className="px-2"
              value={typeFilter}
              onChange={setTypeFilter}
              tabs={[
                { id: "all", label: "All", count: countByType.all },
                {
                  id: "architecture",
                  label: "Architecture",
                  count: countByType.architecture || null,
                },
                { id: "bug", label: "Bug", count: countByType.bug || null },
                {
                  id: "solution",
                  label: "Solution",
                  count: countByType.solution || null,
                },
                {
                  id: "learning",
                  label: "Learning",
                  count: countByType.learning || null,
                },
                { id: "general", label: "General", count: countByType.general || null },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
              <div className="relative min-w-[180px] flex-1">
                <Search
                  size={14}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg3"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label="Search journal entries"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, content, #number, or project..."
                  className="h-9 w-full rounded-ctl border border-edge bg-inset pl-8 pr-2 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none md:h-8"
                />
              </div>

              <select
                aria-label="Filter journal by project"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="h-9 max-w-[220px] truncate rounded-ctl border border-edge bg-inset px-2 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none md:h-8"
              >
                <option value="all">All Projects</option>
                {distinctProjectsWithNotes.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{String(p.number).padStart(3, "0")} {p.title}
                  </option>
                ))}
              </select>

              {hasFilters && (
                <Button
                  size="s"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                    setProjectFilter("all");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>

            {filteredNotes.length === 0 ? (
              <Empty
                title={
                  notes.length === 0
                    ? "Your engineering journal is empty."
                    : "No journal entries match these filters."
                }
                action={
                  hasFilters ? (
                    <Button
                      size="s"
                      variant="secondary"
                      onClick={() => {
                        setSearch("");
                        setTypeFilter("all");
                        setProjectFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : undefined
                }
              >
                {notes.length === 0
                  ? "Publish an entry using the composer on the left or inside any project workspace."
                  : "Try clearing your search query or switching note categories."}
              </Empty>
            ) : (
              <div>
                {groupedNotes.map((group) => (
                  <div key={group.day}>
                    <h2 className="sticky top-12 z-10 border-b border-line bg-surface/95 px-4 py-1.5 text-2xs font-semibold uppercase tracking-wider text-fg3 backdrop-blur-sm">
                      {group.day}
                    </h2>
                    <ul className="divide-y divide-line/60">
                      {group.items.map((note) => (
                        <li
                          key={note.id}
                          className="p-4 transition-colors hover:bg-elevated/35 sm:px-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cx(
                                    "rounded-ctl border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                                    TYPE_BADGE_STYLE[note.type],
                                  )}
                                >
                                  {note.type}
                                </span>

                                <Link
                                  href={`/projects/${note.projectSlug}?tab=docs`}
                                  className="inline-flex items-center gap-1 font-mono text-xs text-sodium-text hover:underline"
                                >
                                  <span>
                                    #{String(note.projectNumber).padStart(3, "0")}{" "}
                                    {note.projectTitle}
                                  </span>
                                  <ArrowUpRight size={11} strokeWidth={1.5} />
                                </Link>

                                <span className="font-mono text-2xs text-fg3">
                                  · {formatDate(note.createdAt)}
                                </span>
                              </div>

                              <h3 className="text-sm font-semibold text-fg sm:text-base">
                                {note.title}
                              </h3>

                              <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-fg2 sm:text-sm">
                                {note.content}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <IconButton
                                label={`Inspect note ${note.title}`}
                                size="s"
                                onClick={() => setPreviewNote(note)}
                              >
                                <Expand size={14} strokeWidth={1.5} />
                              </IconButton>

                              <IconButton
                                label={`Delete note ${note.title}`}
                                size="s"
                                disabled={deletingId === note.id}
                                onClick={() => void handleDeleteNote(note.id)}
                                className="hover:text-break"
                              >
                                <Trash2 size={14} strokeWidth={1.5} />
                              </IconButton>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Note Detail Preview Dialog */}
      <Dialog
        open={Boolean(previewNote)}
        onClose={() => setPreviewNote(null)}
        title={previewNote?.title ?? ""}
        width={680}
        footer={
          previewNote && (
            <>
              <Button
                size="s"
                variant="destructive"
                disabled={deletingId === previewNote.id}
                onClick={() => void handleDeleteNote(previewNote.id)}
              >
                Delete Note
              </Button>
              <Link href={`/projects/${previewNote.projectSlug}?tab=docs`}>
                <Button
                  size="s"
                  variant="primary"
                  icon={<ArrowUpRight size={14} strokeWidth={1.5} />}
                >
                  Open in Project Docs
                </Button>
              </Link>
            </>
          )
        }
      >
        {previewNote && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cx(
                  "rounded-ctl border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                  TYPE_BADGE_STYLE[previewNote.type],
                )}
              >
                {previewNote.type}
              </span>
              <span className="font-mono text-fg2">
                #{String(previewNote.projectNumber).padStart(3, "0")}{" "}
                {previewNote.projectTitle}
              </span>
              <span className="font-mono text-fg3">
                · Logged {formatDate(previewNote.createdAt)}
              </span>
            </div>
            <div className="rounded-ctl border border-line bg-inset p-3.5 text-sm leading-relaxed text-fg whitespace-pre-wrap">
              {previewNote.content}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
