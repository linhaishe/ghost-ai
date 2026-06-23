import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";

const PRISMA_CLIENT_CACHE_VERSION = "project-spec-model-v1";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    });
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
    }),
  });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaCacheVersion?: string;
};

export const prisma =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (() => {
        if (
          !globalForPrisma.prisma ||
          globalForPrisma.prismaCacheVersion !== PRISMA_CLIENT_CACHE_VERSION ||
          !globalForPrisma.prisma.taskRun ||
          !globalForPrisma.prisma.projectSpec
        ) {
          globalForPrisma.prisma = createPrismaClient();
          globalForPrisma.prismaCacheVersion = PRISMA_CLIENT_CACHE_VERSION;
        }

        return globalForPrisma.prisma;
      })();
