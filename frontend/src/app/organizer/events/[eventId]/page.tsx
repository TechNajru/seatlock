import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { SeatMap } from "@/components/seats/SeatMap";
import { EditEventForm } from "@/components/organizer/EditEventForm";
import { ErrorBox, Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import type { SeatMapData } from "@/types";

export const dynamic = "force-dynamic";

export default async function ManageEvent({ params }: { params: { eventId: string } }) {
  const user = await requireUser();
  const r = guard(await serverFetch<SeatMapData & { error?: string }>(`/api/events/${params.eventId}/seats`));
  return (
    <Shell user={user}>
      {r.status === 403 ? <Forbidden message="You can only manage your own events." />
        : r.status !== 200 ? <ErrorBox message={r.data.error || "Could not load this event."} /> : (
        <>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Manage: {r.data.event.title}</h1>
            <Link href={`/organizer/attendees/${params.eventId}`} className="btn-ghost">Attendees</Link>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <SeatMap eventId={params.eventId} role={user.role} initial={r.data} />
            <EditEventForm event={r.data.event} />
          </div>
        </>
      )}
    </Shell>
  );
}
