import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getPgPool } from "@/lib/pg-pool";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// In Prisma 7, use an adapter for direct database connections
function createPrismaClient() {
  const pool = getPgPool();

  if (!pool) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
