import Link from "next/link";
import { Armchair } from "lucide-react";
import type { User } from "@/types";
import { LogoutButton } from "./LogoutButton";

const links: Record<User["role"], { href: string; label: string }[]> = {
  STUDENT: [{ href: "/events", label: "Events" }, { href: "/my-bookings", label: "My bookings" }],
  ORGANIZER: [{ href: "/organizer/dashboard", label: "My events" }],
  ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard" }, { href: "/admin/users", label: "Users" },
    { href: "/admin/audit-logs", label: "Audit logs" }, { href: "/events", label: "All events" },
  ],
};

export function Shell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-navy-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Armchair className="h-5 w-5 text-brand-400" /> SeatLock
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {links[user.role].map(l => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white">{l.label}</Link>
            ))}
          </nav>
          <div className="text-right text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-slate-400">{user.role.toLowerCase()}</div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
