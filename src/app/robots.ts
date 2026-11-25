import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/projects", "/projects/", "/paths", "/paths/", "/technologies"],
        disallow: [
          "/dashboard",
          "/activity",
          "/kanban",
          "/journal",
          "/analytics",
          "/settings",
          "/login",
          "/register",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
