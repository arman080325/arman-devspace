"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { Panel, Button, Empty, Dialog } from "@/components/redesign/ui";
import type { NoteType, Project, ProjectProgress } from "@/types/project";

export function DocsTab({
  project,
  progress,
  onSaveArchitectureDocs,
  onCreateNote,
  onDeleteNote,
  onAddScreenshot,
  onDeleteScreenshot,
}: {
  project: Project;
  progress: ProjectProgress | null;
  onSaveArchitectureDocs: (docs: {
    localClonePath?: string | null;
    originalArchitecture?: string | null;
    modernizationArchitecture?: string | null;
    technicalDocumentation?: string | null;
    testingSummary?: string | null;
  }) => Promise<void>;
  onCreateNote: (title: string, content: string, type: NoteType) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onAddScreenshot: (title: string, url: string, caption?: string) => Promise<void>;
  onDeleteScreenshot: (screenshotId: string) => Promise<void>;
}) {
  // Architecture state
  const [localClone, setLocalClone] = useState(
    progress?.localClonePath ?? project.localClonePath ?? "",
  );
  const [origArch, setOrigArch] = useState(
    progress?.originalArchitecture ?? project.originalArchitecture ?? "",
  );
  const [modernArch, setModernArch] = useState(
    progress?.modernizationArchitecture ?? project.modernizationArchitecture ?? "",
  );
  const [techDocs, setTechDocs] = useState(
    progress?.technicalDocumentation ?? project.technicalDocumentation ?? "",
  );
  const [testingSum, setTestingSum] = useState(
    progress?.testingSummary ?? project.testingSummary ?? "",
  );
  const [isSavingDocs, setIsSavingDocs] = useState(false);
  const [docsSavedSuccess, setDocsSavedSuccess] = useState(false);

  // Notes state
  const notes = Array.isArray(progress?.notes) ? progress.notes : [];
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("architecture");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Screenshots state
  const screenshots = Array.isArray(progress?.screenshots) ? progress.screenshots : [];
  const [shotTitle, setShotTitle] = useState("");
  const [shotUrl, setShotUrl] = useState("");
  const [shotCaption, setShotCaption] = useState("");
  const [isAddingShot, setIsAddingShot] = useState(false);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const handleSaveDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDocs(true);
    setDocsSavedSuccess(false);
    try {
      await onSaveArchitectureDocs({
        localClonePath: localClone.trim() || null,
        originalArchitecture: origArch.trim() || null,
        modernizationArchitecture: modernArch.trim() || null,
        technicalDocumentation: techDocs.trim() || null,
        testingSummary: testingSum.trim() || null,
      });
      setDocsSavedSuccess(true);
      setTimeout(() => setDocsSavedSuccess(false), 3000);
    } catch {
      // handled in parent
    } finally {
      setIsSavingDocs(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    setIsAddingNote(true);
    try {
      await onCreateNote(noteTitle.trim(), noteContent.trim(), noteType);
      setNoteTitle("");
      setNoteContent("");
    } catch {
      // handled in parent
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleCreateScreenshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shotTitle.trim() || !shotUrl.trim()) return;
    setIsAddingShot(true);
    try {
      await onAddScreenshot(
        shotTitle.trim(),
        shotUrl.trim(),
        shotCaption.trim() || undefined,
      );
      setShotTitle("");
      setShotUrl("");
      setShotCaption("");
    } catch {
      // handled in parent
    } finally {
      setIsAddingShot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Architecture & Engineering Specifications */}
      <Panel
        titleId="arch-title"
        title="Architecture & Implementation Blueprint"
        footer={
          <div className="flex items-center justify-between text-2xs text-fg3">
            <span>
              Persisted technical documentation for #
              {String(project.number).padStart(3, "0")}
            </span>
            {docsSavedSuccess && (
              <span className="font-semibold text-ship">Changes saved successfully!</span>
            )}
          </div>
        }
      >
        <form onSubmit={handleSaveDocs} className="p-4 sm:p-5 space-y-4">
          <div className="space-y-1">
            <label htmlFor="clone-path" className="block text-2xs font-medium text-fg3">
              Local Development Clone Path
            </label>
            <div className="relative">
              <input
                id="clone-path"
                type="text"
                value={localClone}
                onChange={(e) => setLocalClone(e.target.value)}
                placeholder="e.g. /home/arman/workspaces/siteshield-v2"
                className="h-8 w-full rounded-ctl border border-edge bg-inset pl-8 pr-2.5 font-mono text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />
              <Terminal
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg3"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="orig-arch" className="block text-2xs font-medium text-fg3">
                Original Architecture (Legacy)
              </label>
              <textarea
                id="orig-arch"
                rows={3}
                value={origArch}
                onChange={(e) => setOrigArch(e.target.value)}
                placeholder="Describe original architecture, dependencies, and bottlenecks..."
                className="w-full rounded-ctl border border-edge bg-inset p-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="mod-arch" className="block text-2xs font-medium text-fg3">
                Modernization Architecture (Target)
              </label>
              <textarea
                id="mod-arch"
                rows={3}
                value={modernArch}
                onChange={(e) => setModernArch(e.target.value)}
                placeholder="Describe modernized stack, migration plan, and design patterns..."
                className="w-full rounded-ctl border border-edge bg-inset p-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="tech-docs" className="block text-2xs font-medium text-fg3">
                Technical Documentation Notes
              </label>
              <textarea
                id="tech-docs"
                rows={3}
                value={techDocs}
                onChange={(e) => setTechDocs(e.target.value)}
                placeholder="API documentation, environment variables, run instructions..."
                className="w-full rounded-ctl border border-edge bg-inset p-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="test-sum" className="block text-2xs font-medium text-fg3">
                Testing Strategy & Verification Summary
              </label>
              <textarea
                id="test-sum"
                rows={3}
                value={testingSum}
                onChange={(e) => setTestingSum(e.target.value)}
                placeholder="Unit test coverage, integration tests, E2E verification results..."
                className="w-full rounded-ctl border border-edge bg-inset p-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="s"
              loading={isSavingDocs}
              icon={<Save size={13} strokeWidth={1.5} />}
            >
              Save Architecture Blueprint
            </Button>
          </div>
        </form>
      </Panel>

      {/* Section 2: Notes & Documentation Entries */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Notes */}
        <Panel
          titleId="notes-title"
          title={
            <div className="flex items-center gap-2">
              <span>Project Engineering Notes</span>
              <span className="font-mono text-xs text-fg3">({notes.length})</span>
            </div>
          }
        >
          <div className="p-4 sm:p-5 space-y-4">
            {/* Create Note Form */}
            <form
              onSubmit={handleCreateNote}
              className="space-y-2.5 border-b border-line/60 pb-4"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title..."
                  className="sm:col-span-2 h-8 rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
                />
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as NoteType)}
                  className="h-8 rounded-ctl border border-edge bg-inset px-2 text-xs text-fg focus-visible:border-sodium focus-visible:outline-none"
                >
                  <option value="architecture">Architecture</option>
                  <option value="bug">Bug / Issue</option>
                  <option value="feature">Feature</option>
                  <option value="modernization">Modernization</option>
                </select>
              </div>

              <textarea
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Markdown-formatted technical notes, decision records, or meeting minutes..."
                className="w-full rounded-ctl border border-edge bg-inset p-2 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="s"
                  variant="secondary"
                  loading={isAddingNote}
                  icon={<Plus size={13} strokeWidth={1.5} />}
                >
                  Add Note
                </Button>
              </div>
            </form>

            {/* Notes List */}
            {notes.length === 0 ? (
              <Empty title="No engineering notes yet.">
                Capture implementation insights, architectural decisions, and
                troubleshooting logs.
              </Empty>
            ) : (
              <ul className="divide-y divide-line/60">
                {notes.map((n) => (
                  <li key={n.id} className="py-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fg">{n.title}</span>
                        <span className="font-mono rounded bg-inset px-1 text-[10px] uppercase text-fg3">
                          {n.type}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(n.id)}
                        aria-label={`Delete note ${n.title}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-ctl text-fg3 hover:bg-elevated hover:text-break"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="text-fg2 whitespace-pre-wrap leading-relaxed">
                      {n.content}
                    </p>
                    <p className="font-mono text-[10px] text-fg3">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        {/* Screenshots Gallery */}
        <Panel
          titleId="screenshots-title"
          title={
            <div className="flex items-center gap-2">
              <span>Screenshots & Design Artifacts</span>
              <span className="font-mono text-xs text-fg3">({screenshots.length})</span>
            </div>
          }
        >
          <div className="p-4 sm:p-5 space-y-4">
            {/* Add Screenshot Form */}
            <form
              onSubmit={handleCreateScreenshot}
              className="space-y-2.5 border-b border-line/60 pb-4"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={shotTitle}
                  onChange={(e) => setShotTitle(e.target.value)}
                  placeholder="Screenshot title..."
                  className="h-8 rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
                />
                <input
                  type="url"
                  value={shotUrl}
                  onChange={(e) => setShotUrl(e.target.value)}
                  placeholder="Image URL (https://...)"
                  className="h-8 rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
                />
              </div>

              <input
                type="text"
                value={shotCaption}
                onChange={(e) => setShotCaption(e.target.value)}
                placeholder="Optional caption..."
                className="h-8 w-full rounded-ctl border border-edge bg-inset px-2.5 text-xs text-fg placeholder:text-fg3 focus-visible:border-sodium focus-visible:outline-none"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="s"
                  variant="secondary"
                  loading={isAddingShot}
                  icon={<Plus size={13} strokeWidth={1.5} />}
                >
                  Add Screenshot
                </Button>
              </div>
            </form>

            {/* Screenshots Grid */}
            {screenshots.length === 0 ? (
              <Empty title="No screenshots registered yet.">
                Add URL references to UI captures, architectural diagrams, or design
                specifications.
              </Empty>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {screenshots.map((shot, idx) => (
                  <div
                    key={shot.id}
                    className="group relative rounded-ctl border border-line bg-surface overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setZoomIndex(idx)}
                      className="block w-full text-left"
                    >
                      <div className="aspect-video w-full bg-inset relative overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={shot.url}
                          alt={shot.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <span className="absolute right-1 top-1 rounded bg-elevated/80 p-1 text-fg2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 size={12} />
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="font-semibold text-xs text-fg truncate">
                          {shot.title}
                        </p>
                        {shot.caption && (
                          <p className="text-[10px] text-fg3 truncate">{shot.caption}</p>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteScreenshot(shot.id)}
                      aria-label={`Delete screenshot ${shot.title}`}
                      className="absolute top-1 left-1 rounded bg-elevated/80 p-1 text-fg3 hover:text-break opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Screenshot Zoom Dialog */}
      <Dialog
        open={zoomIndex !== null}
        onClose={() => setZoomIndex(null)}
        title={
          zoomIndex !== null && screenshots[zoomIndex] ? screenshots[zoomIndex].title : ""
        }
        width={880}
      >
        {zoomIndex !== null && screenshots[zoomIndex] && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-ctl border border-line bg-inset flex items-center justify-center max-h-[60vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshots[zoomIndex].url}
                alt={screenshots[zoomIndex].title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            {screenshots[zoomIndex].caption && (
              <p className="text-xs text-fg2">{screenshots[zoomIndex].caption}</p>
            )}

            <div className="flex items-center justify-between border-t border-line/60 pt-3 text-xs">
              <span className="font-mono text-fg3">
                {zoomIndex + 1} of {screenshots.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="s"
                  variant="ghost"
                  disabled={zoomIndex === 0}
                  onClick={() => setZoomIndex(zoomIndex - 1)}
                  icon={<ChevronLeft size={13} />}
                >
                  Previous
                </Button>
                <Button
                  size="s"
                  variant="ghost"
                  disabled={zoomIndex >= screenshots.length - 1}
                  onClick={() => setZoomIndex(zoomIndex + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={13} className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
