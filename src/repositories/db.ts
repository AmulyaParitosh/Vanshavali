import { Pool, type PoolClient } from "pg";
import { getSupabaseTarget } from "../lib/supabaseEnv";

/**
 * The one Postgres connection the repository layer talks through. Server-only:
 * a raw `pg` TCP connection can never run in the browser, and importing this
 * from a client component fails the build — which is the guardrail we want.
 *
 * The connection bypasses RLS (it's the postgres/owner role, not a user JWT),
 * so authorization is enforced in the service layer (`src/services/authz.ts`),
 * NOT here. Repositories are dumb data access; services own the rules.
 *
 * Target follows `NEXT_PUBLIC_ENV`, same switch as the app + scripts:
 *   local → the local Supabase stack's Postgres (fixed demo URL)
 *   prod  → DATABASE_URL from the environment
 */

const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function resolveDatabaseUrl(): string {
  if (getSupabaseTarget() === "local") {
    return process.env.LOCAL_DATABASE_URL ?? LOCAL_DATABASE_URL;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set when NEXT_PUBLIC_ENV=prod (see docs/SUPABASE-SETUP.md)."
    );
  }
  return url;
}

/** Anything that can run a parameterized query — the pool or a transaction client. */
export type Db = Pool | PoolClient;

let pool: Pool | null = null;

/** The shared connection pool, created lazily on first use. */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: resolveDatabaseUrl() });
  }
  return pool;
}

/**
 * Run a parameterized query and return the rows, typed as T. The generic is a
 * cast (pg hands back `any` rows) — the mappers are what actually validate the
 * shape at the domain boundary.
 */
export async function query<T>(db: Db, text: string, params: unknown[] = []): Promise<T[]> {
  const result = await db.query(text, params as unknown[]);
  return result.rows as T[];
}

/**
 * Run `fn` inside a transaction on a dedicated client. Commits on success,
 * rolls back on any throw. Pass the provided `tx` to repository calls so every
 * statement in `fn` shares one atomic unit of work.
 */
export async function transaction<T>(fn: (tx: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Rollback failure is secondary to the original error — swallow it.
    }
    throw error;
  } finally {
    client.release();
  }
}
