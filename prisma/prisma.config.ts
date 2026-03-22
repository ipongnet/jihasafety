import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "schema.prisma"),
  datasource: {
    url: "file:prisma/dev.db",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
