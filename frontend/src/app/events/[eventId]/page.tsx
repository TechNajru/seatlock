import { CalendarClock, MapPin } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { SeatMap } from "@/components/seats/SeatMap";
import { ErrorBox, Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import { fmtDate } from "@/utils/format";
import type { SeatMapData } from "@/types";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: { eventId: string } }) {
  const user = await requireUser();
  const r = guard(await serverFetch<SeatMapData & { error?: string }>(`/api/events/${params.eventId}/seats`));
  return (
    <Shell user={user}>
      {r.status === 403 ? <Forbidden message="You can only open seat maps for your own events." />
        : r.status !== 200 ? <ErrorBox message={r.data.error || "Could not load this event."} /> : (
        <>
          <h1 className="text-2xl font-bold">{r.data.event.title}</h1>
          <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
            <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-400" />{fmtDate(r.data.event.start_time)}</span>
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-400" />{r.data.event.venue || "Venue to be announced"}</span>
          </p>
          <div className="mt-6"><SeatMap eventId={params.eventId} role={user.role} initial={r.data} /></div>
        </>
      )}
    </Shell>
  );
}
