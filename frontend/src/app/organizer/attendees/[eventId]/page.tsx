import { Shell } from "@/components/layout/Shell";
import { CheckInButton } from "@/components/organizer/CheckInButton";
import { Empty, ErrorBox, Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import { fmtDate } from "@/utils/format";
import type { Attendee } from "@/types";

export const dynamic = "force-dynamic";

export default async function Attendees({ params }: { params: { eventId: string } }) {
  const user = await requireUser();
  const r = guard(await serverFetch<Attendee[] & { error?: string }>(`/api/organizer/events/${params.eventId}/bookings`));
  return (
    <Shell user={user}>
      <h1 className="mb-6 text-2xl font-bold">Attendees</h1>
      {r.status === 403 ? <Forbidden message="You can only see attendees of your own events." />
        : r.status !== 200 ? <ErrorBox message={(r.data as any).error || "Could not load attendees."} />
        : r.data.length === 0 ? <Empty title="No bookings yet" hint="Attendees appear here after students confirm seats." /> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-white/10"><tr><th className="th">Student</th><th className="th">Seats</th><th className="th">Status</th><th className="th">Check-in</th></tr></thead>
            <tbody>
              {r.data.map(a => (
                <tr key={a.id} className="border-b border-white/5 last:border-0">
                  <td className="td"><div className="font-medium">{a.student_name}</div><div className="text-xs text-slate-400">{a.student_email}</div></td>
                  <td className="td">{a.seats.join(", ")}</td>
                  <td className="td">{a.status === "CANCELLED" ? "Cancelled" : "Confirmed"}</td>
                  <td className="td">{a.checked_in_at ? <span className="text-green-300">Checked in {fmtDate(a.checked_in_at)}</span> : a.status === "CONFIRMED" ? <CheckInButton bookingId={a.id} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
