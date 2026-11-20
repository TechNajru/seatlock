import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export function Forbidden({ message }: { message?: string }) {
  return (
    <div className="card mx-auto mt-16 max-w-md text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-red-400" />
      <h1 className="mt-3 text-2xl font-bold">403: Access denied</h1>
      <p className="mt-2 text-sm text-slate-300">{message || "Your role does not allow this action. The server blocked it and recorded the attempt."}</p>
      <Link href="/" className="btn mt-5">Back to my dashboard</Link>
    </div>
  );
}
export function ErrorBox({ message }: { message: string }) {
  return <div className="card mt-8 border-red-400/30 text-sm text-red-200">{message}</div>;
}
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card text-center">
      <p className="font-semibold">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
