"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../lib/api";

type SortKey = "created_at_desc" | "created_at_asc" | "name_asc" | "name_desc";

type PersonSummary = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
};

type OrganizationSummary = {
  id?: number | string | null;
  name?: string | null;
  slug?: string | null;
};

type TeamRow = {
  id: number | string;
  name?: string | null;
  slug?: string | null;
  organization?: OrganizationSummary | string | null;
  description?: string | null;
  created_by?: PersonSummary | string | null;
  created_at?: string | null;
  members_count?: number | null;
  event_types_count?: number | null;
  bookings_count?: number | null;
};

type TeamsResponse = {
  items?: TeamRow[];
  teams?: TeamRow[];
  data?: TeamRow[];
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  totalPages?: number;
};

type OrganizationOption = {
  id: number | string;
  name?: string | null;
  slug?: string | null;
};

type OrganizationsResponse = {
  items?: OrganizationOption[];
  organizations?: OrganizationOption[];
  data?: OrganizationOption[];
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

function getPersonLabel(person: PersonSummary | string | null | undefined): string {
  if (!person) return "Not available";
  if (typeof person === "string") return person;
  return person.name || person.email || "Not available";
}

function getOrganizationLabel(organization: OrganizationSummary | string | null | undefined): string {
  if (!organization) return "Not assigned";
  if (typeof organization === "string") return organization;
  const name = organization.name || "Unnamed organization";
  return organization.slug ? `${name} / ${organization.slug}` : name;
}

function getTotalPages(total: number, limit: number): number {
  if (!total || !limit) return 1;
  return Math.max(1, Math.ceil(total / limit));
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
        TM
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

export default function TeamsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [orgId, setOrgId] = useState("");
  const [sort, setSort] = useState<SortKey>("created_at_desc");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => getTotalPages(total, limit), [total, limit]);
  const hasFilters = appliedSearch.trim().length > 0 || orgId.trim().length > 0;

  async function handleUnauthorized() {
    clearToken();
    router.replace("/login");
  }

  async function loadOrganizations() {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/ops/organizations?page=1&limit=100&sort=name_asc`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) return;

      const data: OrganizationsResponse | OrganizationOption[] = await response.json();
      const items = Array.isArray(data) ? data : data.items || data.organizations || data.data || [];
      setOrganizations(items);
    } catch {
      setOrganizations([]);
    }
  }

  async function loadTeams(nextPage = page) {
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
    if (orgId.trim()) params.set("org_id", orgId.trim());

    try {
      const response = await fetch(`${API_BASE}/ops/teams?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (!response.ok) {
        let message = "Teams could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const data: TeamsResponse | TeamRow[] = await response.json();
      const items = Array.isArray(data) ? data : data.items || data.teams || data.data || [];

      setRows(items);
      setTotal(Array.isArray(data) ? items.length : data.total ?? items.length);
      setPage(Array.isArray(data) ? nextPage : data.page ?? nextPage);
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Teams could not load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTeams(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedSearch, orgId, limit, sort]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  }

  function clearFilters() {
    setSearch("");
    setAppliedSearch("");
    setOrgId("");
    setSort("created_at_desc");
    setPage(1);
  }

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(safePage);
    loadTeams(safePage);
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
              Teams
            </p>
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, letterSpacing: "-0.045em" }}>
              Team management
            </h1>
            <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
              View global teams, organization mapping, team capacity signals, and scheduling usage in one place.
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#2563eb",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            {formatNumber(total)} teams
          </div>
        </header>

        <section
          style={{
            border: "1px solid #dbeafe",
            background: "#ffffff",
            borderRadius: 22,
            boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 1.3fr) minmax(180px, 0.9fr) minmax(170px, 0.8fr) minmax(130px, 0.6fr)",
              gap: 12,
              padding: 18,
              borderBottom: "1px solid #e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            <form onSubmit={submitSearch} style={{ display: "flex", gap: 10, minWidth: 0 }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by team name or slug"
                style={{
                  width: "100%",
                  minWidth: 0,
                  border: "1px solid #cbd5e1",
                  borderRadius: 14,
                  padding: "11px 13px",
                  outline: "none",
                  color: "#0f172a",
                  background: "#ffffff",
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                style={{
                  border: "1px solid #2563eb",
                  borderRadius: 14,
                  background: "#2563eb",
                  color: "#ffffff",
                  padding: "11px 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Search
              </button>
            </form>

            <select
              value={orgId}
              onChange={(event) => {
                setPage(1);
                setOrgId(event.target.value);
              }}
              style={{
                minWidth: 0,
                border: "1px solid #cbd5e1",
                borderRadius: 14,
                padding: "11px 13px",
                outline: "none",
                color: "#0f172a",
                background: "#ffffff",
                fontSize: 14,
              }}
            >
              <option value="">All organizations</option>
              {organizations.map((organization) => (
                <option key={String(organization.id)} value={String(organization.id)}>
                  {organization.name || organization.slug || `Organization #${organization.id}`}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => {
                setPage(1);
                setSort(event.target.value as SortKey);
              }}
              style={{
                minWidth: 0,
                border: "1px solid #cbd5e1",
                borderRadius: 14,
                padding: "11px 13px",
                outline: "none",
                color: "#0f172a",
                background: "#ffffff",
                fontSize: 14,
              }}
            >
              <option value="created_at_desc">Newest first</option>
              <option value="created_at_asc">Oldest first</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters && sort === "created_at_desc"}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 14,
                background: "#ffffff",
                color: "#475569",
                padding: "11px 13px",
                fontWeight: 900,
                cursor: !hasFilters && sort === "created_at_desc" ? "not-allowed" : "pointer",
                opacity: !hasFilters && sort === "created_at_desc" ? 0.65 : 1,
              }}
            >
              Clear
            </button>
          </div>

          {error ? (
            <div style={{ padding: 18 }}>
              <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 18, padding: 16 }}>
                <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>Teams could not load</h2>
                <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
                <button
                  type="button"
                  onClick={() => loadTeams(page)}
                  style={{
                    marginTop: 12,
                    border: "1px solid #fecaca",
                    borderRadius: 12,
                    background: "#ffffff",
                    color: "#991b1b",
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
              title={hasFilters ? "No teams match your filters" : "No teams found"}
              message={
                hasFilters
                  ? "Try clearing search or organization filters to see more teams."
                  : "Teams will appear here after organizations start creating team workspaces."
              }
            />
          ) : (
            <>
              <div style={{ width: "100%", overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                      {["Team", "Organization", "Slug", "Members", "Event Types", "Bookings", "Created At", "Actions"].map((header) => (
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
                    {rows.map((team) => {
                      const name = team.name || "Unnamed team";
                      const slug = team.slug || "not-available";
                      const organization = getOrganizationLabel(team.organization);
                      const createdBy = getPersonLabel(team.created_by);

                      return (
                        <tr key={String(team.id)} style={{ borderBottom: "1px solid #eef2f7" }}>
                          <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 260 }}>
                            <div title={name} style={{ color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {name}
                            </div>
                            <div title={team.description || undefined} style={{ marginTop: 5, color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {team.description || `Created by ${createdBy}`}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 230 }}>
                            <span title={organization} style={{ display: "block", color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {organization}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top", maxWidth: 210 }}>
                            <span
                              title={slug}
                              style={{
                                display: "inline-flex",
                                maxWidth: "100%",
                                border: "1px solid #e2e8f0",
                                background: "#f8fafc",
                                color: "#475569",
                                borderRadius: 999,
                                padding: "6px 9px",
                                fontSize: 12,
                                fontWeight: 800,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {slug}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                            <CountBadge label="members" value={team.members_count} />
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                            <CountBadge label="event types" value={team.event_types_count} />
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                            <CountBadge label="bookings" value={team.bookings_count} />
                          </td>
                          <td style={{ padding: "14px 16px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>
                            {formatDateTime(team.created_at)}
                          </td>
                          <td style={{ padding: "14px 16px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                            <Link
                              href={`/teams/${team.id}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                border: "1px solid #bfdbfe",
                                background: "#eff6ff",
                                color: "#2563eb",
                                borderRadius: 999,
                                padding: "7px 10px",
                                fontSize: 12,
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
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                  Showing page <strong style={{ color: "#0f172a" }}>{page}</strong> of <strong style={{ color: "#0f172a" }}>{totalPages}</strong> · {formatNumber(total)} total
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <select
                    value={limit}
                    onChange={(event) => {
                      setPage(1);
                      setLimit(Number(event.target.value));
                    }}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 12,
                      padding: "9px 10px",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontWeight: 800,
                    }}
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: 12,
                      background: "#ffffff",
                      color: "#334155",
                      padding: "9px 12px",
                      fontWeight: 900,
                      cursor: page <= 1 || loading ? "not-allowed" : "pointer",
                      opacity: page <= 1 || loading ? 0.55 : 1,
                    }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages || loading}
                    style={{
                      border: "1px solid #2563eb",
                      borderRadius: 12,
                      background: "#2563eb",
                      color: "#ffffff",
                      padding: "9px 12px",
                      fontWeight: 900,
                      cursor: page >= totalPages || loading ? "not-allowed" : "pointer",
                      opacity: page >= totalPages || loading ? 0.55 : 1,
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
