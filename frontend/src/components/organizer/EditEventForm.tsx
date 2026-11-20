"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { api } from "@/lib/client";
import type { EventItem } from "@/types";

const toLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function EditEventForm({ event }: { event: EventItem }) {
  const router = useRouter();
  const [f, setF] = useState({ title: event.title, venue: event.venue, description: event.description, start: toLocal(event.start_time), status: event.status });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    // `version` is what you saw when the page loaded. If someone else saved first, the API answers 409.
    const r = await api(`/api/events/${event.id}`, "PATCH", {
      version: event.version, title: f.title, venue: f.venue, description: f.description,
      start_time: new Date(f.start).toISOString(), status: f.status,
    });
    setBusy(false);
    if (r.status === 409) return setMsg({ ok: false, text: "Someone else changed this event. Reload the page to get the latest version." });
    if (!r.ok) return setMsg({ ok: false, text: [r.data.error, ...(r.data.issues || [])].join(" ") });
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="text-lg font-semibold">Event details <span className="text-xs font-normal text-slate-400">(version {event.version})</span></h2>
      <div><label className="label" htmlFor="et">Title</label><input id="et" className="input" required value={f.title} onChange={e => set("title", e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="ev">Venue</label><input id="ev" className="input" value={f.venue} onChange={e => set("venue", e.target.value)} /></div>
        <div><label className="label" htmlFor="es">Starts</label><input id="es" className="input" type="datetime-local" required value={f.start} onChange={e => set("start", e.target.value)} /></div>
      </div>
      <div><label className="label" htmlFor="ed">Description</label><textarea id="ed" className="input" rows={2} value={f.description} onChange={e => set("description", e.target.value)} /></div>
      <div><label className="label" htmlFor="est">Status</label>
        <select id="est" className="input" value={f.status} onChange={e => set("status", e.target.value)}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></div>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-300" : "text-red-300"}`}>{msg.text}</p>}
      <button className="btn" disabled={busy}><Save className="h-4 w-4" />{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
