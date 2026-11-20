import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import type { EventItem, User } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await requireUser();
  const users = guard(await serverFetch<User[]>("/api/admin/users"));
  const events = await serverFetch<EventItem[]>("/api/events");
  if (users.status === 403) return <Shell user={user}><Forbidden /></Shell>;
  const count = (role: string) => users.data.filter(u => u.role === role).length;
  const stats = [["Students", count("STUDENT")], ["Organizers", count("ORGANIZER")], ["Admins", count("ADMIN")], ["Events", events.data.length]];
  return (
    <Shell user={user}>
      <h1 className="mb-6 text-2xl font-bold">Admin dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([l, v]) => <div key={l as string} className="card"><p className="text-sm text-slate-400">{l}</p><p className="mt-1 text-3xl font-bold">{v}</p></div>)}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users" className="card hover:border-brand-500/50"><h2 className="font-semibold">Manage users and roles</h2><p className="mt-1 text-sm text-slate-300">Promote students to organizers or change roles.</p></Link>
        <Link href="/admin/audit-logs" className="card hover:border-brand-500/50"><h2 className="font-semibold">Audit logs</h2><p className="mt-1 text-sm text-slate-300">See every login, hold, booking and denied request.</p></Link>
      </div>
    </Shell>
  );
}
