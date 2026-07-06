import { defineConfig } from "prisma/config";

// Load .env only in local dev — on Railway DATABASE_URL is injected directly
// as an environment variable and there is no .env file to read.
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
