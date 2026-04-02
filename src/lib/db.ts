import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildDatasourceUrl() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.includes("pgbouncer=true")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}pgbouncer=true&connection_limit=1&pool_timeout=20`;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ datasources: { db: { url: buildDatasourceUrl() } } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
