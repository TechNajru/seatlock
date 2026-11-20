import { Pool, PoolClient } from "pg";
import { env } from "./env";
import { HttpError } from "../utils/httpError";

export const pool = new Pool({ connectionString: env.databaseUrl, max: 30 });

/** Anything we can run SQL on: a Pool or a transaction client. */
export type Db = Pick<PoolClient, "query">;

/** Turn raw PostgreSQL errors into clear HTTP errors. */
function translate(e: any): Error {
  if (e instanceof HttpError) return e;
  if (e?.code === "55P03") return new HttpError(503, "Server is busy. Please try again."); // lock timeout
  if (e?.code === "40P01" || e?.code === "40001") return new HttpError(503, "Temporary conflict. Please retry.");
  if (e?.code === "23505") return new HttpError(409, "That seat was just taken."); // unique safety net
  return e;
}

/** One ACID transaction with a ~2s lock timeout. */
export async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET LOCAL lock_timeout = '2s'");
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw translate(e);
  } finally {
    c.release();
  }
}
