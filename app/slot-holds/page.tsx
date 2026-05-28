"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../lib/api";

type BasicUser = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
} | null;

type BasicProfile = {
  id?: number | string | null;
  slug?: string | null;
  title?: string | null;
  timezone?: string | null;
} | null;

type BasicBooking = {
  id?: number | string | null;
  title?: string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
} | null;

type SlotHold = {
  id: number | string;
  booking_id?: number | string | null;
  reschedule_request_id?: number | string | null;
  host_user?: BasicUser;
  host?: BasicUser;
  profile?: BasicProfile;
  booking?: BasicBooking;
  profile_id?: number | string | null;
  start_time?: string | null;
  end_time?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
  status?: string | null;
};

type SlotHoldsResponse = {
  items?: SlotHold[];
  data?: SlotHold[];
  slot_holds?: SlotHold[];
  holds?: SlotHold[];
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  totalPages?: number;
};

type Filters = {
  status: string;
  hostUserId: string;
  profileId: string;
  bookingId: string;
  rescheduleRequestId: string;
  dateFrom: string;
  dateTo: string;
};

const statusOptions = [
  { label: "All holds", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
];

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  active: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
  expired: { bg: "#f8fafc", color: "#475569", border: "#cbd5e1" },
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

function getRows(data: SlotHoldsResponse | SlotHold[]): SlotHold[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.slot_holds)) return data.slot_holds;
  if (Array.isArray(data.holds)) return data.holds;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function getHoldStatus(hold: SlotHold): "active" | "expired" {
  const rawStatus = String(hold.status || "").toLowerCase();
  if (rawStatus === "active" || rawStatus === "expired") return rawStatus;

  if (!hold.expires_at) return "active";
  const expiresAt = new Date(hold.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return "active";
  return expiresAt.getTime() < Date.now() ? "expired" : "active";
}

function StatusBadge({ hold }: { hold: SlotHold }) {
  const status = getHoldStatus(hold);
  const style = statusStyles[status] || statusStyles.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${style.border}`, background: style.bg, color: style.color, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {formatLabel(status)}
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
              <div style={{ height: cell === 0 ? 34 : 14, width: cell === 7 ? 94 : cell === 0 ? 190 : 130, maxWidth: "100%", borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
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
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>{filtered ? "No matching slot holds" : "No slot holds found"}</h3>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>
              {filtered ? "Try changing filters or date range." : "Temporary locked slots will appear here when the booking system creates holds."}
            </p>
          </div>
        </td>
      </tr>
    </tbody>
  );
}

export default function SlotHoldsPage() {
  const router = useRouter();
  const [holds, setHolds] = useState<SlotHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    hostUserId: "",
    profileId: "",
    bookingId: "",
    rescheduleRequestId: "",
    dateFrom: "",
    dateTo: "",
  });

  const hasActiveFilters = useMemo(() => {
    return filters.status !== "all" || Boolean(filters.hostUserId || filters.profileId || filters.bookingId || filters.rescheduleRequestId || filters.dateFrom || filters.dateTo);
  }, [filters]);

  async function loadSlotHolds(nextPage = page) {
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
    if (filters.status === "active") params.set("active", "true");
    if (filters.status === "expired") params.set("expired", "true");
    if (filters.hostUserId.trim()) params.set("host_user_id", filters.hostUserId.trim());
    if (filters.profileId.trim()) params.set("profile_id", filters.profileId.trim());
    if (filters.bookingId.trim()) params.set("booking_id", filters.bookingId.trim());
    if (filters.rescheduleRequestId.trim()) params.set("reschedule_request_id", filters.rescheduleRequestId.trim());
    if (filters.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters.dateTo) params.set("date_to", filters.dateTo);

    try {
      const response = await fetch(`${API_BASE}/ops/slot-holds?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        let message = "Failed to load slot holds";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          // keep default message
        }
        throw new Error(message);
      }

      const data = (await response.json()) as SlotHoldsResponse | SlotHold[];
      const rows = getRows(data);
      const responseMeta = Array.isArray(data) ? {} : data;
      const nextTotal = responseMeta.total ?? rows.length;
      const nextTotalPages = responseMeta.total_pages ?? responseMeta.totalPages ?? (nextTotal ? Math.ceil(nextTotal / limit) : 0);

      setHolds(rows);
      setTotal(nextTotal);
      setTotalPages(nextTotalPages);
      setPage(responseMeta.page ?? nextPage);
    } catch (err) {
      setHolds([]);
      setTotal(0);
      setTotalPages(0);
      setError(err instanceof Error ? err.message : "Failed to load slot holds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlotHolds(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPage(1);
    loadSlotHolds(1);
  }

  function resetFilters() {
    setFilters({ status: "all", hostUserId: "", profileId: "", bookingId: "", rescheduleRequestId: "", dateFrom: "", dateTo: "" });
    setPage(1);
    setTimeout(() => loadSlotHolds(1), 0);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || (totalPages && nextPage > totalPages)) return;
    setPage(nextPage);
    loadSlotHolds(nextPage);
  }

  return (
    <main style={{ width: "100%", minWidth: 0, overflowX: "hidden" }}>
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 8px", color: "#2563eb", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Booking operations</p>
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.1, letterSpacing: "-0.04em" }}>Slot holds</h1>
          <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14, maxWidth: 720 }}>Inspect temporary locked slots safely. Active and expired holds are calculated from expiry time.</p>
        </div>
        <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900 }}>
          {formatNumber(total)} total
        </div>
      </section>

      <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, padding: 16, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)", marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Host user ID</span>
            <input value={filters.hostUserId} onChange={(event) => updateFilter("hostUserId", event.target.value)} placeholder="Example: 1" inputMode="numeric" style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Profile ID</span>
            <input value={filters.profileId} onChange={(event) => updateFilter("profileId", event.target.value)} placeholder="Example: 5" inputMode="numeric" style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Booking ID</span>
            <input value={filters.bookingId} onChange={(event) => updateFilter("bookingId", event.target.value)} placeholder="Example: 12" inputMode="numeric" style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>Reschedule request ID</span>
            <input value={filters.rescheduleRequestId} onChange={(event) => updateFilter("rescheduleRequestId", event.target.value)} placeholder="Example: 4" inputMode="numeric" style={{ width: "100%", border: "1px solid #dbeafe", borderRadius: 12, padding: "10px 11px", color: "#0f172a", background: "#ffffff", outline: "none" }} />
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
          <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>Could not load slot holds</h2>
          <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
          <button type="button" onClick={() => loadSlotHolds(page)} style={{ marginTop: 12, border: "1px solid #fecaca", background: "#ffffff", color: "#991b1b", borderRadius: 12, padding: "9px 12px", fontWeight: 900, cursor: "pointer" }}>Retry</button>
        </section>
      ) : null}

      <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, overflow: "hidden", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1040, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                {["Host", "Booking", "Profile", "Slot Time", "Expires At", "Status", "Created At", "Actions"].map((header) => (
                  <th key={header} style={{ padding: "13px 16px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            {loading ? <LoadingRows /> : holds.length === 0 ? <EmptyState filtered={hasActiveFilters} /> : (
              <tbody>
                {holds.map((hold) => {
                  const host = hold.host_user || hold.host;
                  const booking = hold.booking;
                  const bookingId = hold.booking_id || booking?.id;
                  const profile = hold.profile;
                  const profileTitle = profile?.title || profile?.slug || (hold.profile_id ? `Profile #${hold.profile_id}` : "Not linked");
                  const guest = booking?.guest_name || booking?.guest_email || "Not available";
                  const expired = getHoldStatus(hold) === "expired";

                  return (
                    <tr key={String(hold.id)} style={{ borderBottom: "1px solid #eef2f7" }}>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 220 }}>
                        <div title={host?.name || host?.email || "Not assigned"} style={{ color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{host?.name || "Not assigned"}</div>
                        <div title={host?.email || "Email not available"} style={{ marginTop: 4, color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{host?.email || "Email not available"}</div>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 230 }}>
                        <div style={{ color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{booking?.title || `Booking #${bookingId || "N/A"}`}</div>
                        <div title={guest} style={{ marginTop: 4, color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guest}</div>
                      </td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 210 }}>
                        <div title={profileTitle} style={{ color: "#334155", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileTitle}</div>
                        <div title={profile?.timezone || "Timezone not available"} style={{ marginTop: 4, color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.timezone || "Timezone not available"}</div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <div>{formatDateTime(hold.start_time)}</div>
                        <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 12 }}>Ends {formatDateTime(hold.end_time)}</div>
                      </td>
                      <td style={{ padding: "14px 16px", color: expired ? "#b91c1c" : "#334155", verticalAlign: "top", whiteSpace: "nowrap", fontWeight: expired ? 800 : 500 }}>{formatDateTime(hold.expires_at)}</td>
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}><StatusBadge hold={hold} /></td>
                      <td style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDateTime(hold.created_at)}</td>
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
            Page {formatNumber(page)} of {formatNumber(totalPages || 1)} · {formatNumber(total)} slot holds
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
