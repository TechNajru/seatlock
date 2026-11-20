import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { EventCard } from "@/components/events/EventCard";
import { CreateEventForm } from "@/components/organizer/CreateEventForm";
import { Empty, Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import type { EventItem } from "@/types";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboard() {
  const user = await requireUser();
  // the API enforces the role: a student gets HTTP 403 here (and an ACCESS_DENIED audit record)
  const r = guard(await serverFetch<EventItem[]>("/api/organizer/events"));
  return (
    <Shell user={user}>
      {r.status === 403 ? <Forbidden /> : (
        <>
          <h1 className="mb-6 text-2xl font-bold">My events</h1>
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="grid content-start gap-4 sm:grid-cols-2">
              {r.data.length === 0 && <div className="sm:col-span-2"><Empty title="No events yet" hint="Create your first event using the form." /></div>}
              {r.data.map(e => (
                <EventCard key={e.id} event={e} href={`/organizer/events/${e.id}`}>
                  <Link href={`/organizer/attendees/${e.id}`} className="btn-ghost">Attendees</Link>
                </EventCard>
              ))}
            </div>
            <CreateEventForm />
          </div>
        </>
      )}
    </Shell>
  );
}
