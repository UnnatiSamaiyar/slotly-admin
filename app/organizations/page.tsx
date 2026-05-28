"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../lib/api";

type SortKey = "created_at_desc" | "created_at_asc" | "name_asc" | "name_desc";

type OrganizationRow = {
  id: number | string;
  name?: string | null;
  slug?: string | null;
  created_by?: {
    id?: number | string | null;
    name?: string | null;
    email?: string | null;
  } | string | null;
  created_at?: string | null;
  members_count?: number | null;
  teams_count?: number | null;
  event_types_count?: number | null;
  bookings_count?: number | null;
};

type OrganizationsResponse = {
  items?: OrganizationRow[];
  organizations?: OrganizationRow[];
  data?: OrganizationRow[];
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  totalPages?: number;
};

function formatNumber(value?: number | null): string {
  const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN").format(safeValue);
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

function getCreatedByLabel(createdBy: OrganizationRow["created_by"]): string {
  if (!createdBy) return "Not available";
  if (typeof createdBy === "string") return createdBy;
  return createdBy.name || createdBy.email || "Not available";
}

function getTotalPages(total: number, limit: number): number {
  if (!total || !limit) return 1;
  return Math.max(1, Math.ceil(total / limit));
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ padding: 36, textAlign: "center" }}>
      <div
        style={{
          width: 48,
          height: 48,
          margin: "0 auto 14px",
          borderRadius: 16,
          display: "grid",
          placeItems: "center",
          background: "#eff6ff",
          color: "#2563eb",
          border: "1px solid #bfdbfe",
          fontWeight: 900,
        }}
      >
        OR
      </div>
      <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18 }}>{title}</h2>
      <p style={{ margin: "8px auto 0", maxWidth: 480, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
        {message}
      </p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ display: "grid", gap: 10, padding: 18 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          style={{
            height: 46,
            borderRadius: 14,
            background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)",
          }}
        />
      ))}
    </div>
  );
}

function CountBadge({ label, value }: { label: string; value?: number | null }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        border: "1px solid #dbeafe",
        background: "#f8fbff",
        color: "#334155",
        borderRadius: 999,
        padding: "6px 9px",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "#2563eb" }}>{formatNumber(value)}</span>
      {label}
    </span>
  );
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<OrganizationRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("created_at_desc");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => getTotalPages(total, limit), [total, limit]);
  const hasFilters = appliedSearch.trim().length > 0;

  async function loadOrganizations(nextPage = page) {
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
    params.set("sort", sort);
    if (appliedSearch.trim()) params.set("search", appliedSearch.trim());

    try {
      const response = await fetch(`${API_BASE}/ops/organizations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        let message = "Organizations could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const data: OrganizationsResponse | OrganizationRow[] = await response.json();
      const items = Array.isArray(data)
        ? data
        : data.items || data.organizations || data.data || [];

      setRows(items);
      setTotal(Array.isArray(data) ? items.length : data.total ?? items.length);
      setPage(Array.isArray(data) ? nextPage : data.page ?? nextPage);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Organizations could not load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch, limit, sort]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  }

  function clearFilters() {
    setSearch("");
    setAppliedSearch("");
    setSort("created_at_desc");
    setPage(1);
  }

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
    loadOrganizations(safePage);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        overflowX: "hidden",
        background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)",
        color: "#0f172a",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", padding: "24px clamp(16px, 3vw, 32px)" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 8px",
                color: "#2563eb",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Enterprise Admin
            </p>
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, letterSpacing: "-0.045em" }}>
              Organizations
            </h1>
            <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>
              Read-only visibility across all organizations, members, teams, event types, and bookings.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#2563eb",
              borderRadius: 999,
              padding: "9px 12px",
              fontSize: 12,
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {formatNumber(total)} total
          </div>
        </header>

        <section
          style={{
            border: "1px solid #dbeafe",
            background: "#ffffff",
            borderRadius: 20,
            boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 18,
              borderBottom: "1px solid #e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            <form
              onSubmit={submitSearch}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(220px, 1fr) minmax(160px, 220px) auto auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by organization name or slug"
                style={{
                  minWidth: 0,
                  width: "100%",
                  border: "1px solid #dbeafe",
                  borderRadius: 999,
                  background: "#ffffff",
                  padding: "11px 14px",
                  color: "#0f172a",
                  outline: "none",
                  fontSize: 14,
                }}
              />

              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as SortKey);
                  setPage(1);
                }}
                style={{
                  width: "100%",
                  border: "1px solid #dbeafe",
                  borderRadius: 999,
                  background: "#ffffff",
                  padding: "11px 14px",
                  color: "#0f172a",
                  outline: "none",
                  fontSize: 14,
                }}
              >
                <option value="created_at_desc">Newest first</option>
                <option value="created_at_asc">Oldest first</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
              </select>

              <button
                type="submit"
                style={{
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: 999,
                  padding: "11px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Search
              </button>

              <button
                type="button"
                onClick={clearFilters}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#475569",
                  borderRadius: 999,
                  padding: "11px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Clear
              </button>
            </form>
          </div>

          {error ? (
            <div style={{ padding: 18 }}>
              <div style={{ border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 18, padding: 18, color: "#991b1b" }}>
                <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>Organizations could not load</h2>
                <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
                <button
                  type="button"
                  onClick={() => loadOrganizations(page)}
                  style={{
                    marginTop: 14,
                    border: "1px solid #fecaca",
                    background: "#ffffff",
                    color: "#991b1b",
                    borderRadius: 999,
                    padding: "9px 12px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : loading ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <EmptyState
              title={hasFilters ? "No matching organizations" : "No organizations found"}
              message={
                hasFilters
                  ? "No organizations match the current search or filters. Clear filters and try again."
                  : "Organizations will appear here once workspaces are created."
              }
            />
          ) : (
            <>
              <div style={{ width: "100%", overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                      {[
                        "Organization",
                        "Slug",
                        "Created By",
                        "Members",
                        "Teams",
                        "Event Types",
                        "Bookings",
                        "Created At",
                        "Actions",
                      ].map((header) => (
                        <th
                          key={header}
                          style={{
                            padding: "12px 16px",
                            fontSize: 12,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            borderBottom: "1px solid #e2e8f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((org) => {
                      const name = org.name || "Untitled organization";
                      const slug = org.slug || "not-available";
                      const createdBy = getCreatedByLabel(org.created_by);

                      return (
                        <tr key={String(org.id)} style={{ borderBottom: "1px solid #eef2f7" }}>
                          <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 260 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 14,
                                  display: "grid",
                                  placeItems: "center",
                                  background: "#eff6ff",
                                  color: "#2563eb",
                                  border: "1px solid #bfdbfe",
                                  fontWeight: 900,
                                  flex: "0 0 auto",
                                }}
                              >
                                {name.slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div title={name} style={{ color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {name}
                                </div>
                                <div style={{ marginTop: 5 }}>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      border: "1px solid #bfdbfe",
                                      background: "#eff6ff",
                                      color: "#2563eb",
                                      borderRadius: 999,
                                      padding: "4px 8px",
                                      fontSize: 11,
                                      fontWeight: 900,
                                    }}
                                  >
                                    Organization
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 260 }}>
                            <code
                              title={slug}
                              style={{
                                display: "inline-block",
                                maxWidth: 230,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                border: "1px solid #e2e8f0",
                                background: "#f8fafc",
                                color: "#334155",
                                borderRadius: 999,
                                padding: "6px 9px",
                                fontSize: 12,
                              }}
                            >
                              {slug}
                            </code>
                          </td>
                          <td style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={createdBy}>
                            {createdBy}
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}><CountBadge label="members" value={org.members_count} /></td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}><CountBadge label="teams" value={org.teams_count} /></td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}><CountBadge label="event types" value={org.event_types_count} /></td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}><CountBadge label="bookings" value={org.bookings_count} /></td>
                          <td style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDateTime(org.created_at)}</td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                            <Link
                              href={`/organizations/${org.id}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                border: "1px solid #bfdbfe",
                                background: "#ffffff",
                                color: "#2563eb",
                                borderRadius: 999,
                                padding: "8px 11px",
                                fontWeight: 900,
                                textDecoration: "none",
                              }}
                            >
                              View detail
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  padding: 16,
                  borderTop: "1px solid #e2e8f0",
                  background: "#ffffff",
                }}
              >
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Showing page <strong style={{ color: "#0f172a" }}>{page}</strong> of <strong style={{ color: "#0f172a" }}>{totalPages}</strong> · {formatNumber(total)} total
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <select
                    value={limit}
                    onChange={(event) => {
                      setLimit(Number(event.target.value));
                      setPage(1);
                    }}
                    style={{
                      border: "1px solid #dbeafe",
                      borderRadius: 999,
                      background: "#ffffff",
                      padding: "9px 12px",
                      color: "#0f172a",
                      outline: "none",
                    }}
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>

                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => goToPage(page - 1)}
                    style={{
                      border: "1px solid #e2e8f0",
                      background: page <= 1 ? "#f8fafc" : "#ffffff",
                      color: page <= 1 ? "#94a3b8" : "#334155",
                      borderRadius: 999,
                      padding: "9px 12px",
                      fontWeight: 900,
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => goToPage(page + 1)}
                    style={{
                      border: "1px solid #bfdbfe",
                      background: page >= totalPages ? "#f8fafc" : "#ffffff",
                      color: page >= totalPages ? "#94a3b8" : "#2563eb",
                      borderRadius: 999,
                      padding: "9px 12px",
                      fontWeight: 900,
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
