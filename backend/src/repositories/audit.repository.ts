import { Db } from "../config/database";
import { auditShard } from "../utils/auditShard";
import { AuditAction } from "../types/event.types";

export interface AuditEntry {
  actorId?: string | null;
  eventId?: string | null;
  action: AuditAction;
  details?: Record<string, unknown>;
  /** used only when there is no event and no actor (e.g. failed login for unknown email) */
  shardKey?: string;
}

/** Shard rule: hash(event_id) % 4, or hash(actor_id) % 4 when there is no event. */
export const shardFor = (e: Pick<AuditEntry, "eventId" | "actorId" | "shardKey">) =>
  auditShard(e.eventId ?? e.actorId ?? e.shardKey ?? "system");

export async function insertAudit(db: Db, e: AuditEntry) {
  const shard = shardFor(e); // always an integer 0..3, safe to put in the table name
  await db.query(
    `INSERT INTO audit_logs_${shard} (actor_id, event_id, action, details) VALUES ($1,$2,$3,$4)`,
    [e.actorId ?? null, e.eventId ?? null, e.action, JSON.stringify(e.details ?? {})]
  );
  return shard;
}

export interface AuditFilter { eventId?: string; from?: string; to?: string; cursor?: string; limit: number; }

export async function queryShard(db: Db, shard: number, f: AuditFilter) {
  const where: string[] = [];
  const p: unknown[] = [];
  if (f.eventId) { p.push(f.eventId); where.push(`event_id = $${p.length}`); }
  if (f.from) { p.push(f.from); where.push(`created_at >= $${p.length}::timestamptz`); }
  if (f.to) { p.push(f.to); where.push(`created_at < ($${p.length}::date + 1)`); }
  if (f.cursor) { p.push(f.cursor); where.push(`id < $${p.length}::bigint`); }
  p.push(f.limit);
  const sql = `SELECT id::text AS id, actor_id, event_id, action, details, created_at, ${shard} AS shard
               FROM audit_logs_${shard}
               ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY id DESC LIMIT $${p.length}`;
  return (await db.query(sql, p)).rows;
}
