"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookText,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { NOTE_TYPES } from "@/lib/validations";
import type { NoteType, Project, ProjectNote } from "@/types/project";

export interface JournalNoteRecord extends ProjectNote {
  projectTitle: string;
  projectSlug: string;
  projectNumber: number;
}

interface JournalClientProps {
  initialNotes: JournalNoteRecord[];
  projects: Array<Pick<Project, "id" | "number" | "title" | "slug" | "isPlaceholder">>;
}

const SELECT_CLASSES =
  "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function JournalClient({ initialNotes, projects }: JournalClientProps) {
  const [notes, setNotes] = React.useState<JournalNoteRecord[]>(initialNotes);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

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
  const [statusMessage, setStatusMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const filteredNotes = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (typeFilter !== "all" && note.type !== typeFilter) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.projectTitle.toLowerCase().includes(q) ||
        String(note.projectNumber) === q.replace(/^#/, "")
      );
    });
  }, [notes, search, typeFilter]);

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
        text: "Journal entry saved to persisted store.",
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
    const response = await fetch(`/api/notes?noteId=${encodeURIComponent(noteId)}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setStatusMessage({ type: "success", text: "Journal entry removed." });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="h-fit border-border/80 bg-card lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookText className="size-4 text-violet-400" aria-hidden="true" />
            <span>New Journal Entry</span>
          </CardTitle>
          <CardDescription>
            Record bugs, architecture decisions, or solutions linked to any canonical
            project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateNote} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="journal-project" className="text-xs">
                Target Project
              </Label>
              <select
                id="journal-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className={SELECT_CLASSES}
              >
                {definedProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    #{String(proj.number).padStart(3, "0")} — {proj.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="journal-type" className="text-xs">
                Entry Type
              </Label>
              <select
                id="journal-type"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NoteType)}
                className={SELECT_CLASSES}
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="journal-title" className="text-xs">
                Title
              </Label>
              <Input
                id="journal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Migrated legacy Mongoose queries to Prisma"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="journal-content" className="text-xs">
                Notes
              </Label>
              <Textarea
                id="journal-content"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Document technical findings, root causes, and follow-up benchmarks..."
                required
              />
            </div>

            {statusMessage ? (
              <div
                role="status"
                aria-live="polite"
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                  statusMessage.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-destructive/40 bg-destructive/10 text-red-300"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            ) : null}

            <Button type="submit" disabled={submitting} className="w-full gap-1.5">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              <span>Publish Journal Entry</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-8">
        <search aria-label="Search engineering journal">
          <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/90 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Search journal entries"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes by keyword or project title..."
                className="pl-9"
              />
            </div>
            <div className="sm:w-44">
              <Label htmlFor="journal-filter-type" className="sr-only">
                Filter by note category
              </Label>
              <select
                id="journal-filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={SELECT_CLASSES}
              >
                <option value="all">All categories</option>
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </search>

        {filteredNotes.length === 0 ? (
          <Card className="border-dashed border-border bg-card/60">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              {notes.length === 0
                ? "Your engineering journal is empty. Add your first note on the left or inside any project workspace."
                : "No journal entries match the current search or category filter."}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="border-border/80 bg-card">
                <CardContent className="space-y-2.5 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {note.type}
                        </Badge>
                        <Link
                          href={`/projects/${note.projectSlug}`}
                          className="font-mono text-xs text-violet-400 hover:underline"
                        >
                          #{String(note.projectNumber).padStart(3, "0")}{" "}
                          {note.projectTitle}
                        </Link>
                      </div>
                      <h2 className="text-base font-semibold text-foreground">
                        {note.title}
                      </h2>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete note ${note.title}`}
                      onClick={() => void handleDeleteNote(note.id)}
                      className="text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {note.content}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    Logged {formatDate(note.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
