import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set. Add it to your .env file.");
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

let _client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (globalThis.prismaGlobal) return globalThis.prismaGlobal;
  if (!_client) {
    _client = createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalThis.prismaGlobal = _client;
    }
  }
  return _client;
}

// Proxy defers client creation until the first actual DB call, so `next build`
// can import this module without DATABASE_URL present in the environment.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getClient() as any)[prop];
  },
});
