"use client";

function csrfToken(): string {
  const m = document.cookie.split("; ").find(c => c.startsWith("csrf_token="));
  return m ? decodeURIComponent(m.split("=")[1]) : "";
}

export interface ClientResult<T = any> { ok: boolean; status: number; data: T }

/** Browser fetch to the API (same origin via Next proxy). Adds the CSRF header. */
export async function api<T = any>(path: string, method: "GET" | "POST" | "PATCH" = "GET", body?: unknown): Promise<ClientResult<T>> {
  const res = await fetch(path, {
    method, credentials: "same-origin",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
