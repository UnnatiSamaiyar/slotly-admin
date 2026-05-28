"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../lib/api";

type RescheduleUser = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
} | null;

type RescheduleBooking = {
  id?: number | string | null;
  title?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  raw_status?: string | null;
} | null;

type TokenStatus = {
  has_token?: boolean | null;
  expired?: boolean | null;
  expires_at?: string | null;
} | null;

type RescheduleRequest = {
  id: number | string;
  booking_id?: number | string | null;
  policy?: string | null;
  state?: string | null;
  token_status?: TokenStatus;
  expires_at?: string | null;
  created_at?: string | null;
  booking?: RescheduleBooking;
  created_by_user?: RescheduleUser;
};

type RescheduleResponse = {
  items?: RescheduleRequest[];
  data?: RescheduleRequest[];
  requests?: RescheduleRequest[];
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  totalPages?: number;
};

type Filters = {
  state: string;
  policy: string;
  bookingId: string;
  createdByUserId: string;
  dateFrom: string;
  dateTo: string;
};

const stateOptions = [
  { label: "All states", value: "all" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Canceled", value: "canceled" },
];

const policyOptions = [
  { label: "All policies", value: "all" },
  { label: "Confirm required", value: "confirm_required" },
  { label: "Manual", value: "manual" },
  { label: "Auto", value: "auto" },
  { label: "Force", value: "force" },
];

const stateStyles: Record<string, { bg: string; color: string; border: string }> = {
  open: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
  pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  completed: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  expired: { bg: "#f8fafc", color: "#475569", border: "#cbd5e1" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  canceled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  default: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

function formatLabel(value?: string | null): string {
  if (!value) return "Not available";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value?: number | null): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN").format(safe);
}

function getRows(data: RescheduleResponse | RescheduleRequest[]): RescheduleRequest[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.requests)) return data.requests;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function isExpired(request: RescheduleRequest): boolean {
  if (request.token_status?.expired) return true;
  const state = String(request.state || "").toLowerCase();
  if (state === "expired") return true;
  const expiresAt = request.expires_at || request.token_status?.expires_at;
  if (!expiresAt) return false;
  const date = new Date(expiresAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function StateBadge({ request }: { request: RescheduleRequest }) {
  const expired = isExpired(request);
  const rawState = expired ? "expired" : request.state || "unknown";
  const key = String(rawState).toLowerCase();
  const style = stateStyles[key] || stateStyles.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${style.border}`, background: style.bg, color: style.color, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {formatLabel(rawState)}
    </span>
  );
}

function TokenBadge({ request }: { request: RescheduleRequest }) {
  const expired = isExpired(request);
  const hasToken = Boolean(request.token_status?.has_token);
  const text = expired ? "Expired" : hasToken ? "Token active" : "No token";
  const color = expired ? { bg: "#f8fafc", color: "#475569", border: "#cbd5e1" } : hasToken ? { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" } : { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${color.border}`, background: color.bg, color: color.color, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

function LoadingRows() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, row) => (
        <tr key={row} style={{ borderBottom: "1px solid #eef2f7" }}>
          {Array.from({ length: 8 }).map((__, cell) => (
            <td key={cell} style={{ padding: "14px 16px" }}>
              <div style={{ height: cell === 0 ? 34 : 14, width: cell === 7 ? 94 : cell === 0 ? 180 : 130, maxWidth: "100%", borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <tbody>
      <tr>
        <td colSpan={8} style={{ padding: 34, textAlign: "center" }}>
          <div style={{ maxWidth: 430, margin: "0 auto" }}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>{filtered ? "No matching reschedule requests" : "No reschedule requests found"}</h3>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>
              {filtered ? "Try changing filters or date range." : "Reschedule requests will appear here when users request booking changes."}
            </p>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

export default function RescheduleRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<Filters>({ state: "all", policy: "all", bookingId: "", createdByUserId: "", dateFrom: "", dateTo: "" });

  const hasActiveFilters = useMemo(() => {
    return filters.state !== "all" || filters.policy !== "all" || Boolean(filters.bookingId || filters.createdByUserId || filters.dateFrom || filters.dateTo);
  }, [filters]);

  async function loadRequests(nextPage = page) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("limit", String(limit));
    if (filters.state !== "all") params.set("state", filters.state);
    if (filters.policy !== "all") params.set("policy", filters.policy);
    if (filters.bookingId.trim()) params.set("booking_id", filters.bookingId.trim());
    if (filters.createdByUserId.trim()) params.set("created_by_user_id", filters.createdByUserId.trim());
    if (filters.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters.dateTo) params.set("date_to", filters.dateTo);

    try {
      const response = await fetch(`${API_BASE}/ops/reschedule-requests?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        let message = "Failed to load reschedule requests";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          // keep default message
        }
        throw new Error(message);
      }

      const data = (await response.json()) as RescheduleResponse | RescheduleRequest[];
      const rows = getRows(data);
      const responseMeta = Array.isArray(data) ? {} : data;
      const nextTotal = responseMeta.total ?? rows.length;
      const nextTotalPages = responseMeta.total_pages ?? responseMeta.totalPages ?? (nextTotal ? Math.ceil(nextTotal / limit) : 0);

      setRequests(rows);
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);
      setPage(responseMeta.page ?? nextPage);
    } catch (err) {
      setRequests([]);
      setTotal(0);
      setTotalPages(0);
      setError(err instanceof Error ? err.message : "Failed to load reschedule requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPage(1);
    loadRequests(1);
  }

  function resetFilters() {
    setFilters({ state: "all", policy: "all", bookingId: "", createdByUserId: "", dateFrom: "", dateTo: "" });
    setPage(1);
    setTimeout(() => loadRequests(1), 0);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || (totalPages && nextPage > totalPages)) return;
    setPage(nextPage);
    loadRequests(nextPage);
  }

  return (
    <main style={{ width: "100%", minWidth: 0, overflowX: "hidden" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 8px", color: "#2563eb", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Booking operations</p>
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.1, letterSpacing: "-0.04em" }}>Reschedule requests</h1>
          <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14, maxWidth: 720 }}>Inspect booking reschedule requests safely. Raw tokens are never displayed.</p>
        </div>
        <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>
          {formatNumber(total)} total
        </div>
      </section>

      <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, padding: 16, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>State</span>
            <select value={filters.state} onChange={(event) => updateFilter("state", event.target.value)} style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }}>
              {stateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Policy</span>
            <select value={filters.policy} onChange={(event) => updateFilter("policy", event.target.value)} style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }}>
              {policyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Booking ID</span>
            <input value={filters.bookingId} onChange={(event) => updateFilter("bookingId", event.target.value)} placeholder="Example: 12" inputMode="numeric" style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Created by user ID</span>
            <input value={filters.createdByUserId} onChange={(event) => updateFilter("createdByUserId", event.target.value)} placeholder="Example: 1" inputMode="numeric" style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>From</span>
            <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>To</span>
            <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" onClick={applyFilters} style={{ border: "1px solid #2563eb", background: "#2563eb", color: "#ffffff", borderRadius: 12, padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}>Apply filters</button>
          <button type="button" onClick={resetFilters} style={{ border: "1px solid #dbeafe", background: "#ffffff", color: "#2563eb", borderRadius: 12, padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}>Reset</button>
        </div>
      </section>

      {error ? (
        <section style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 18, padding: 18, marginBottom: 18 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>Could not load reschedule requests</h2>
          <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
          <button type="button" onClick={() => loadRequests(page)} style={{ marginTop: 12, border: "1px solid #fecaca", background: "#ffffff", color: "#991b1b", borderRadius: 12, padding: "9px 12px", fontWeight: 900, cursor: "pointer" }}>Retry</button>
        </section>
      ) : null}

      <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, overflow: "hidden", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1040, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                {["Booking", "Guest", "Host", "Policy", "State", "Expires At", "Created At", "Actions"].map((header) => (
                  <th key={header} style={{ padding: "13px 16px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            {loading ? <LoadingRows /> : requests.length === 0 ? <EmptyState filtered={hasActiveFilters} /> : (
              <tbody>
                {requests.map((request) => {
                  const booking = request.booking;
                  const bookingId = request.booking_id || booking?.id;
                  const guestName = booking?.guest_name || "Guest";
                  const guestEmail = booking?.guest_email || "Email not available";
                  const host = request.created_by_user?.name || request.created_by_user?.email || "Not available";
                  return (
                    <tr key={String(request.id)} style={{ borderBottom: "1px solid #eef2f7" }}>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 220 }}>
                        <div style={{ color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{booking?.title || `Booking #${bookingId || "N/A"}`}</div>
                        <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>ID: {bookingId || "Not linked"}</div>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 240 }}>
                        <div title={guestName} style={{ color: "#0f172a", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guestName}</div>
                        <div title={guestEmail} style={{ marginTop: 4, color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guestEmail}</div>
                      </td>
                      <td title={host} style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{host}</td>
                      <td style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatLabel(request.policy)}</td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                          <StateBadge request={request} />
                          <TokenBadge request={request} />
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: isExpired(request) ? "#b91c1c" : "#334155", verticalAlign: "top", whiteSpace: "nowrap", fontWeight: isExpired(request) ? 800 : 500 }}>{formatDateTime(request.expires_at || request.token_status?.expires_at)}</td>
                      <td style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDateTime(request.created_at)}</td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        {bookingId ? (
                          <Link href={`/bookings/${bookingId}`} style={{ display: "inline-flex", alignItems: "center", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 900, textDecoration: "none" }}>
                            View booking
                          </Link>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>No booking link</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 16px", background: "#f8fbff", borderTop: "1px solid #e2e8f0" }}>
          <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
            Page {formatNumber(page)} of {formatNumber(totalPages || 1)} · {formatNumber(total)} requests
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }} style={{ border: "1px solid #dbeafe", borderRadius: 12, padding: "8px 10px", color: "#0f172a", background: "#ffffff" }}>
              {[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value} / page</option>)}
            </select>
            <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading} style={{ border: "1px solid #dbeafe", background: "#ffffff", color: page <= 1 ? "#94a3b8" : "#2563eb", borderRadius: 12, padding: "8px 11px", fontWeight: 900, cursor: page <= 1 || loading ? "not-allowed" : "pointer" }}>Previous</button>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={loading || (totalPages > 0 && page >= totalPages)} style={{ border: "1px solid #dbeafe", background: "#ffffff", color: totalPages > 0 && page >= totalPages ? "#94a3b8" : "#2563eb", borderRadius: 12, padding: "8px 11px", fontWeight: 900, cursor: loading || (totalPages > 0 && page >= totalPages) ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        </div>
      </section>
    </main>
  );
}
