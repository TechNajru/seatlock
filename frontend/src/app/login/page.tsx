import { Armchair } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Armchair className="mx-auto h-10 w-10 text-brand-400" />
          <h1 className="mt-3 text-3xl font-bold">SeatLock</h1>
          <p className="mt-1 text-sm text-slate-300">Book your seat for the fest. One seat, one student.</p>
        </div>
        <div className="card"><LoginForm /></div>
      </div>
    </main>
  );
}
