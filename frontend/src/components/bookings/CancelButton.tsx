"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function CancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button className="btn-danger" disabled={busy} onClick={async () => {
        if (!confirm("Cancel this booking? Your seats will be released.")) return;
        setBusy(true);
        const r = await api(`/api/bookings/${bookingId}/cancel`, "POST");
        setBusy(false);
        if (!r.ok) return setError(r.data.error);
        router.refresh();
      }}>{busy ? "Cancelling…" : "Cancel booking"}</button>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
