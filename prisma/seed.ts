import { PrismaClient, type Difficulty, type VerificationStatus } from "@prisma/client";
import { projects } from "../src/data/projects";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

function mapVerification(status: string): VerificationStatus {
  switch (status) {
    case "verified":
      return "verified";
    case "archived":
      return "archived";
    case "unavailable":
      return "unavailable";
    case "incorrect-link":
      return "incorrect_link";
    case "collection-only":
      return "collection_only";
    default:
      return "needs_review";
  }
}

async function main() {
  console.log("Seeding Arman's Devspace 100-project catalogue...");

  // Ensure default owner reference account exists (no hardcoded real password; requires explicit login setup)
  await prisma.user.upsert({
    where: { email: "arman@devspace.local" },
    update: {},
    create: {
      id: "user-arman",
      email: "arman@devspace.local",
      name: "Arman",
      role: "owner",
    },
  });

  // Upsert all categories first
  const categoryNames = Array.from(new Set(projects.map((p) => p.category)));
  const categoryMap = new Map<string, string>();

  for (const name of categoryNames) {
    const slug = slugify(name) || "uncategorized";
    const category = await prisma.projectCategory.upsert({
      where: { name },
      update: { slug },
      create: {
        name,
        slug,
        description: `${name} software engineering projects in the 100-project collection.`,
      },
    });
    categoryMap.set(name, category.id);
  }

  // Upsert all 100 numbered projects in strict numerical order
  for (const item of projects) {
    const categoryId = categoryMap.get(item.category)!;

    const project = await prisma.project.upsert({
      where: { number: item.number },
      update: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        difficulty: item.difficulty as Difficulty,
        complexityReviewed: (item.complexityReviewed ?? item.difficulty) as Difficulty,
        categoryId,
        originalRepoUrl: item.originalRepoUrl,
        isPlaceholder: item.isPlaceholder,
        learningObjectives: item.learningObjectives,
        existingFeatures: item.existingFeatures,
        missingFeatures: item.missingFeatures,
        recommendedStack: item.recommendedStack,
      },
      create: {
        id: item.id,
        number: item.number,
        title: item.title,
        slug: item.slug,
        description: item.description,
        difficulty: item.difficulty as Difficulty,
        complexityReviewed: (item.complexityReviewed ?? item.difficulty) as Difficulty,
        categoryId,
        originalRepoUrl: item.originalRepoUrl,
        verifiedRepoUrl: item.verifiedRepoUrl,
        discrepancyNotes: item.discrepancyNotes ?? null,
        verificationStatus: mapVerification(item.verificationStatus),
        isPlaceholder: item.isPlaceholder,
        learningObjectives: item.learningObjectives,
        existingFeatures: item.existingFeatures,
        missingFeatures: item.missingFeatures,
        recommendedStack: item.recommendedStack,
      },
    });

    // Sync canonical technology associations cleanly without touching user workspace data
    for (let idx = 0; idx < item.technologies.length; idx++) {
      const techName = item.technologies[idx];
      await prisma.projectTechnology.upsert({
        where: {
          projectId_name: {
            projectId: project.id,
            name: techName,
          },
        },
        update: { isPrimary: idx === 0 },
        create: {
          projectId: project.id,
          name: techName,
          isPrimary: idx === 0,
        },
      });
    }
  }

  console.log(`Seeded ${projects.length} numbered positions successfully.`);
}

main()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

