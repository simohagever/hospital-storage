import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_PRIVATE_URL;
  if (!url) {
    throw new Error("No database URL found. Set DATABASE_URL in your environment (or POSTGRES_URL / DATABASE_PRIVATE_URL on Railway).");
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

// Railway sends SIGTERM when redeploying. Without this handler the process exits
// immediately, leaving Postgres connections open until the server-side idle timeout
// closes them — which can exhaust the connection pool before the new container starts.
if (process.env.NODE_ENV === "production") {
  process.once("SIGTERM", async () => {
    await _client?.$disconnect().catch(() => undefined);
    process.exit(0);
  });
}
