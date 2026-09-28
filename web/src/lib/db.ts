import { Pool } from "pg";

// A single pooled connection reused across requests in this Node
// process. Supabase's session pooler (port 5432) is what this project
// connects through — see ../../db/README.md and DATABASE_URL in
// .env.local (not committed).
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set — see db/README.md");
    }
    pool = new Pool({ connectionString, max: 5 });
  }
  return pool;
}
