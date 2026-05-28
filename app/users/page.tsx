"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getOpsUsers, getToken, type OpsUser, type UsersListResponse } from "../../lib/api";

const providerOptions = [
  { label: "All providers", value: "all" },
  { label: "Google", value: "google" },
  { label: "Email", value: "email" },
];

const booleanFilterOptions = [
  { label: "Any", value: "all" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const limitOptions = [10, 20, 50, 100];

function formatNumber(value?: number | null): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN").format(safe);
}

function normalizeProvider(user: OpsUser): string {
  return user.auth_provider || user.authProvider || "unknown";
}

function getCount(user: OpsUser, snakeKey: keyof OpsUser, camelKey: keyof OpsUser): number {
  const snakeValue = user[snakeKey];
  const camelValue = user[camelKey];
  if (typeof snakeValue === "number") return snakeValue;
  if (typeof camelValue === "number") return camelValue;
  return 0;
}

function getStatus(user: OpsUser): string {
  if (typeof user.is_active === "boolean") return user.is_active ? "Active" : "Inactive";
  if (typeof user.isActive === "boolean") return user.isActive ? "Active" : "Inactive";
  return user.status || "Active";
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "User";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatLabel(value?: string | null): string {
  if (!value) return "Not available";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function Badge({ children, tone = "blue" }: { children: string; tone?: "blue" | "green" | "slate" }) {
  const styles = {
    blue: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    green: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
    slate: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  }[tone];

  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${styles.border}`, background: styles.bg, color: styles.color, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div style={{ display: "grid", gap: 10, padding: 18 }}>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} style={{ height: 48, borderRadius: 14, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
      ))}
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<UsersListResponse>({ items: [], page: 1, limit: 20, total: 0, total_pages: 1 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [authProvider, setAuthProvider] = useState("all");
  const [timezone, setTimezone] = useState("");
  const [hasBookings, setHasBookings] = useState("all");
  const [hasOrganizations, setHasOrganizations] = useState("all");
  const [googleConnected, setGoogleConnected] = useState("all");
  const [limit, setLimit] = useState(20);
  const [pageInput, setPageInput] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Number(data.total_pages || data.totalPages || 1)), [data]);

  async function loadUsers(nextPage = page) {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getOpsUsers({
        page: nextPage,
        limit,
        search,
        authProvider,
        timezone,
        hasBookings,
        hasOrganizations,
        googleConnected,
        sort: "created_at_desc",
      });
      setData(result);
      const resolvedPage = result.page || nextPage;
      setPage(resolvedPage);
      setPageInput(String(resolvedPage));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Users could not load";
      if (message === "Unauthorized") {
        clearToken();
        router.replace("/login");
        return;
      }
      setError(message);
      setData({ items: [], page: nextPage, limit: 20, total: 0, total_pages: 1 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, authProvider, timezone, hasBookings, hasOrganizations, googleConnected, limit]);

  function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
    setPageInput(String(safePage));
    loadUsers(safePage);
  }

  function applyPageInput(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed)) return;
    goToPage(parsed);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setAuthProvider("all");
    setTimezone("");
    setHasBookings("all");
    setHasOrganizations("all");
    setGoogleConnected("all");
    setPage(1);
    setPageInput("1");
  }

  return (
    <main style={{ width: "100%", minHeight: "100vh", overflowX: "hidden", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", color: "#0f172a" }}>
      <div style={{ width: "100%", maxWidth: 1480, margin: "0 auto", padding: "24px clamp(16px, 3vw, 32px)" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: "0 0 8px", color: "#2563eb", fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Users Management</p>
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, letterSpacing: "-0.045em" }}>Users</h1>
            <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>Read-only list of platform users with booking, event, contact, and organization counts.</p>
          </div>
          <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "9px 12px", fontSize: 13, fontWeight: 900 }}>
            {formatNumber(data.total)} total users
          </div>
        </header>

        <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, padding: 18, borderBottom: "1px solid #e2e8f0", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
            <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name or email"
                style={{ flex: "1 1 280px", minWidth: 0, border: "1px solid #dbeafe", borderRadius: 999, padding: "11px 14px", outline: "none", fontSize: 14, color: "#0f172a", background: "#ffffff" }}
              />
              <button type="submit" style={{ border: "1px solid #bfdbfe", borderRadius: 999, background: "#2563eb", color: "#ffffff", padding: "11px 16px", fontWeight: 900, cursor: "pointer" }}>Search</button>
              <button type="button" onClick={resetFilters} style={{ border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#2563eb", padding: "11px 16px", fontWeight: 900, cursor: "pointer" }}>Reset</button>
            </form>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 }}>
              <select
                value={authProvider}
                onChange={(event) => { setAuthProvider(event.target.value); setPage(1); setPageInput("1"); }}
                style={{ border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#334155", padding: "11px 14px", fontWeight: 800, outline: "none", minWidth: 0 }}
              >
                {providerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>

              <input
                value={timezone}
                onChange={(event) => { setTimezone(event.target.value); setPage(1); setPageInput("1"); }}
                placeholder="Timezone, e.g. Asia/Kolkata"
                style={{ border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#334155", padding: "11px 14px", fontWeight: 800, outline: "none", minWidth: 0 }}
              />

              <select value={hasBookings} onChange={(event) => { setHasBookings(event.target.value); setPage(1); setPageInput("1"); }} style={{ border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#334155", padding: "11px 14px", fontWeight: 800, outline: "none", minWidth: 0 }}>
                <option value="all">Bookings: Any</option>
                {booleanFilterOptions.slice(1).map((option) => <option key={option.value} value={option.value}>Bookings: {option.label}</option>)}
              </select>

              <select value={hasOrganizations} onChange={(event) => { setHasOrganizations(event.target.value); setPage(1); setPageInput("1"); }} style={{ border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#334155", padding: "11px 14px", fontWeight: 800, outline: "none", minWidth: 0 }}>
                <option value="all">Organizations: Any</option>
                {booleanFilterOptions.slice(1).map((option) => <option key={option.value} value={option.value}>Organizations: {option.label}</option>)}
              </select>

              <select value={googleConnected} onChange={(event) => { setGoogleConnected(event.target.value); setPage(1); setPageInput("1"); }} style={{ border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#334155", padding: "11px 14px", fontWeight: 800, outline: "none", minWidth: 0 }}>
                <option value="all">Google: Any</option>
                {booleanFilterOptions.slice(1).map((option) => <option key={option.value} value={option.value}>Google: {option.label}</option>)}
              </select>

              <select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); setPageInput("1"); }} style={{ border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#334155", padding: "11px 14px", fontWeight: 800, outline: "none", minWidth: 0 }}>
                {limitOptions.map((option) => <option key={option} value={option}>{option} per page</option>)}
              </select>
            </div>
          </div>

          {error ? (
            <div style={{ margin: 18, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18, color: "#991b1b" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>Users could not load</h2>
              <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
            </div>
          ) : null}

          {loading ? <TableSkeleton /> : data.items.length === 0 ? (
            <div style={{ padding: 36, textAlign: "center" }}>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>No users found</h2>
              <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 440 }}>Try changing the search text or auth provider filter.</p>
            </div>
          ) : (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 1060, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                    {["User", "Email", "Auth Provider", "Timezone", "Bookings", "Event Types", "Organizations", "Status", "Actions"].map((header) => (
                      <th key={header} style={{ padding: "12px 16px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => {
                    const name = user.name || "Unnamed user";
                    const email = user.email || "Email not available";
                    const provider = normalizeProvider(user);
                    const status = getStatus(user);
                    const statusTone = status.toLowerCase() === "active" ? "green" : "slate";
                    return (
                      <tr key={String(user.id || email)} style={{ borderBottom: "1px solid #eef2f7" }}>
                        <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 260 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            {user.picture ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.picture} alt={name} onError={(event) => { event.currentTarget.style.display = "none"; }} style={{ width: 40, height: 40, borderRadius: 13, objectFit: "cover", border: "1px solid #dbeafe", background: "#eff6ff", flex: "0 0 auto" }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: 13, display: "grid", placeItems: "center", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", fontWeight: 900, flex: "0 0 auto" }}>{getInitials(user.name, user.email)}</div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div title={name} style={{ color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                              <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 12 }}>ID: {String(user.id)}</div>
                            </div>
                          </div>
                        </td>
                        <td title={email} style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</td>
                        <td style={{ padding: "14px 16px", verticalAlign: "top" }}><Badge>{formatLabel(provider)}</Badge></td>
                        <td title={user.timezone || "Timezone not set"} style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.timezone || "Not set"}</td>
                        <td style={{ padding: "14px 16px", color: "#0f172a", fontWeight: 900, verticalAlign: "top" }}>{formatNumber(getCount(user, "total_bookings", "totalBookings"))}</td>
                        <td style={{ padding: "14px 16px", color: "#0f172a", fontWeight: 900, verticalAlign: "top" }}>{formatNumber(getCount(user, "total_event_types", "totalEventTypes"))}</td>
                        <td style={{ padding: "14px 16px", color: "#0f172a", fontWeight: 900, verticalAlign: "top" }}>{formatNumber(getCount(user, "total_organizations", "totalOrganizations"))}</td>
                        <td style={{ padding: "14px 16px", verticalAlign: "top" }}><Badge tone={statusTone}>{formatLabel(status)}</Badge></td>
                        <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                          <button type="button" onClick={() => router.push(`/users/${user.id}`)} style={{ border: "1px solid #bfdbfe", borderRadius: 999, background: "#ffffff", color: "#2563eb", padding: "8px 11px", fontSize: 12, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
                            View detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: 18, borderTop: "1px solid #e2e8f0", background: "#ffffff" }}>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              Showing <strong style={{ color: "#0f172a" }}>{formatNumber(data.items.length)}</strong> of <strong style={{ color: "#0f172a" }}>{formatNumber(data.total)}</strong> users · Page <strong style={{ color: "#0f172a" }}>{page}</strong> of <strong style={{ color: "#0f172a" }}>{totalPages}</strong>
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)} style={{ border: "1px solid #dbeafe", borderRadius: 999, background: page <= 1 ? "#f8fafc" : "#ffffff", color: page <= 1 ? "#94a3b8" : "#2563eb", padding: "9px 13px", fontWeight: 900, cursor: page <= 1 ? "not-allowed" : "pointer" }}>Previous</button>
              <form onSubmit={applyPageInput} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input value={pageInput} onChange={(event) => setPageInput(event.target.value)} inputMode="numeric" style={{ width: 72, border: "1px solid #dbeafe", borderRadius: 999, background: "#ffffff", color: "#0f172a", padding: "9px 11px", fontWeight: 900, outline: "none" }} />
                <button type="submit" disabled={loading} style={{ border: "1px solid #bfdbfe", borderRadius: 999, background: "#eff6ff", color: "#2563eb", padding: "9px 13px", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer" }}>Go</button>
              </form>
              <button type="button" disabled={page >= totalPages || loading} onClick={() => goToPage(page + 1)} style={{ border: "1px solid #dbeafe", borderRadius: 999, background: page >= totalPages ? "#f8fafc" : "#ffffff", color: page >= totalPages ? "#94a3b8" : "#2563eb", padding: "9px 13px", fontWeight: 900, cursor: page >= totalPages ? "not-allowed" : "pointer" }}>Next</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
