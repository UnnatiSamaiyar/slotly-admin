



"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../lib/api";
// import { BookingStatusBadge } from "../../lib/bookingStatus";

type BookingUser = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
} | null;

type BookingProfile = {
  id?: number | string | null;
  title?: string | null;
  slug?: string | null;
  duration_minutes?: number | null;
} | null;

type BookingOrgTeam = {
  id?: number | string | null;
  name?: string | null;
} | null;

type OpsBooking = {
  id: number | string;
  guest_name?: string | null;
  guest_email?: string | null;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  meeting_mode?: string | null;
  meet_link?: string | null;
  timezone?: string | null;
  guest_timezone?: string | null;
  host_user?: BookingUser;
  profile?: BookingProfile;
  organization?: BookingOrgTeam;
  team?: BookingOrgTeam;
  assigned_user?: BookingUser;
  created_at?: string | null;
  updated_at?: string | null;
};

type BookingsResponse = {
  items?: OpsBooking[];
  data?: OpsBooking[];
  bookings?: OpsBooking[];
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  totalPages?: number;
};

type BookingFilters = {
  search: string;
  status: string;
  meetingMode: string;
  dateFrom: string;
  dateTo: string;
  hostUserId: string;
  organizationId: string;
  teamId: string;
  assignedUserId: string;
  hasReschedule: string;
  hasSlotHold: string;
  sort: string;
};

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Canceled", value: "canceled" },
  { label: "Rescheduled", value: "rescheduled" },
];

const meetingModeOptions = [
  { label: "All modes", value: "all" },
  { label: "Google Meet", value: "google_meet" },
  { label: "In Person", value: "in_person" },
  { label: "Phone Call", value: "phone_call" },
  { label: "Zoom", value: "zoom" },
  { label: "Custom", value: "custom" },
];

const booleanFilterOptions = [
  { label: "Any", value: "all" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const sortOptions = [
  { label: "Newest created first", value: "newest_created" },
  { label: "Start time ascending", value: "start_time_asc" },
  { label: "Start time descending", value: "start_time_desc" },
  { label: "Recently updated", value: "recently_updated" },
];

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function formatLabel(value?: string | null): string {
  if (!value) return "Not available";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN").format(safeValue);
}

function getBookingRows(data: BookingsResponse | OpsBooking[]): OpsBooking[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.bookings)) return data.bookings;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function getPersonLabel(user: BookingUser): string {
  if (!user) return "Not assigned";
  return user.name || user.email || "Not assigned";
}

function LoadingRows() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} style={{ borderBottom: "1px solid #eef2f7" }}>
          {Array.from({ length: 8 }).map((__, cellIndex) => (
            <td key={cellIndex} style={{ padding: "14px 16px" }}>
              <div
                style={{
                  height: cellIndex === 0 ? 34 : 14,
                  width: cellIndex === 0 ? 180 : cellIndex === 8 ? 86 : 130,
                  maxWidth: "100%",
                  borderRadius: 12,
                  background:
                    "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export default function BookingsPage() {
  const [visibleCount, setVisibleCount] = useState(6);
  const router = useRouter();
  const [bookings, setBookings] = useState<OpsBooking[]>([]);
  const [filters, setFilters] = useState<BookingFilters>({
    search: "",
    status: "all",
    meetingMode: "all",
    dateFrom: "",
    dateTo: "",
    hostUserId: "",
    organizationId: "",
    teamId: "",
    assignedUserId: "",
    hasReschedule: "all",
    hasSlotHold: "all",
    sort: "newest_created",
  });
  const [appliedFilters, setAppliedFilters] = useState<BookingFilters>(filters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      appliedFilters.search.trim() ||
      appliedFilters.dateFrom ||
      appliedFilters.dateTo ||
      appliedFilters.hostUserId.trim() ||
      appliedFilters.organizationId.trim() ||
      appliedFilters.teamId.trim() ||
      appliedFilters.assignedUserId.trim() ||
      // (appliedFilters.status && appliedFilters.status !== "all") ||
      (appliedFilters.meetingMode && appliedFilters.meetingMode !== "all") ||
      (appliedFilters.hasReschedule &&
        appliedFilters.hasReschedule !== "all") ||
      (appliedFilters.hasSlotHold && appliedFilters.hasSlotHold !== "all") ||
      (appliedFilters.sort && appliedFilters.sort !== "newest_created"),
    );
  }, [appliedFilters]);

  async function loadBookings(
    nextPage = page,
    nextLimit = limit,
    nextFilters = appliedFilters,
  ) {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("limit", String(nextLimit));
      params.set("sort", nextFilters.sort || "newest_created");

      const search = nextFilters.search.trim();
      if (search) params.set("search", search);
      // if (nextFilters.status && nextFilters.status !== "all")
      //   params.set("status", nextFilters.status);
      if (nextFilters.meetingMode && nextFilters.meetingMode !== "all")
        params.set("meeting_mode", nextFilters.meetingMode);
      if (nextFilters.dateFrom) params.set("date_from", nextFilters.dateFrom);
      if (nextFilters.dateTo) params.set("date_to", nextFilters.dateTo);
      if (nextFilters.hostUserId.trim())
        params.set("host_user_id", nextFilters.hostUserId.trim());
      if (nextFilters.organizationId.trim())
        params.set("org_id", nextFilters.organizationId.trim());
      if (nextFilters.teamId.trim())
        params.set("team_id", nextFilters.teamId.trim());
      if (nextFilters.assignedUserId.trim())
        params.set("assigned_user_id", nextFilters.assignedUserId.trim());
      if (nextFilters.hasReschedule !== "all")
        params.set("has_reschedule", nextFilters.hasReschedule);
      if (nextFilters.hasSlotHold !== "all")
        params.set("has_slot_hold", nextFilters.hasSlotHold);

      const response = await fetch(
        `${API_BASE}/ops/bookings?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        let message = "Bookings could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message || "Bookings could not load");
      }

      const data = (await response.json()) as BookingsResponse | OpsBooking[];
      const rows = getBookingRows(data);
      const meta = Array.isArray(data) ? null : data;

      setBookings(rows);
      setPage(meta?.page || nextPage);
      setLimit(meta?.limit || nextLimit);
      setTotal(meta?.total || rows.length);
      setTotalPages(
        meta?.total_pages ||
        meta?.totalPages ||
        (meta?.total
          ? Math.ceil((meta.total || 0) / nextLimit)
          : rows.length
            ? 1
            : 0),
      );
    } catch (err) {
      setBookings([]);
      setTotal(0);
      setTotalPages(0);
      setError(err instanceof Error ? err.message : "Bookings could not load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings(1, limit, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    setAppliedFilters(filters);
    setPage(1);
    loadBookings(1, limit, filters);
  }

  function resetFilters() {
    const resetValue: BookingFilters = {
      search: "",
      status: "all",
      meetingMode: "all",
      dateFrom: "",
      dateTo: "",
      hostUserId: "",
      organizationId: "",
      teamId: "",
      assignedUserId: "",
      hasReschedule: "all",
      hasSlotHold: "all",
      sort: "newest_created",
    };
    setFilters(resetValue);
    setAppliedFilters(resetValue);
    setPage(1);
    loadBookings(1, limit, resetValue);
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) return;
    setPage(nextPage);
    loadBookings(nextPage, limit, appliedFilters);
  }

  function changeLimit(nextLimit: number) {
    setLimit(nextLimit);
    setPage(1);
    loadBookings(1, nextLimit, appliedFilters);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        overflowX: "hidden",
        fontWeight: 400,
        WebkitFontSmoothing: "antialiased",
        textRendering: "optimizeLegibility",
        background:
          "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
          padding: "16px clamp(10px, 1.6vw, 22px)",
        }}
      >
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
                fontSize: 12.5,
                fontWeight: 650,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Bookings Operations
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(24px, 1.6vw, 32px)",
                lineHeight: 1.1,
                letterSpacing: "-0.045em",
              }}
            >
              Bookings
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                color: "#64748b",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Read-only operational view of appointments, guests, hosts, and
              meeting context.
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid #bfdbfe",
              background: "#ffffff",
              borderRadius: 999,
              padding: "8px 12px",
              color: "#2563eb",
              fontWeight: 650,
              fontSize: 12.5,
              boxShadow: "0 12px 28px rgba(37, 99, 235, 0.08)",
            }}
          >
            <CalendarIcon />
            <span>{formatNumber(total)} total bookings</span>
          </div>
        </header>

        <section
          style={{
            border: "1px solid #dbeafe",
            background: "#ffffff",
            borderRadius: 18,
            boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px clamp(14px, 1.3vw, 22px)",
              borderBottom: "1px solid #e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: 15,
                  fontWeight: 650,
                  letterSpacing: "-0.01em",
                }}
              >
                Filters
              </h2>
              {hasActiveFilters ? (
                <span
                  style={{ color: "#2563eb", fontSize: 12.5, fontWeight: 600 }}
                >
                  Active filters applied
                </span>
              ) : null}
            </div>
            <div className="bookings-filter-grid">
              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Search
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    border: "1px solid #cfe3ff",
                    borderRadius: 13,
                    padding: "0 12px",
                    background: "#ffffff",
                    color: "#64748b",
                  }}
                >
                  <SearchIcon />
                  <input
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") applyFilters();
                    }}
                    placeholder="Guest, host, email or title"
                    style={{
                      width: "100%",
                      minWidth: 0,
                      height: 40,
                      border: 0,
                      outline: 0,
                      background: "transparent",
                      color: "#0f172a",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  />
                </div>
              </label>

              {/* <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span style={{ color: "#334155", fontSize: 11.5, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</span>
                <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={selectStyle}>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label> */}

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Meeting mode
                </span>
                <select
                  value={filters.meetingMode}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      meetingMode: event.target.value,
                    }))
                  }
                  style={selectStyle}
                >
                  {meetingModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date from
                </span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateFrom: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Date to
                </span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateTo: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Host user ID
                </span>
                <input
                  inputMode="numeric"
                  value={filters.hostUserId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      hostUserId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Any host"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Organization ID
                </span>
                <input
                  inputMode="numeric"
                  value={filters.organizationId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      organizationId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Any org"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Team ID
                </span>
                <input
                  inputMode="numeric"
                  value={filters.teamId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      teamId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Any team"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Assigned user ID
                </span>
                <input
                  inputMode="numeric"
                  value={filters.assignedUserId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      assignedUserId: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Any assignee"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Has reschedule
                </span>
                <select
                  value={filters.hasReschedule}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      hasReschedule: event.target.value,
                    }))
                  }
                  style={selectStyle}
                >
                  {booleanFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Has slot hold
                </span>
                <select
                  value={filters.hasSlotHold}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      hasSlotHold: event.target.value,
                    }))
                  }
                  style={selectStyle}
                >
                  {booleanFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11.5,
                    fontWeight: 650,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Sort
                </span>
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      sort: event.target.value,
                    }))
                  }
                  style={selectStyle}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="bookings-filter-actions">
                <button
                  type="button"
                  onClick={applyFilters}
                  style={primaryButtonStyle}
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  style={secondaryButtonStyle}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div
              style={{
                margin: 18,
                border: "1px solid #fecaca",
                background: "#fff7f7",
                color: "#991b1b",
                borderRadius: 18,
                padding: 18,
              }}
            >
              <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>
                Bookings could not load
              </h2>
              <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
              <button
                type="button"
                onClick={() => loadBookings(page, limit, appliedFilters)}
                style={{
                  ...secondaryButtonStyle,
                  marginTop: 14,
                  color: "#991b1b",
                  borderColor: "#fecaca",
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          <div
            className="bookings-table-wrap"
            style={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table
              className="bookings-table"
              style={{
                width: "100%",
                minWidth: 1120,
                borderCollapse: "collapse",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    color: "#475569",
                    textAlign: "left",
                  }}
                >
                  {[
                    "Guest",
                    "Host",
                    "Meeting Title",
                    "Date & Time",
                    "Meeting Mode",
                    "Org / Team",
                    "Created At",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        padding: "13px 16px",
                        fontSize: 11.5,
                        fontWeight: 650,
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

              {loading ? (
                <LoadingRows />
              ) : bookings.length === 0 ? (
                <tbody>
                  <tr>
                    <td
                      colSpan={8}
                      style={{ padding: 34, textAlign: "center" }}
                    >
                      {" "}
                      <h3 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>
                        {hasActiveFilters
                          ? "No matching bookings"
                          : "No bookings found"}
                      </h3>
                      <p
                        style={{
                          margin: "8px auto 0",
                          color: "#64748b",
                          fontSize: 14,
                          maxWidth: 440,
                        }}
                      >
                        {hasActiveFilters
                          ? "Try changing the search or filters to see more booking records."
                          : "Bookings will appear here once appointments are created."}
                      </p>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {bookings.slice(0, visibleCount).map((booking) => {
                    const guestName = booking.guest_name || "Guest";
                    const guestEmail =
                      booking.guest_email || "Email not available";
                    const hostLabel = getPersonLabel(booking.host_user);
                    const hostEmail = booking.host_user?.email || "";
                    const meetingTitle =
                      booking.title ||
                      booking.profile?.title ||
                      "Untitled booking";
                    const orgTeam =
                      [booking.organization?.name, booking.team?.name]
                        .filter(Boolean)
                        .join(" / ") || "Personal";

                    return (
                      <tr
                        key={String(booking.id)}
                        style={{ borderBottom: "1px solid #eef2f7" }}
                      >
                        <td style={cellStyle}>
                          <div title={guestName} style={strongTruncateStyle}>
                            {guestName}
                          </div>
                          <div title={guestEmail} style={mutedTruncateStyle}>
                            {guestEmail}
                          </div>
                        </td>

                        <td style={cellStyle}>
                          <div title={hostLabel} style={strongTruncateStyle}>
                            {hostLabel}
                          </div>
                          {hostEmail ? (
                            <div title={hostEmail} style={mutedTruncateStyle}>
                              {hostEmail}
                            </div>
                          ) : null}
                        </td>

                        <td style={cellStyle}>
                          <div title={meetingTitle} style={strongTruncateStyle}>
                            {meetingTitle}
                          </div>
                          {booking.profile?.slug ? (
                            <div
                              title={booking.profile.slug}
                              style={mutedTruncateStyle}
                            >
                              {booking.profile.slug}
                            </div>
                          ) : null}
                        </td>

                        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                          <div style={{ color: "#334155", fontWeight: 550 }}>
                            {formatDateTime(booking.start_time)}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              color: "#94a3b8",
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                          >
                            Ends {formatDateTime(booking.end_time)}
                          </div>
                        </td>

                        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                          {formatLabel(booking.meeting_mode)}
                        </td>

                        <td style={cellStyle}>
                          <div title={orgTeam} style={strongTruncateStyle}>
                            {orgTeam}
                          </div>
                        </td>

                        <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                          {formatDateTime(booking.created_at)}
                        </td>

                        <td
                          style={{
                            ...cellStyle,
                            whiteSpace: "nowrap",
                            textAlign: "right",
                          }}
                        >
                          <Link
                            href={`/bookings/${booking.id}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid #bfdbfe",
                              background: "#eff6ff",
                              color: "#2563eb",
                              textDecoration: "none",
                              borderRadius: 999,
                              padding: "8px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            View detail
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: "12px 14px",
              borderTop: "1px solid #e2e8f0",
              background: "#ffffff",
            }}
          >
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              Showing page <strong style={{ color: "#0f172a" }}>{page}</strong>{" "}
              of <strong style={{ color: "#0f172a" }}>{totalPages || 1}</strong>{" "}
              · {formatNumber(total)} records
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                Limit
                <select
                  value={limit}
                  onChange={(event) => changeLimit(Number(event.target.value))}
                  style={{ ...selectStyle, width: 88, height: 36 }}
                >
                  {[10, 20, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={loading || page <= 1}
                style={pageButtonStyle}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={loading || (totalPages > 0 && page >= totalPages)}
                style={pageButtonStyle}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .bookings-table-wrap {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .bookings-table-wrap::-webkit-scrollbar {
          height: 8px;
        }

        .bookings-table-wrap::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        .bookings-filter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          align-items: end;
        }

        .bookings-filter-grid label {
          min-width: 0;
        }

        .bookings-filter-grid label:first-child {
          grid-column: span 2;
        }

        .bookings-filter-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 154px));
          gap: 10px;
          align-items: end;
          justify-content: start;
        }

        .bookings-filter-actions button {
          width: 100%;
          height: 40px;
        }

        @media (min-width: 1440px) {
          .bookings-filter-grid {
            grid-template-columns: minmax(220px, 1.35fr) repeat(4, minmax(145px, 1fr));
          }

          .bookings-filter-grid label:first-child {
            grid-column: auto;
          }

          .bookings-filter-actions {
            grid-column: span 2;
          }
        }

        @media (min-width: 1800px) {
          .bookings-filter-grid {
            grid-template-columns: minmax(240px, 1.35fr) repeat(5, minmax(165px, 1fr));
            gap: 18px;
          }

          .bookings-filter-actions {
            grid-column: span 2;
          }
        }

        @media (min-width: 2400px) {
          .bookings-filter-grid {
            grid-template-columns: minmax(280px, 1.4fr) repeat(5, minmax(190px, 1fr));
          }
        }

        @media (max-width: 1180px) {
          .bookings-filter-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .bookings-filter-actions {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .bookings-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .bookings-filter-grid label:first-child,
          .bookings-filter-actions {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 560px) {
          .bookings-filter-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .bookings-filter-grid label:first-child,
          .bookings-filter-actions {
            grid-column: auto;
          }

          .bookings-filter-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #cfe3ff",
  borderRadius: 13,
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 12.5,
  fontWeight: 500,
  padding: "0 12px",
  outline: 0,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid #cfe3ff",
  borderRadius: 13,
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 500,
  padding: "0 12px",
  outline: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  border: "1px solid #2563eb",
  borderRadius: 999,
  background: "#2563eb",
  color: "#ffffff",
  padding: "0 24px",
  height: 40,
  fontSize: 13,
  fontWeight: 650,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(37, 99, 235, 0.16)",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  background: "#ffffff",
  color: "#2563eb",
  padding: "0 24px",
  height: 40,
  fontSize: 13,
  fontWeight: 650,
  cursor: "pointer",
};

const pageButtonStyle: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  background: "#ffffff",
  color: "#2563eb",
  padding: "8px 13px",
  fontSize: 13,
  fontWeight: 650,
  cursor: "pointer",
};

const cellStyle: React.CSSProperties = {
  padding: "11px 13px",
  verticalAlign: "top",
  maxWidth: 210,
};

const strongTruncateStyle: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const mutedTruncateStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
