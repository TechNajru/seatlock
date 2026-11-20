"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { api } from "@/lib/client";

const demo = [
  { label: "Student", email: "student1@seatlock.dev", password: "password123" },
  { label: "Organizer", email: "organizer1@seatlock.dev", password: "password123" },
  { label: "Admin", email: "admin@seatlock.dev", password: "admin123" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await api("/api/auth/login", "POST", { email, password });
    setBusy(false);
    if (!r.ok) return setError(r.data.error || "Could not log in.");
    router.push("/"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></div>
      <div><label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div>
      {error && <p role="alert" className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}
      <button className="btn w-full" disabled={busy}><LogIn className="h-4 w-4" /> {busy ? "Logging in…" : "Log in"}</button>
      <div className="border-t border-white/10 pt-4">
        <p className="mb-2 text-xs text-slate-400">Demo accounts (click to fill)</p>
        <div className="flex gap-2">
          {demo.map(d => (
            <button type="button" key={d.label} className="btn-ghost flex-1" onClick={() => { setEmail(d.email); setPassword(d.password); }}>{d.label}</button>
          ))}
        </div>
      </div>
    </form>
  );
}
