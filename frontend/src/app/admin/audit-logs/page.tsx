import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Empty, ErrorBox, Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import { fmtDate, short } from "@/utils/format";
import type { AuditPage, EventItem } from "@/types";

export const dynamic = "force-dynamic";

const badge = (a: string) =>
  a === "ACCESS_DENIED" || a === "LOGIN_FAILED" || a === "SEAT_HOLD_REJECTED" ? "bg-red-500/15 text-red-300"
  : a.startsWith("BOOKING") || a === "CHECKIN" ? "bg-green-500/15 text-green-300"
  : a === "HOLD_EXPIRED" ? "bg-yellow-400/15 text-yellow-300" : "bg-blue-500/15 text-blue-300";

export default async function AuditLogs({ searchParams }: { searchParams: { event_id?: string; from?: string; to?: string; cursor?: string } }) {
  const user = await requireUser();
  const qs = new URLSearchParams();
  for (const k of ["event_id", "from", "to", "cursor"] as const) if (searchParams[k]) qs.set(k, searchParams[k]!);
  const r = guard(await serverFetch<AuditPage & { error?: string }>(`/api/admin/audit-logs?${qs}`));
  const events = await serverFetch<EventItem[]>("/api/events");

  const next = new URLSearchParams(qs); if (r.data.next_cursor) next.set("cursor", r.data.next_cursor);

  return (
    <Shell user={user}>
      <h1 className="mb-6 text-2xl font-bold">Audit logs</h1>
      {r.status === 403 ? <Forbidden /> : r.status !== 200 ? <ErrorBox message={r.data.error || "Could not load logs."} /> : (
        <>
          <form className="card mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1"><label className="label" htmlFor="event_id">Event</label>
              <select id="event_id" name="event_id" className="input" defaultValue={searchParams.event_id || ""}>
                <option value="">All events (reads all 4 shards)</option>
                {events.data.map?.(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select></div>
            <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" className="input" defaultValue={searchParams.from} /></div>
            <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" className="input" defaultValue={searchParams.to} /></div>
            <button className="btn">Apply filters</button>
            <Link href="/admin/audit-logs" className="btn-ghost">Reset</Link>
          </form>
          <p className="mb-3 text-sm text-slate-300">
            Shards read for this query: <b className="text-brand-400">{r.data.shards_queried.map(s => `audit_logs_${s}`).join(", ")}</b>
          </p>
          {r.data.items.length === 0 ? <Empty title="No records match" hint="Try clearing the filters." /> : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full">
                <thead className="border-b border-white/10"><tr><th className="th">ID</th><th className="th">Time</th><th className="th">Action</th><th className="th">Actor</th><th className="th">Event</th><th className="th">Shard</th><th className="th">Details</th></tr></thead>
                <tbody>
                  {r.data.items.map(i => (
                    <tr key={i.id} className="border-b border-white/5 align-top last:border-0">
                      <td className="td tabular-nums text-slate-400">{i.id}</td>
                      <td className="td whitespace-nowrap">{fmtDate(i.created_at)}</td>
                      <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs ${badge(i.action)}`}>{i.action}</span></td>
                      <td className="td font-mono text-xs">{short(i.actor_id)}</td>
                      <td className="td font-mono text-xs">{short(i.event_id)}</td>
                      <td className="td">{i.shard}</td>
                      <td className="td max-w-xs truncate font-mono text-xs text-slate-400" title={JSON.stringify(i.details)}>{JSON.stringify(i.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {r.data.next_cursor && <Link href={`/admin/audit-logs?${next}`} className="btn mt-4">Load next 50</Link>}
        </>
      )}
    </Shell>
  );
}
