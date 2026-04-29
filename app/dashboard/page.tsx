"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, apiFetch, clearToken, getToken } from "../../lib/api";

type FailureItem = {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  user_id?: number | null;
  created_at?: string | null;
  metadata_json?: string | null;
};

type UserRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  timezone?: string | null;
  auth_provider?: string | null;
  brand_logo_url?: string | null;
  has_google_connected?: boolean;
  event_types_count?: number;
  booking_profiles_count?: number;
  bookings_count?: number;
  has_password?: boolean;
};

type UsersOverview = {
  summary: {
    returned: number;
    google_users: number;
    email_users: number;
    connected_google: number;
    with_logo: number;
    timezone_set: number;
  };
  items: UserRow[];
};

type SegmentItem = { label: string; value: number };

type DashboardPayload = {
  generated_at: string;
  kpis: {
    users_total: number;
    bookings_total: number;
    bookings_24h: number;
    bookings_7d: number;
    active_users_30d: number;
    google_connected_users: number;
    contacts_total: number;
    notifications_total: number;
    unread_notifications: number;
    profiles_total: number;
    event_types_total: number;
    reschedule_requests_total: number;
    reschedule_open: number;
    reschedule_completed: number;
    slot_holds_active: number;
    booking_audit_events: number;
    bookings_failed_24h: number;
    google_sync_failures_24h: number;
    email_failures_24h: number;
    setup_completion_pct: number;
  };
  segments: {
    providers: SegmentItem[];
    booking_status: SegmentItem[];
    top_timezones: SegmentItem[];
    notification_types: SegmentItem[];
  };
  charts: {
    user_growth_30d: SegmentItem[];
    booking_growth_14d: SegmentItem[];
  };
  insights: { label: string; value: string | number }[];
  alerts: { severity: "high" | "medium" | "low"; title: string; body: string }[];
  top_users: {
    id: number;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    timezone?: string | null;
    auth_provider?: string | null;
    bookings_count: number;
    recent_bookings_7d: number;
    booking_profiles_count: number;
    event_types_count: number;
    has_google_connected: boolean;
    has_logo: boolean;
  }[];
};



const EMPTY_DASHBOARD: DashboardPayload = {
  generated_at: "",
  kpis: {
    users_total: 0,
    bookings_total: 0,
    bookings_24h: 0,
    bookings_7d: 0,
    active_users_30d: 0,
    google_connected_users: 0,
    contacts_total: 0,
    notifications_total: 0,
    unread_notifications: 0,
    profiles_total: 0,
    event_types_total: 0,
    reschedule_requests_total: 0,
    reschedule_open: 0,
    reschedule_completed: 0,
    slot_holds_active: 0,
    booking_audit_events: 0,
    bookings_failed_24h: 0,
    google_sync_failures_24h: 0,
    email_failures_24h: 0,
    setup_completion_pct: 0,
  },
  segments: {
    providers: [],
    booking_status: [],
    top_timezones: [],
    notification_types: [],
  },
  charts: {
    user_growth_30d: [],
    booking_growth_14d: [],
  },
  insights: [],
  alerts: [],
  top_users: [],
};

const EMPTY_USERS_OVERVIEW: UsersOverview = {
  summary: {
    returned: 0,
    google_users: 0,
    email_users: 0,
    connected_google: 0,
    with_logo: 0,
    timezone_set: 0,
  },
  items: [],
};

function normalizeDashboardPayload(raw: any): DashboardPayload {
  return {
    ...EMPTY_DASHBOARD,
    ...(raw || {}),
    kpis: { ...EMPTY_DASHBOARD.kpis, ...(raw?.kpis || {}) },
    segments: { ...EMPTY_DASHBOARD.segments, ...(raw?.segments || {}) },
    charts: { ...EMPTY_DASHBOARD.charts, ...(raw?.charts || {}) },
    insights: Array.isArray(raw?.insights) ? raw.insights : [],
    alerts: Array.isArray(raw?.alerts) ? raw.alerts : [],
    top_users: Array.isArray(raw?.top_users) ? raw.top_users : [],
  };
}

function normalizeUsersOverview(raw: any): UsersOverview {
  return {
    ...EMPTY_USERS_OVERVIEW,
    ...(raw || {}),
    summary: { ...EMPTY_USERS_OVERVIEW.summary, ...(raw?.summary || {}) },
    items: Array.isArray(raw?.items) ? raw.items : [],
  };
}
const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #f8fbff 0%, #eef5ff 48%, #ffffff 100%)", color: "#172033", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  muted: "#64748b",
  text: "#172033",
};

function MetricCard({ title, value, sub }: { title: string; value: any; sub?: string }) {
  return (
    <div style={{ padding: 18, borderRadius: 18, background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)", border: "1px solid rgba(37,99,235,0.12)", boxShadow: "0 12px 30px rgba(15,23,42,0.06)" }}>
      <div style={{ fontSize: 12, color: styles.muted, letterSpacing: 0.2, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, marginTop: 8, color: styles.text, lineHeight: 1.1 }}>{value ?? "—"}</div>
      {sub ? <div style={{ fontSize: 12, color: styles.muted, marginTop: 8, lineHeight: 1.45 }}>{sub}</div> : null}
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ padding: 15, borderRadius: 16, background: "#ffffff", border: "1px solid rgba(37,99,235,0.10)" }}>
      <div style={{ fontSize: 12, color: styles.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, marginTop: 6, color: styles.text }}>{value ?? "—"}</div>
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "9px 14px", borderRadius: 12, border: active ? "1px solid rgba(37,99,235,0.35)" : "1px solid rgba(148,163,184,0.25)", background: active ? "#2563eb" : "#ffffff", color: active ? "#ffffff" : "#334155", cursor: "pointer", fontWeight: 600, boxShadow: active ? "0 10px 22px rgba(37,99,235,0.18)" : "none" }}>
      {label}
    </button>
  );
}

function AlertCard({ severity, title, body }: { severity: "high" | "medium" | "low"; title: string; body: string }) {
  const tone = severity === "high" ? "239,68,68" : severity === "medium" ? "245,158,11" : "16,185,129";
  return (
    <div style={{ padding: 16, borderRadius: 16, background: `rgba(${tone},0.08)`, border: `1px solid rgba(${tone},0.22)` }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: `rgb(${tone})`, letterSpacing: 0.5 }}>{severity}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: styles.text }}>{title}</div>
      <div style={{ fontSize: 13, color: styles.muted, marginTop: 6, lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

function ProgressBars({ items }: { items?: SegmentItem[] }) {
  const max = Math.max(...(items?.map((item) => item.value) || [1]), 1);
  return (
    <div style={{ display: "grid", gap: 11 }}>
      {(items || []).map((item) => (
        <div key={item.label}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, marginBottom: 7 }}>
            <span style={{ color: styles.muted, fontWeight: 600 }}>{item.label}</span>
            <span style={{ fontWeight: 700, color: styles.text }}>{item.value}</span>
          </div>
          <div style={{ height: 9, borderRadius: 999, background: "#e8effc", overflow: "hidden" }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #60a5fa, #2563eb)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SparkBars({ items }: { items?: SegmentItem[] }) {
  const max = Math.max(...(items?.map((item) => item.value) || [1]), 1);
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 7, height: 178, paddingTop: 8 }}>
      {(items || []).map((item) => (
        <div key={item.label} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div title={`${item.label}: ${item.value}`} style={{ width: "100%", height: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 2)}%`, minHeight: item.value > 0 ? 8 : 2, borderRadius: 10, background: "linear-gradient(180deg, #60a5fa, #2563eb)", boxShadow: "0 8px 18px rgba(37,99,235,0.16)" }} />
          <div style={{ fontSize: 10, color: "#7890ad", writingMode: "vertical-rl", transform: "rotate(180deg)", height: 56, overflow: "hidden" }}>{item.label.slice(5)}</div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name, email, picture }: { name?: string | null; email?: string | null; picture?: string | null }) {
  if (picture) return <img src={picture} alt={name || email || "User"} style={{ width: 38, height: 38, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(37,99,235,0.12)" }} />;
  const seed = (name || email || "U").trim().charAt(0).toUpperCase() || "U";
  return <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg, #dbeafe, #eff6ff)", border: "1px solid rgba(37,99,235,0.16)", color: "#1d4ed8", fontWeight: 700 }}>{seed}</div>;
}

function Pill({ label, active, good }: { label: string; active: boolean; good?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: active ? (good ? "#047857" : "#1d4ed8") : "#64748b", background: active ? (good ? "rgba(16,185,129,0.10)" : "rgba(37,99,235,0.10)") : "rgba(148,163,184,0.12)", border: active ? (good ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(37,99,235,0.22)") : "1px solid rgba(148,163,184,0.20)" }}>
      {label}
    </span>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload>(EMPTY_DASHBOARD);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | "google" | "email">("all");
  const [failures, setFailures] = useState<FailureItem[]>([]);
  const [loadingFailures, setLoadingFailures] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [usersOverview, setUsersOverview] = useState<UsersOverview>(EMPTY_USERS_OVERVIEW);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const hasToken = useMemo(() => !!getToken(), []);

  async function loadDashboard() {
    const res = await apiFetch("/ops/ceo-dashboard");
    const data = await res.json();
    setDashboard(normalizeDashboardPayload(data));
  }

  async function loadFailures(nextKind: "all" | "google" | "email") {
    setLoadingFailures(true);
    try {
      const res = await apiFetch(`/ops/failures/recent?kind=${nextKind}&limit=20`);
      const data = await res.json();
      setFailures(data.items || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load recent failures");
    } finally {
      setLoadingFailures(false);
    }
  }

  async function loadUsers(search = "") {
    setLoadingUsers(true);
    try {
      const qs = new URLSearchParams({ limit: "24" });
      if (search.trim()) qs.set("q", search.trim());
      const res = await apiFetch(`/ops/users/overview?${qs.toString()}`);
      const data = await res.json();
      setUsersOverview(normalizeUsersOverview(data));
    } catch (e: any) {
      setError(e?.message || "Failed to load users overview");
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (!hasToken) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const meRes = await apiFetch("/ops/me");
        setMe(await meRes.json());
        await Promise.all([loadDashboard(), loadFailures("all"), loadUsers("")]);
      } catch (e: any) {
        setError(e?.message || "Failed to load");
        clearToken();
        router.replace("/login");
      }
    })();
  }, [router, hasToken]);

  useEffect(() => {
    if (!hasToken) return;

    const token = getToken();
    if (!token) return;

    const es = new EventSource(`${API_BASE}/ops/live?token=${encodeURIComponent(token)}`);
    es.addEventListener("kpis", () => {
      loadDashboard().catch(() => null);
    });
    es.onerror = () => {
      // ignore noisy reconnect errors
    };

    return () => es.close();
  }, [hasToken]);

  useEffect(() => {
    if (!hasToken) return;
    loadFailures(kind);
  }, [kind]);

  useEffect(() => {
    if (!hasToken) return;
    const t = setTimeout(() => {
      loadUsers(userSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  async function logout() {
    try {
      await apiFetch("/ops/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearToken();
    router.replace("/login");
  }

  return (
    <div style={styles.page}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at 12% 0%, rgba(37,99,235,0.12), transparent 30%), radial-gradient(circle at 82% 8%, rgba(96,165,250,0.14), transparent 26%)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid rgba(37,99,235,0.10)",
          background: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#2563eb", fontWeight: 700, letterSpacing: 1.4 }}>SLOTLY OPERATIONS</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>Operations Dashboard</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {me ? `${me.email} • ${me.role}` : "Loading staff context..."}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(37,99,235,0.12)",
                background: "#f8fbff",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Last refresh: {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString() : "—"}
            </div>
            <button
              onClick={logout}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(37,99,235,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1360, margin: "0 auto", padding: 20 }}>
        {error ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          style={{
            padding: 24,
            borderRadius: 24,
            background: "linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)",
            border: "1px solid rgba(37,99,235,0.10)",
            boxShadow: "0 20px 55px rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.15 }}>Business overview</div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 8, maxWidth: 760 }}>
                Operational reporting across users, bookings, event types, contacts, notifications, reschedules, and system health.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <MetricCard title="Total Users" value={dashboard?.kpis.users_total} sub={`${dashboard?.kpis.active_users_30d ?? 0} active in last 30d`} />
            <MetricCard title="Total Bookings" value={dashboard?.kpis.bookings_total} sub={`${dashboard?.kpis.bookings_7d ?? 0} in last 7d`} />
            <MetricCard title="Bookings Today (24h)" value={dashboard?.kpis.bookings_24h} sub={`${dashboard?.kpis.bookings_failed_24h ?? 0} failed/cancelled`} />
            <MetricCard title="Google Connected Users" value={dashboard?.kpis.google_connected_users} sub={`${dashboard?.kpis.google_sync_failures_24h ?? 0} failures in 24h`} />
            <MetricCard title="Setup Completion" value={`${dashboard?.kpis.setup_completion_pct ?? 0}%`} sub={`${dashboard?.kpis.profiles_total ?? 0} profiles • ${dashboard?.kpis.event_types_total ?? 0} event types`} />
          </div>
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
          <div
            style={{
              padding: 22,
              borderRadius: 24,
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(37,99,235,0.10)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>Booking trend · last 14 days</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Demand movement and booking activity pattern</div>
            <div style={{ marginTop: 18 }}>
              <SparkBars items={dashboard?.charts.booking_growth_14d} />
            </div>
          </div>

          <div
            style={{
              padding: 22,
              borderRadius: 24,
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(37,99,235,0.10)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>Priority alerts</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Derived from operational signals</div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {(dashboard?.alerts || []).map((alert, idx) => (
                <AlertCard key={`${alert.title}-${idx}`} severity={alert.severity} title={alert.title} body={alert.body} />
              ))}
            </div>
          </div>
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <SmallMetric label="Contacts" value={dashboard?.kpis.contacts_total} />
          <SmallMetric label="Notifications" value={dashboard?.kpis.notifications_total} />
          <SmallMetric label="Unread Notifications" value={dashboard?.kpis.unread_notifications} />
          <SmallMetric label="Active Slot Holds" value={dashboard?.kpis.slot_holds_active} />
          <SmallMetric label="Reschedule Requests" value={dashboard?.kpis.reschedule_requests_total} />
          <SmallMetric label="Open Reschedules" value={dashboard?.kpis.reschedule_open} />
          <SmallMetric label="Completed Reschedules" value={dashboard?.kpis.reschedule_completed} />
          <SmallMetric label="Booking Audit Events" value={dashboard?.kpis.booking_audit_events} />
        </section>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          <div style={{ padding: 22, borderRadius: 24, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(37,99,235,0.10)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Provider split</div>
            <div style={{ marginTop: 16 }}>
              <ProgressBars items={dashboard?.segments.providers} />
            </div>
          </div>

          <div style={{ padding: 22, borderRadius: 24, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(37,99,235,0.10)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Booking status mix</div>
            <div style={{ marginTop: 16 }}>
              <ProgressBars items={dashboard?.segments.booking_status} />
            </div>
          </div>

          <div style={{ padding: 22, borderRadius: 24, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(37,99,235,0.10)" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Top timezones</div>
            <div style={{ marginTop: 16 }}>
              <ProgressBars items={dashboard?.segments.top_timezones} />
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            padding: 22,
            borderRadius: 24,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(37,99,235,0.10)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Executive insights</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 16 }}>
                {(dashboard?.insights || []).map((insight) => (
                  <div key={insight.label} style={{ padding: 16, borderRadius: 16, background: "#f8fbff", border: "1px solid rgba(37,99,235,0.10)" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{insight.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{insight.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Top users by booking activity</div>
              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {(dashboard?.top_users || []).map((user) => (
                  <div key={user.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 14, borderRadius: 16, background: "#f8fbff", border: "1px solid rgba(37,99,235,0.10)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar name={user.name} email={user.email} picture={user.picture} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{user.name || "Unnamed user"}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{user.email || "—"}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{user.bookings_count}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{user.recent_bookings_7d} in last 7d</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            padding: 22,
            borderRadius: 24,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(37,99,235,0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>User directory</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Search users with onboarding, provider, and booking rollups.
              </div>
            </div>

            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email"
              style={{
                width: 320,
                maxWidth: "100%",
                padding: "11px 14px",
                borderRadius: 14,
                border: "1px solid rgba(37,99,235,0.12)",
                background: "#ffffff",
                color: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 16 }}>
            <SmallMetric label="Visible rows" value={usersOverview?.summary.returned} />
            <SmallMetric label="Google users" value={usersOverview?.summary.google_users} />
            <SmallMetric label="Email users" value={usersOverview?.summary.email_users} />
            <SmallMetric label="Google connected" value={usersOverview?.summary.connected_google} />
            <SmallMetric label="Timezone set" value={usersOverview?.summary.timezone_set} />
            <SmallMetric label="Logo uploaded" value={usersOverview?.summary.with_logo} />
          </div>

          <div style={{ marginTop: 16, overflowX: "auto", borderRadius: 18, border: "1px solid rgba(37,99,235,0.10)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1160 }}>
              <thead>
                <tr style={{ background: "#f8fbff", textAlign: "left" }}>
                  {[
                    "User",
                    "Provider",
                    "Timezone",
                    "Profiles",
                    "Event Types",
                    "Bookings",
                    "Google",
                    "Brand",
                    "Security",
                  ].map((head) => (
                    <th key={head} style={{ padding: "14px 14px", fontSize: 12, color: "#64748b" }}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 18, color: "#64748b" }}>Loading users...</td>
                  </tr>
                ) : !usersOverview?.items?.length ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 18, color: "#64748b" }}>No users found.</td>
                  </tr>
                ) : (
                  usersOverview.items.map((user) => (
                    <tr key={user.id} style={{ borderTop: "1px solid rgba(37,99,235,0.08)", verticalAlign: "top" }}>
                      <td style={{ padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar name={user.name} email={user.email} picture={user.picture} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name || "Unnamed user"}</div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{user.email || "—"}</div>
                            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)", marginTop: 6 }}>User ID #{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 14 }}><Pill label={(user.auth_provider || "unknown").toUpperCase()} active={true} /></td>
                      <td style={{ padding: 14, fontSize: 13 }}>{user.timezone || "—"}</td>
                      <td style={{ padding: 14, fontSize: 13, fontWeight: 700 }}>{user.booking_profiles_count ?? 0}</td>
                      <td style={{ padding: 14, fontSize: 13, fontWeight: 700 }}>{user.event_types_count ?? 0}</td>
                      <td style={{ padding: 14, fontSize: 13, fontWeight: 700 }}>{user.bookings_count ?? 0}</td>
                      <td style={{ padding: 14 }}><Pill label={user.has_google_connected ? "Connected" : "Not connected"} active={!!user.has_google_connected} good={true} /></td>
                      <td style={{ padding: 14 }}><Pill label={user.brand_logo_url ? "Logo" : "No logo"} active={!!user.brand_logo_url} /></td>
                      <td style={{ padding: 14 }}><Pill label={user.has_password ? "Password set" : "No password"} active={!!user.has_password} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            padding: 22,
            borderRadius: 24,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(37,99,235,0.10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Recent failure events</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Filtered operational issues from system notifications.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <FilterButton active={kind === "all"} label="All" onClick={() => setKind("all")} />
              <FilterButton active={kind === "google"} label="Google" onClick={() => setKind("google")} />
              <FilterButton active={kind === "email"} label="Email" onClick={() => setKind("email")} />
            </div>
          </div>

          <div style={{ marginTop: 16, overflowX: "auto", borderRadius: 18, border: "1px solid rgba(37,99,235,0.10)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ background: "#f8fbff", textAlign: "left" }}>
                  <th style={{ padding: "14px 12px", fontSize: 12, color: "#64748b" }}>Time</th>
                  <th style={{ padding: "14px 12px", fontSize: 12, color: "#64748b" }}>Type</th>
                  <th style={{ padding: "14px 12px", fontSize: 12, color: "#64748b" }}>Title</th>
                  <th style={{ padding: "14px 12px", fontSize: 12, color: "#64748b" }}>Message</th>
                  <th style={{ padding: "14px 12px", fontSize: 12, color: "#64748b" }}>User ID</th>
                  <th style={{ padding: "14px 12px", fontSize: 12, color: "#64748b" }}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {loadingFailures ? (
                  <tr><td colSpan={6} style={{ padding: 18, color: "#64748b" }}>Loading failures...</td></tr>
                ) : failures.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 18, color: "#64748b" }}>No failure records found.</td></tr>
                ) : (
                  failures.map((item) => (
                    <tr key={item.id} style={{ borderTop: "1px solid rgba(37,99,235,0.08)", verticalAlign: "top" }}>
                      <td style={{ padding: "14px 12px", fontSize: 12, whiteSpace: "nowrap" }}>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: 12 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "5px 9px",
                            borderRadius: 999,
                            background: item.type === "email.failed" ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)",
                            border: item.type === "email.failed" ? "1px solid rgba(239,68,68,0.30)" : "1px solid rgba(245,158,11,0.30)",
                          }}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: 700 }}>{item.title || "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: 12, maxWidth: 340, lineHeight: 1.45 }}>{item.message || "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: 12 }}>{item.user_id ?? "—"}</td>
                      <td style={{ padding: "14px 12px", fontSize: 11, color: "#64748b", whiteSpace: "pre-wrap", wordBreak: "break-word", maxWidth: 320 }}>{item.metadata_json || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
