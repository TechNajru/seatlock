import { pool, Db } from "../config/database";
import { AuthUser } from "../types/user.types";
import { requireRole } from "../utils/permissions";
import { auditShard } from "../utils/auditShard";
import { AuditEntry, insertAudit, queryShard } from "../repositories/audit.repository";

export const writeAudit = (db: Db, entry: AuditEntry) => insertAudit(db, entry);

export interface AuditQuery { eventId?: string; from?: string; to?: string; cursor?: string; }

/**
 * Admin only.
 *  - event filter  -> read ONE shard (shard pruning)
 *  - no event      -> read all 4 shards, merge, keep latest 50 (scatter-gather)
 */
export async function listAuditLogs(user: AuthUser, q: AuditQuery) {
  requireRole(user, "ADMIN");
  const LIMIT = 50;
  const f = { ...q, limit: LIMIT + 1 }; // +1 to know if there is a next page
  const shards = q.eventId ? [auditShard(q.eventId)] : [0, 1, 2, 3];
  const parts = await Promise.all(shards.map(s => queryShard(pool, s, f)));
  const merged = parts.flat().sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1));
  const items = merged.slice(0, LIMIT);
  return {
    items,
    next_cursor: merged.length > LIMIT ? items[items.length - 1].id : null,
    shards_queried: shards,
  };
}
