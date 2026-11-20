import Link from "next/link";
import { CalendarClock, MapPin } from "lucide-react";
import type { EventItem } from "@/types";
import { fmtDate } from "@/utils/format";

export function EventCard({ event, href, children }: { event: EventItem; href: string; children?: React.ReactNode }) {
  const pct = event.total_seats ? Math.round(((event.available_seats ?? 0) / event.total_seats) * 100) : 0;
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug">{event.title}</h3>
        {event.status === "DRAFT" && <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-xs text-yellow-300">Draft</span>}
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-300"><CalendarClock className="h-4 w-4 text-brand-400" />{fmtDate(event.start_time)}</p>
      <p className="flex items-center gap-2 text-sm text-slate-300"><MapPin className="h-4 w-4 text-brand-400" />{event.venue || "Venue to be announced"}</p>
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{event.available_seats} of {event.total_seats} seats free</span><span>{pct}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Link href={href} className="btn">View seats</Link>
        {children}
      </div>
    </div>
  );
}
