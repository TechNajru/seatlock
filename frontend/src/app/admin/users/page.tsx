import { Shell } from "@/components/layout/Shell";
import { RoleSelect } from "@/components/admin/RoleSelect";
import { Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import type { User } from "@/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireUser();
  const r = guard(await serverFetch<User[]>("/api/admin/users"));
  return (
    <Shell user={user}>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>
      {r.status === 403 ? <Forbidden /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-white/10"><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th></tr></thead>
            <tbody>
              {r.data.map(u => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="td font-medium">{u.name}</td><td className="td text-slate-300">{u.email}</td>
                  <td className="td"><RoleSelect userId={u.id} role={u.role} disabled={u.id === user.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
