export const API_BASE =
  process.env.NEXT_PUBLIC_OPS_API_BASE || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("slotly_ops_token");
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("slotly_ops_token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("slotly_ops_token");
}

export async function apiFetch(path: string, init?: RequestInit) {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const msg = typeof body === "string" ? body : body?.detail || "Request failed";
    throw new Error(msg);
  }
  return res;
}
