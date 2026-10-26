import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";
import type { DB } from "@/lib/db";
import { seedDemo } from "@/lib/db/seed";

export async function createTestDb(opts: { seed?: boolean; now?: Date } = {}) {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as DB;
  await migrate(db as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  if (opts.seed !== false) await seedDemo(db, { now: opts.now, withDemoAdmin: true });
  return { db, close: () => client.close() };
}
