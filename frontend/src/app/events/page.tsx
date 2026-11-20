import { Shell } from "@/components/layout/Shell";
import { EventCard } from "@/components/events/EventCard";
import { Empty, Forbidden } from "@/components/ui/Forbidden";
import { guard, requireUser, serverFetch } from "@/lib/server";
import type { EventItem } from "@/types";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const user = await requireUser();
  const r = guard(await serverFetch<EventItem[]>("/api/events"));
  return (
    <Shell user={user}>
      <h1 className="text-2xl font-bold">{user.role === "STUDENT" ? "Upcoming events" : "Events"}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-300">Pick an event to see the seat map.</p>
      {r.status === 403 ? <Forbidden /> : r.data.length === 0 ? <Empty title="No events yet" hint="Check back soon." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {r.data.map(e => <EventCard key={e.id} event={e} href={`/events/${e.id}`} />)}
        </div>
      )}
    </Shell>
  );
}
