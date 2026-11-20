import { CalendarClock, MapPin } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { CancelButton } from "@/components/bookings/CancelButton";
import { Empty, Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import { fmtDate } from "@/utils/format";
import type { Booking } from "@/types";

export const dynamic = "force-dynamic";

export default async function MyBookings() {
  const user = await requireUser();
  const r = guard(await serverFetch<Booking[]>("/api/bookings/my"));
  return (
    <Shell user={user}>
      <h1 className="mb-6 text-2xl font-bold">My bookings</h1>
      {r.status === 403 ? <Forbidden message="Only students have bookings." /> : r.data.length === 0 ? <Empty title="No bookings yet" hint="Pick an event and hold your seats." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {r.data.map(b => (
            <div key={b.id} className="card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{b.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs ${b.status === "CONFIRMED" ? "bg-green-500/15 text-green-300" : "bg-slate-500/20 text-slate-300"}`}>
                  {b.status === "CONFIRMED" ? (b.checked_in_at ? "Checked in" : "Confirmed") : "Cancelled"}
                </span>
              </div>
              <p className="flex items-center gap-2 text-sm text-slate-300"><CalendarClock className="h-4 w-4 text-brand-400" />{fmtDate(b.start_time)}</p>
              <p className="flex items-center gap-2 text-sm text-slate-300"><MapPin className="h-4 w-4 text-brand-400" />{b.venue}</p>
              <p className="text-sm">Seats: <b>{b.seats.join(", ")}</b></p>
              {b.status === "CONFIRMED" && !b.checked_in_at && <CancelButton bookingId={b.id} />}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
