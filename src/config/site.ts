export const siteConfig = {
  name: "Arman's Devspace",
  tagline: "Explore. Build. Break. Rebuild.",
  supportingStatement: "A hundred projects. One continuous engineering journey.",
  description:
    "Explore open-source codebases, understand real-world architecture, modernize applications, and develop software worth showcasing.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  links: {
    github: "https://github.com/arman080325/arman-devspace",
  },
  creator: "Arman",
} as const;

export const navLinks = [
  { label: "Projects", href: "/projects" },
  { label: "Learning Paths", href: "/paths" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Kanban", href: "/kanban" },
  { label: "Journal", href: "/journal" },
  { label: "Analytics", href: "/analytics" },
] as const;

export const secondaryNavLinks = [
  { label: "Technologies", href: "/technologies" },
] as const;
