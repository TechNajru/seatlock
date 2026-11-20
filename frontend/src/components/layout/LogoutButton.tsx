"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button className="btn-ghost" onClick={async () => { await api("/api/auth/logout", "POST"); router.push("/login"); router.refresh(); }}>
      <LogOut className="h-4 w-4" /> Log out
    </button>
  );
}
