"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { Role } from "@/types";

export function RoleSelect({ userId, role, disabled }: { userId: string; role: Role; disabled?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState<Role>(role);
  const [error, setError] = useState("");
  return (
    <div>
      <select className="input w-auto" value={value} disabled={disabled} aria-label="Role" onChange={async e => {
        const next = e.target.value as Role;
        const r = await api(`/api/admin/users/${userId}/role`, "PATCH", { role: next });
        if (!r.ok) { setError(r.data.error); return; }
        setError(""); setValue(next); router.refresh();
      }}>
        <option value="STUDENT">Student</option><option value="ORGANIZER">Organizer</option><option value="ADMIN">Admin</option>
      </select>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
