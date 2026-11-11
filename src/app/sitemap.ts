import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { projects as canonicalProjects } from "@/data/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteConfig.url,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/projects`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/paths`,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${siteConfig.url}/paths/beginner`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/paths/intermediate`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/paths/advanced`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/technologies`,
      changeFrequency: "weekly",
      priority: 0.75,
    },
  ];

  const projectRoutes: MetadataRoute.Sitemap = canonicalProjects.map((project) => ({
    url: `${siteConfig.url}/projects/${project.slug}`,
    lastModified: project.updatedAt,
    changeFrequency: "monthly",
    priority: project.isPlaceholder ? 0.4 : 0.7,
  }));

  return [...staticRoutes, ...projectRoutes];
}
