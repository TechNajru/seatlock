"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Lock, Ticket } from "lucide-react";
import { api } from "@/lib/client";
import { useCountdown } from "@/hooks/useCountdown";
import { mmss } from "@/utils/format";
import type { MyHold, Role, Seat, SeatMapData } from "@/types";

const color: Record<string, string> = {
  AVAILABLE: "bg-green-500/90 hover:bg-green-400 text-green-950",
  HELD: "bg-yellow-400 text-yellow-950 cursor-not-allowed",
  BOOKED: "bg-red-500 text-white cursor-not-allowed",
  BLOCKED: "bg-slate-500 text-slate-100",
  SELECTED: "bg-blue-500 text-white ring-2 ring-blue-300",
};
const legend = [["Available", "bg-green-500"], ["Held by someone", "bg-yellow-400"], ["Booked", "bg-red-500"], ["Blocked", "bg-slate-500"], ["Your selection / hold", "bg-blue-500"]];

export function SeatMap({ eventId, role, initial }: { eventId: string; role: Role; initial: SeatMapData }) {
  const router = useRouter();
  const [seats, setSeats] = useState<Seat[]>(initial.seats);
  const [hold, setHold] = useState<MyHold | null>(initial.my_hold);
  const [selected, setSelected] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const hadHold = useRef(!!initial.my_hold);
  const isStudent = role === "STUDENT";

  const refresh = useCallback(async () => {
    const r = await api<SeatMapData>(`/api/events/${eventId}/seats`);
    if (!r.ok) return;
    setSeats(r.data.seats);
    setHold(r.data.my_hold);
    if (hadHold.current && !r.data.my_hold) setMsg(m => (m?.kind === "ok" ? m : { kind: "warn", text: "Your hold expired. Your seats were released." }));
    hadHold.current = !!r.data.my_hold;
  }, [eventId]);

  // live refresh: other students' holds appear within a few seconds
  useEffect(() => { const t = setInterval(refresh, 4000); return () => clearInterval(t); }, [refresh]);

  const left = useCountdown(hold ? hold.seconds_left : null, refresh);

  async function clickSeat(s: Seat) {
    if (busy) return;
    if (isStudent) {
      if (s.status !== "AVAILABLE") return;
      setMsg(null);
      setSelected(sel => sel.includes(s.id) ? sel.filter(x => x !== s.id) : sel.length >= 4 ? (setMsg({ kind: "warn", text: "You can pick up to 4 seats." }), sel) : [...sel, s.id]);
      return;
    }
    // organizer / admin: block or unblock
    if (s.status !== "AVAILABLE" && s.status !== "BLOCKED") { setMsg({ kind: "warn", text: `Seat ${s.label} is ${s.status.toLowerCase()} and cannot be blocked.` }); return; }
    setBusy(true);
    const r = await api(`/api/organizer/events/${eventId}/seats/block`, "POST", { seat_ids: [s.id], blocked: s.status === "AVAILABLE" });
    setBusy(false);
    setMsg(r.ok ? { kind: "ok", text: `Seat ${s.label} ${s.status === "AVAILABLE" ? "blocked" : "unblocked"}.` } : { kind: "err", text: r.data.error });
    refresh();
  }

  async function holdSeats() {
    setBusy(true); setMsg(null);
    const r = await api(`/api/events/${eventId}/hold`, "POST", { seat_ids: selected });
    setBusy(false);
    if (r.ok) {
      hadHold.current = true; setSelected([]);
      setMsg({ kind: "ok", text: "Seats held. Confirm before the timer runs out." });
    } else if (r.status === 409 && r.data.unavailable) {
      const labels = r.data.unavailable.map((u: any) => u.label).join(", ");
      setSelected([]);
      setMsg({ kind: "err", text: `Seat${r.data.unavailable.length > 1 ? "s" : ""} ${labels} just became unavailable. No seats were held. Pick other seats.` });
    } else if (r.status === 503) {
      setMsg({ kind: "err", text: "The server is busy. Please try again in a moment." });
    } else setMsg({ kind: "err", text: r.data.error || "Could not hold seats." });
    refresh();
  }

  async function confirm() {
    if (!hold) return;
    setBusy(true);
    const r = await api(`/api/holds/${hold.id}/confirm`, "POST");
    setBusy(false);
    if (r.ok) { router.push("/my-bookings"); router.refresh(); return; }
    setMsg({ kind: "err", text: r.data.error || "Could not confirm." });
    refresh();
  }

  const rows = seats.reduce<Record<string, Seat[]>>((acc, s) => { (acc[s.row_label] ||= []).push(s); return acc; }, {});
  const display = (s: Seat) => (s.mine || selected.includes(s.id) ? "SELECTED" : s.status);

  return (
    <div className="space-y-5">
      <div className="card overflow-x-auto">
        <div className="mx-auto mb-6 h-2 w-3/4 rounded-full bg-gradient-to-r from-transparent via-brand-500 to-transparent" aria-hidden />
        <p className="mb-4 text-center text-xs text-slate-400">Stage</p>
        <div className="mx-auto flex w-max flex-col gap-2">
          {Object.entries(rows).map(([row, list]) => (
            <div key={row} className="flex items-center gap-2">
              <span className="w-5 text-xs text-slate-400">{row}</span>
              {list.map(s => (
                <button key={s.id} onClick={() => clickSeat(s)} disabled={busy}
                  aria-label={`Seat ${s.label}, ${display(s).toLowerCase()}`} aria-pressed={selected.includes(s.id)}
                  className={`h-9 w-9 rounded-lg text-[11px] font-semibold transition ${color[display(s)]}`}>
                  {s.status === "BLOCKED" ? <Lock className="mx-auto h-3.5 w-3.5" /> : s.seat_number}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-300">
          {legend.map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><i className={`h-3 w-3 rounded ${c}`} />{l}</span>)}
        </div>
      </div>

      {msg && (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm ${msg.kind === "ok" ? "bg-green-500/15 text-green-200" : msg.kind === "warn" ? "bg-yellow-400/15 text-yellow-200" : "bg-red-500/15 text-red-200"}`}>{msg.text}</p>
      )}

      {isStudent ? (
        <div className="card flex flex-wrap items-center gap-4">
          {hold && left !== null && left > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-500/15 px-3 py-2 text-blue-200" aria-live="polite">
              <Clock className="h-4 w-4" /> Hold expires in <b className="tabular-nums">{mmss(left)}</b>
            </div>
          )}
          <div className="flex-1 text-sm text-slate-300">
            {selected.length ? `${selected.length} seat${selected.length > 1 ? "s" : ""} selected` : hold ? "Pick different seats to replace your hold." : "Select up to 4 seats."}
          </div>
          <button className="btn-ghost" disabled={!selected.length || busy} onClick={holdSeats}><Ticket className="h-4 w-4" />{busy ? "Working…" : `Hold ${selected.length || ""} seat${selected.length === 1 ? "" : "s"}`}</button>
          {hold && <button className="btn" disabled={busy} onClick={confirm}><CheckCircle2 className="h-4 w-4" />Confirm booking</button>}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Click a green seat to block it, or a gray seat to unblock it. Booked seats can never be blocked.</p>
      )}
    </div>
  );
}
