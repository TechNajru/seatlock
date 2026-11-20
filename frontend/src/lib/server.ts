import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@/types";

const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";

export interface ApiResult<T> { status: number; data: T }

/** Server-side fetch: forwards the browser's cookies to the Express API. */
export async function serverFetch<T = any>(path: string): Promise<ApiResult<T>> {
  const cookie = cookies().getAll().map(c => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(BACKEND + path, { headers: { cookie }, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function requireUser(): Promise<User> {
  const r = await serverFetch<{ user: User }>("/api/auth/me");
  if (r.status !== 200) redirect("/login");
  return r.data.user;
}

/** 401 -> login page. Everything else is returned to the page to render. */
export function guard<T>(r: ApiResult<T>): ApiResult<T> {
  if (r.status === 401) redirect("/login");
  return r;
}
