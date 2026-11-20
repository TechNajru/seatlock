"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { api } from "@/lib/client";

export function CheckInButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button className="btn" disabled={busy} onClick={async () => {
        setBusy(true);
        const r = await api(`/api/organizer/bookings/${bookingId}/check-in`, "POST");
        setBusy(false);
        if (!r.ok) return setError(r.data.error);
        router.refresh();
      }}><UserCheck className="h-4 w-4" />{busy ? "Checking in…" : "Check in"}</button>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
