"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api } from "@/lib/client";

export function CreateEventForm() {
  const router = useRouter();
  const [f, setF] = useState({ title: "", venue: "", description: "", start: "", rows: 5, cols: 10, publish: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await api("/api/events", "POST", {
      title: f.title, venue: f.venue, description: f.description, rows: Number(f.rows), cols: Number(f.cols),
      start_time: new Date(f.start).toISOString(), status: f.publish ? "PUBLISHED" : "DRAFT",
    });
    setBusy(false);
    if (!r.ok) return setError([r.data.error, ...(r.data.issues || [])].join(" "));
    setF({ title: "", venue: "", description: "", start: "", rows: 5, cols: 10, publish: true });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="text-lg font-semibold">Create an event</h2>
      <div><label className="label" htmlFor="t">Title</label><input id="t" className="input" required value={f.title} onChange={e => set("title", e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="v">Venue</label><input id="v" className="input" value={f.venue} onChange={e => set("venue", e.target.value)} /></div>
        <div><label className="label" htmlFor="s">Starts</label><input id="s" className="input" type="datetime-local" required value={f.start} onChange={e => set("start", e.target.value)} /></div>
        <div><label className="label" htmlFor="r">Rows (1–26)</label><input id="r" className="input" type="number" min={1} max={26} value={f.rows} onChange={e => set("rows", e.target.value)} /></div>
        <div><label className="label" htmlFor="c">Seats per row (1–30)</label><input id="c" className="input" type="number" min={1} max={30} value={f.cols} onChange={e => set("cols", e.target.value)} /></div>
      </div>
      <div><label className="label" htmlFor="d">Description</label><textarea id="d" className="input" rows={2} value={f.description} onChange={e => set("description", e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.publish} onChange={e => set("publish", e.target.checked)} /> Publish now (students can see it)</label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button className="btn" disabled={busy}><Plus className="h-4 w-4" />{busy ? "Creating…" : "Create event"}</button>
    </form>
  );
}
