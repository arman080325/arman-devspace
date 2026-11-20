import {
  Grid3x3,
  Rows3,
  Shapes,
  NotebookText,
  Milestone,
  FolderGit2,
  BookText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  key?: string; // Single-key hotkey for 'g' navigation mode
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", path: "/dashboard", icon: Grid3x3, key: "O" },
  { id: "projects", label: "All projects", path: "/projects", icon: Rows3, key: "P" },
  { id: "categories", label: "Categories", path: "/paths", icon: Shapes, key: "C" },
  { id: "activity", label: "Activity", path: "/activity", icon: NotebookText, key: "A" },
  { id: "roadmaps", label: "Roadmaps", path: "/kanban", icon: Milestone, key: "R" },
  {
    id: "repos",
    label: "Repository intelligence",
    path: "/technologies",
    icon: FolderGit2,
    key: "I",
  },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: "journal", label: "Journal", path: "/journal", icon: BookText, key: "J" },
  { id: "analytics", label: "Analytics", path: "/analytics", icon: BarChart3, key: "Y" },
];
