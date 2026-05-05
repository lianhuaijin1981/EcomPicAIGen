import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "local.db";
    const client = new Database(dbPath);
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
