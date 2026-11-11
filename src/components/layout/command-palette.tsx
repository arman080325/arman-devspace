"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3,
  BookText,
  Compass,
  FolderGit2,
  Home,
  Kanban,
  Layers,
  LayoutDashboard,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { projects as canonicalProjects } from "@/data/projects";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpenCustom = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("devspace:open-command-palette", onOpenCustom);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("devspace:open-command-palette", onOpenCustom);
    };
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const matchedProjects = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return canonicalProjects.slice(0, 8);
    return canonicalProjects
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          String(p.number) === q ||
          `#${p.number}` === q ||
          p.category.toLowerCase().includes(q) ||
          p.technologies.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [query]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Arman's Devspace Command Palette"
      description="Search across all 100 projects, navigate workspaces, or change appearance."
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search #number, project title, stack, or route…"
        />
        <CommandList className="max-h-96">
          <CommandEmpty>No matching routes or projects found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => navigate("/")}>
              <Home className="size-4" aria-hidden="true" />
              <span>Homepage</span>
              <CommandShortcut>/</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/dashboard")}>
              <LayoutDashboard className="size-4" aria-hidden="true" />
              <span>Main Dashboard</span>
              <CommandShortcut>/dashboard</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/projects")}>
              <FolderGit2 className="size-4" aria-hidden="true" />
              <span>Project Explorer (1–100)</span>
              <CommandShortcut>/projects</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/paths")}>
              <Compass className="size-4" aria-hidden="true" />
              <span>Learning Paths</span>
              <CommandShortcut>/paths</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/kanban")}>
              <Kanban className="size-4" aria-hidden="true" />
              <span>Development Kanban</span>
              <CommandShortcut>/kanban</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/journal")}>
              <BookText className="size-4" aria-hidden="true" />
              <span>Engineering Journal</span>
              <CommandShortcut>/journal</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/technologies")}>
              <Layers className="size-4" aria-hidden="true" />
              <span>Technology Tracker</span>
              <CommandShortcut>/technologies</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/analytics")}>
              <BarChart3 className="size-4" aria-hidden="true" />
              <span>Development Analytics</span>
              <CommandShortcut>/analytics</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup
            heading={
              query.trim()
                ? `Matching Projects (${matchedProjects.length})`
                : "Projects (1–100)"
            }
          >
            {matchedProjects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => navigate(`/projects/${project.slug}`)}
                className="justify-between"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                    #{String(project.number).padStart(3, "0")}
                  </span>
                  <span className="truncate font-medium">{project.title}</span>
                </div>
                <span className="ml-2 shrink-0 text-xs text-muted-foreground capitalize">
                  {project.difficulty}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Theme">
            <CommandItem
              onSelect={() => {
                setTheme("dark");
                setOpen(false);
              }}
            >
              <Moon className="size-4" aria-hidden="true" />
              <span>Switch to Dark Theme</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme("light");
                setOpen(false);
              }}
            >
              <Sun className="size-4" aria-hidden="true" />
              <span>Switch to Light Theme</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme("system");
                setOpen(false);
              }}
            >
              <Monitor className="size-4" aria-hidden="true" />
              <span>Use System Color Scheme</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
