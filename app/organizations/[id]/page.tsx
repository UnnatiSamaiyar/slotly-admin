"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../../lib/api";

type StaffRole = "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "AUDITOR" | string;

type StaffMe = {
  id?: number | string | null;
  email?: string | null;
  name?: string | null;
  role?: StaffRole | null;
};

type TabKey =
  | "overview"
  | "members"
  | "teams"
  | "event-types"
  | "bookings"
  | "hierarchy"
  | "audit";

type UserSummary = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

type OrganizationMember = {
  membership_id?: number | string | null;
  user_id?: number | string | null;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  user?: UserSummary | null;
  role?: string | null;
  reports_to?: UserSummary | string | null;
  joined_at?: string | null;
  teams_count?: number | null;
  bookings_count?: number | null;
  event_types_count?: number | null;
};

type OrganizationTeam = {
  id?: number | string | null;
  team_id?: number | string | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  created_by?: UserSummary | string | null;
  created_at?: string | null;
  members_count?: number | null;
  event_types_count?: number | null;
  bookings_count?: number | null;
};

type OrganizationBooking = {
  id?: number | string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  title?: string | null;
  status?: string | null;
  meeting_mode?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  created_at?: string | null;
  host_user?: UserSummary | null;
  assigned_user?: UserSummary | null;
  profile?: {
    id?: number | string | null;
    slug?: string | null;
    title?: string | null;
  } | null;
  team?: { id?: number | string | null; name?: string | null } | null;
};

type OrganizationDetail = {
  id: number | string;
  name?: string | null;
  slug?: string | null;
  created_by?: UserSummary | null;
  created_at?: string | null;
  counts?: {
    members?: number | null;
    teams?: number | null;
    event_types?: number | null;
    bookings?: number | null;
  } | null;
  recent_members?: OrganizationMember[];
  recent_teams?: OrganizationTeam[];
  recent_bookings?: OrganizationBooking[];
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "members", label: "Members" },
  { key: "teams", label: "Teams" },
  { key: "event-types", label: "Event Types" },
  { key: "bookings", label: "Bookings" },
  { key: "hierarchy", label: "Hierarchy" },
  { key: "audit", label: "Audit" },
];

const statusStyles: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  confirmed: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
  completed: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  canceled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  rescheduled: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  default: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

function formatNumber(value?: number | null): string {
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
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

function formatLabel(value?: string | null): string {
  if (!value) return "Not available";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getUserLabel(user?: UserSummary | null): string {
  if (!user) return "Not available";
  return user.name || user.email || "Not available";
}

function getMemberUser(member?: OrganizationMember | null): UserSummary | null {
  if (!member) return null;
  if (member.user) return member.user;
  return {
    id: member.user_id || null,
    name: member.name || null,
    email: member.email || null,
    picture: member.picture || null,
  };
}

function getReportsToLabel(
  reportsTo?: OrganizationMember["reports_to"],
): string {
  if (!reportsTo) return "Not assigned";
  if (typeof reportsTo === "string") return reportsTo;
  return reportsTo.name || reportsTo.email || "Not assigned";
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "OR";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "slate" | "green";
}) {
  const styles = {
    blue: { border: "#bfdbfe", bg: "#eff6ff", color: "#2563eb" },
    slate: { border: "#e2e8f0", bg: "#f8fafc", color: "#475569" },
    green: { border: "#bbf7d0", bg: "#ecfdf5", color: "#047857" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        color: styles.color,
        borderRadius: 999,
        padding: "5px 9px",
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const key = String(status || "default").toLowerCase();
  const style = statusStyles[key] || statusStyles.default;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
        borderRadius: 999,
        padding: "5px 9px",
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {formatLabel(status || "Unknown")}
    </span>
  );
}

function UserIdentity({
  user,
  fallback = "Unknown user",
}: {
  user?: UserSummary | null;
  fallback?: string;
}) {
  const name = user?.name || fallback;
  const email = user?.email || "Email not available";
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
    >
      {user?.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.picture}
          alt={name}
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            objectFit: "cover",
            border: "1px solid #dbeafe",
            flex: "0 0 auto",
          }}
        />
      ) : (
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
          {getInitials(user?.name, user?.email)}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          title={name}
          style={{
            color: "#0f172a",
            fontWeight: 900,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div
          title={email}
          style={{
            marginTop: 4,
            color: "#64748b",
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ padding: 30, textAlign: "center" }}>
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
      <h2 style={{ margin: 0, color: "#0f172a", fontSize: 17 }}>{title}</h2>
      <p
        style={{
          margin: "8px auto 0",
          maxWidth: 520,
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>
    </div>
  );
}

function PageLoader() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)",
        color: "#0f172a",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 42,
            height: 42,
            margin: "0 auto 16px",
            borderRadius: "50%",
            border: "4px solid #dbeafe",
            borderTopColor: "#2563eb",
          }}
        />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
          Loading organization...
        </p>

        {actionOpen ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.42)", display: "grid", placeItems: "center", padding: 18, zIndex: 50 }}>
            <div style={{ width: "min(100%, 560px)", border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 22, boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)", overflow: "hidden" }}>
              <div style={{ padding: 18, borderBottom: "1px solid #e2e8f0", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
                <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>{formatLabel(actionOpen)}</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{actionOpen === "edit-org" ? "Changing slug can affect public workspace URLs. Confirm carefully." : "Confirm carefully. This action is audited."}</p>
              </div>
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                {actionOpen === "edit-org" ? <>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Organization name</span><input value={formName} onChange={(e) => setFormName(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }} /></label>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Slug</span><input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }} /></label>
                </> : null}
                {actionOpen === "change-role" ? <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>New role</span><select value={formRole} onChange={(e) => setFormRole(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }}><option value="OWNER">OWNER</option><option value="ADMIN">ADMIN</option><option value="MANAGER">MANAGER</option><option value="TL">TL</option><option value="MEMBER">MEMBER</option></select></label> : null}
                {actionOpen === "change-reporting" ? <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Reports to</span><select value={formReportsTo} onChange={(e) => setFormReportsTo(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }}><option value="">No manager</option>{recentMembers.filter((member) => String(member.membership_id) !== String(selectedMember?.membership_id)).map((member) => { const user = getMemberUser(member); return <option key={String(member.membership_id || user?.id)} value={String(member.membership_id)}>{user?.name || user?.email || `Member #${member.membership_id}`}</option>; })}</select></label> : null}
                {actionOpen === "remove-member" ? <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 16, padding: 14, fontSize: 14 }}>This removes organization membership if backend safety rules allow it. Last OWNER and unsafe removals are blocked.</div> : null}
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>{actionOpen === "org-note" ? "Internal note" : "Reason"}</span><textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} rows={3} placeholder="Add a clear audit reason" style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11, resize: "vertical" }} /></label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: 18, borderTop: "1px solid #e2e8f0" }}>
                <ActionButton tone="neutral" onClick={closeAction}>Cancel</ActionButton>
                <ActionButton tone={actionOpen === "remove-member" ? "danger" : "primary"} onClick={submitAction}>{actionLoading ? "Working..." : "Confirm"}</ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
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
          padding: "18px 20px",
          borderBottom: "1px solid #e2e8f0",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: 18,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
        {description ? (
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  help,
}: {
  label: string;
  value?: number | null;
  help: string;
}) {
  return (
    <article
      style={{
        minWidth: 0,
        border: "1px solid #bfdbfe",
        background: "#ffffff",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 12px 35px rgba(15, 23, 42, 0.06)",
      }}
    >
      <p style={{ margin: 0, color: "#64748b", fontSize: 13, fontWeight: 800 }}>
        {label}
      </p>
      <p
        style={{
          margin: "10px 0 0",
          color: "#0f172a",
          fontSize: 28,
          lineHeight: 1,
          fontWeight: 900,
          letterSpacing: "-0.04em",
        }}
      >
        {formatNumber(value)}
      </p>
      <p
        style={{
          margin: "12px 0 0",
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.45,
        }}
      >
        {help}
      </p>
    </article>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#0f172a",
          fontSize: 14,
          fontWeight: 800,
          minWidth: 0,
          overflowWrap: "anywhere",
        }}
      >
        {value || "Not available"}
      </div>
    </div>
  );
}


function ActionButton({ children, onClick, tone = "primary" }: { children: React.ReactNode; onClick: () => void; tone?: "primary" | "danger" | "neutral" }) {
  const styles = tone === "danger"
    ? { border: "#fecaca", bg: "#fff7f7", color: "#b91c1c" }
    : tone === "neutral"
      ? { border: "#e2e8f0", bg: "#ffffff", color: "#475569" }
      : { border: "#bfdbfe", bg: "#eff6ff", color: "#2563eb" };
  return (
    <button type="button" onClick={onClick} style={{ border: `1px solid ${styles.border}`, background: styles.bg, color: styles.color, borderRadius: 999, padding: "8px 11px", fontSize: 12, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function getStaffRoleKey(role?: string | null): string {
  const key = String(role || "").trim().toUpperCase();
  if (["CEO", "OWNER", "ROOT"].includes(key)) return "SUPER_ADMIN";
  return key;
}

function canManageOrganization(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN"].includes(getStaffRoleKey(role));
}

function canChangeOwnerRole(role?: string | null): boolean {
  return getStaffRoleKey(role) === "SUPER_ADMIN";
}

function Toast({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <div style={{ marginBottom: 14, border: `1px solid ${tone === "success" ? "#bbf7d0" : "#fecaca"}`, background: tone === "success" ? "#ecfdf5" : "#fff7f7", color: tone === "success" ? "#047857" : "#991b1b", borderRadius: 16, padding: 14, fontSize: 14, fontWeight: 800 }}>
      {message}
    </div>
  );
}

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orgId = params?.id;
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [organization, setOrganization] = useState<OrganizationDetail | null>(
    null,
  );
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [orgTeams, setOrgTeams] = useState<OrganizationTeam[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionOpen, setActionOpen] = useState<null | "edit-org" | "org-note" | "change-role" | "change-reporting" | "remove-member">(null);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formRole, setFormRole] = useState("MEMBER");
  const [formReportsTo, setFormReportsTo] = useState("");
  const [formReason, setFormReason] = useState("");
  const [staff, setStaff] = useState<StaffMe | null>(null);

  async function loadOrganization() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!orgId) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [meResponse, response] = await Promise.all([
        fetch(`${API_BASE}/ops/me`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" }),
        fetch(`${API_BASE}/ops/organizations/${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        }),
      ]);

      if (meResponse.status === 401 || response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (response.status === 404) {
        setOrganization(null);
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        let message = "Organization could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      if (meResponse.ok) {
        try {
          setStaff(await meResponse.json());
        } catch {
          setStaff(null);
        }
      }

      const data = await response.json();
      setOrganization(data);
      setOrgMembers(
        Array.isArray(data?.recent_members) ? data.recent_members : [],
      );
      setOrgTeams(Array.isArray(data?.recent_teams) ? data.recent_teams : []);
      void loadMembers(token);
      void loadTeams(token);
    } catch (err) {
      setOrganization(null);
      setError(
        err instanceof Error ? err.message : "Organization could not load",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers(existingToken?: string) {
    const token = existingToken || getToken();
    if (!token || !orgId) return;

    setMembersLoading(true);
    setMembersError(null);

    try {
      const response = await fetch(
        `${API_BASE}/ops/organizations/${orgId}/members`,
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
        let message = "Organization members could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const data = await response.json();
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.members)
            ? data.members
            : Array.isArray(data?.data)
              ? data.data
              : [];
      setOrgMembers(rows);
    } catch (err) {
      setMembersError(
        err instanceof Error
          ? err.message
          : "Organization members could not load",
      );
    } finally {
      setMembersLoading(false);
    }
  }


  async function loadTeams(existingToken?: string) {
    const token = existingToken || getToken();
    if (!token || !orgId) return;

    setTeamsLoading(true);
    setTeamsError(null);

    try {
      const response = await fetch(
        `${API_BASE}/ops/organizations/${orgId}/teams`,
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
        let message = "Organization teams could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }

      const data = await response.json();
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.teams)
            ? data.teams
            : Array.isArray(data?.data)
              ? data.data
              : [];
      setOrgTeams(rows);
    } catch (err) {
      setTeamsError(
        err instanceof Error ? err.message : "Organization teams could not load",
      );
    } finally {
      setTeamsLoading(false);
    }
  }


  function openAction(action: typeof actionOpen, member?: OrganizationMember) {
    setActionOpen(action);
    setSelectedMember(member || null);
    setActionError(null);
    setActionSuccess(null);
    setFormReason("");
    setFormName(organization?.name || "");
    setFormSlug(organization?.slug || "");
    setFormRole(member?.role || "MEMBER");
    const reportsTo = member?.reports_to;
    const reportsToId = typeof reportsTo === "object" && reportsTo ? reportsTo.membership_id || reportsTo.id || "" : "";
    setFormReportsTo(String(reportsToId || ""));
  }

  function closeAction() {
    if (actionLoading) return;
    setActionOpen(null);
    setSelectedMember(null);
    setActionError(null);
  }

  async function submitAction() {
    const token = getToken();
    if (!token || !orgId || !actionOpen) return;
    setActionLoading(true);
    setActionError(null);
    try {
      let path = "";
      let method = "POST";
      let body: Record<string, unknown> = { reason: formReason.trim() || undefined };

      if (actionOpen === "edit-org") {
        path = `/ops/organizations/${encodeURIComponent(orgId)}`;
        method = "PATCH";
        body = { name: formName.trim(), slug: formSlug.trim(), reason: formReason.trim() || undefined };
      } else if (actionOpen === "org-note") {
        path = `/ops/organizations/${encodeURIComponent(orgId)}/internal-note`;
        body = { note: formReason.trim(), reason: formReason.trim() || undefined };
      } else if (actionOpen === "change-role") {
        path = `/ops/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(String(selectedMember?.membership_id || ""))}/role`;
        method = "PATCH";
        body = { role: formRole, reason: formReason.trim() || undefined };
      } else if (actionOpen === "change-reporting") {
        path = `/ops/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(String(selectedMember?.membership_id || ""))}/reporting`;
        method = "PATCH";
        body = { reports_to_member_id: formReportsTo ? Number(formReportsTo) : null, reason: formReason.trim() || undefined };
      } else if (actionOpen === "remove-member") {
        path = `/ops/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(String(selectedMember?.membership_id || ""))}`;
        method = "DELETE";
      }

      const response = await fetch(`${API_BASE}${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (response.status === 401) { clearToken(); router.replace("/login"); return; }
      if (!response.ok) {
        let message = "Action failed";
        try { const data = await response.json(); message = data?.detail || data?.message || message; } catch { message = await response.text(); }
        throw new Error(message);
      }
      setActionSuccess("Action completed successfully. Audit log entry was created by the backend.");
      setActionOpen(null);
      await loadOrganization();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const counts = organization?.counts || {};
  const recentMembers = useMemo(
    () =>
      orgMembers.length > 0 ? orgMembers : organization?.recent_members || [],
    [orgMembers, organization],
  );
  const memberRoles = useMemo(() => {
    const roles = new Set(
      recentMembers.map((member) =>
        String(member.role || "unknown").toLowerCase(),
      ),
    );
    return Array.from(roles).sort();
  }, [recentMembers]);
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return recentMembers.filter((member) => {
      const user = getMemberUser(member);
      const role = String(member.role || "unknown").toLowerCase();
      const matchesRole =
        memberRoleFilter === "all" || role === memberRoleFilter;
      const searchable = [
        user?.name,
        user?.email,
        member.role,
        getReportsToLabel(member.reports_to),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      return matchesRole && matchesSearch;
    });
  }, [recentMembers, memberSearch, memberRoleFilter]);
  const recentTeams = useMemo(
    () => (orgTeams.length > 0 ? orgTeams : organization?.recent_teams || []),
    [orgTeams, organization],
  );
  const recentBookings = useMemo(
    () => organization?.recent_bookings || [],
    [organization],
  );

  if (loading) return <PageLoader />;

  if (notFound) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            textAlign: "center",
            border: "1px solid #dbeafe",
            background: "#ffffff",
            borderRadius: 22,
            padding: 28,
            boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
          }}
        >
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: 24 }}>
            Organization not found
          </h1>
          <p style={{ margin: "10px 0 20px", color: "#64748b", fontSize: 14 }}>
            This organization does not exist or is no longer available.
          </p>
          <Link
            href="/organizations"
            style={{
              display: "inline-flex",
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Back to organizations
          </Link>
        </div>
      </main>
    );
  }

  if (error || !organization) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)",
          padding: "24px clamp(16px, 3vw, 32px)",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            border: "1px solid #fecaca",
            background: "#fff7f7",
            borderRadius: 20,
            padding: 20,
            color: "#991b1b",
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: 20 }}>
            Organization could not load
          </h1>
          <p style={{ margin: 0, fontSize: 14 }}>
            {error || "No organization data returned."}
          </p>
          <button
            type="button"
            onClick={loadOrganization}
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
      </main>
    );
  }

  const orgName = organization.name || "Untitled organization";
  const orgSlug = organization.slug || "not-available";
  const canManage = canManageOrganization(staff?.role);
  const canOwnerChange = canChangeOwnerRole(staff?.role);

  return (
    <main
      style={{
        minHeight: "100vh",
        overflowX: "hidden",
        background:
          "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1400,
          margin: "0 auto",
          padding: "24px clamp(16px, 3vw, 32px)",
        }}
      >
        {actionSuccess ? <Toast message={actionSuccess} tone="success" /> : null}
        {actionError ? <Toast message={actionError} tone="error" /> : null}
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
            <Link
              href="/organizations"
              style={{
                display: "inline-flex",
                marginBottom: 12,
                color: "#2563eb",
                fontSize: 13,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Back to organizations
            </Link>
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
              Organization Detail
            </p>
            <h1
              title={orgName}
              style={{
                margin: 0,
                fontSize: "clamp(26px, 4vw, 38px)",
                lineHeight: 1.1,
                letterSpacing: "-0.045em",
                overflowWrap: "anywhere",
              }}
            >
              {orgName}
            </h1>
            <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>
              Read-only overview of organization members, teams, bookings, and
              scheduling footprint.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Badge>Organization #{organization.id}</Badge>
            <Badge>{canManage ? `${getStaffRoleKey(staff?.role)} access` : "Read-only access"}</Badge>
            {canManage ? <ActionButton onClick={() => openAction("edit-org")}>Edit organization</ActionButton> : null}
            {canManage ? <ActionButton tone="neutral" onClick={() => openAction("org-note")}>Add note</ActionButton> : null}
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(260px, 0.7fr)",
            gap: 16,
            alignItems: "stretch",
            marginBottom: 16,
          }}
        >
          <section
            style={{
              border: "1px solid #dbeafe",
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  display: "grid",
                  placeItems: "center",
                  background: "#eff6ff",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  fontWeight: 900,
                  fontSize: 18,
                  flex: "0 0 auto",
                }}
              >
                {orgName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: 20,
                    overflowWrap: "anywhere",
                  }}
                >
                  {orgName}
                </h2>
                <div style={{ marginTop: 8 }}>
                  <Badge tone="slate">{orgSlug}</Badge>
                </div>
                <p
                  style={{ margin: "12px 0 0", color: "#64748b", fontSize: 14 }}
                >
                  Created at {formatDateTime(organization.created_at)}
                </p>
              </div>
            </div>
          </section>

          <section
            style={{
              border: "1px solid #dbeafe",
              background: "#ffffff",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
              minWidth: 0,
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                color: "#64748b",
                fontSize: 12,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Created by
            </p>
            <UserIdentity
              user={organization.created_by}
              fallback="System / unavailable"
            />
          </section>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <StatCard
            label="Members"
            value={counts.members}
            help="People attached to this organization."
          />
          <StatCard
            label="Teams"
            value={counts.teams}
            help="Teams created inside this organization."
          />
          <StatCard
            label="Event Types"
            value={counts.event_types}
            help="Scheduling templates mapped to this organization."
          />
          <StatCard
            label="Bookings"
            value={counts.bookings}
            help="Bookings connected with this organization."
          />
        </section>

        <nav
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 10,
            marginBottom: 14,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                border:
                  activeTab === tab.key
                    ? "1px solid #2563eb"
                    : "1px solid #dbeafe",
                background: activeTab === tab.key ? "#2563eb" : "#ffffff",
                color: activeTab === tab.key ? "#ffffff" : "#334155",
                borderRadius: 999,
                padding: "10px 13px",
                fontWeight: 900,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <SectionShell
              title="Organization summary"
              description="Core metadata and latest read-only enterprise activity."
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                  gap: 16,
                  padding: 18,
                }}
              >
                <DetailRow label="Organization ID" value={organization.id} />
                <DetailRow label="Slug" value={orgSlug} />
                <DetailRow
                  label="Created By"
                  value={getUserLabel(organization.created_by)}
                />
                <DetailRow
                  label="Created At"
                  value={formatDateTime(organization.created_at)}
                />
              </div>
            </SectionShell>
            <MembersTable members={recentMembers} compact />
            <TeamsTable teams={recentTeams} compact />
            <BookingsTable bookings={recentBookings} compact />
          </div>
        ) : null}

        {activeTab === "members" ? (
          <MembersTable
            members={filteredMembers}
            allMembersCount={recentMembers.length}
            loading={membersLoading}
            error={membersError}
            search={memberSearch}
            roleFilter={memberRoleFilter}
            roles={memberRoles}
            onSearchChange={setMemberSearch}
            onRoleFilterChange={setMemberRoleFilter}
            onRetry={() => loadMembers()}
            onChangeRole={(member) => openAction("change-role", member)}
            onChangeReportsTo={(member) => openAction("change-reporting", member)}
            onRemove={(member) => openAction("remove-member", member)}
          />
        ) : null}
        {activeTab === "teams" ? (
          <TeamsTable
            teams={recentTeams}
            loading={teamsLoading}
            error={teamsError}
            onRetry={() => loadTeams()}
          />
        ) : null}
        {activeTab === "bookings" ? (
          <BookingsTable bookings={recentBookings} />
        ) : null}
        {activeTab === "event-types" ? (
          <EmptyTab
            title="Event types"
            message="The organization overview API is ready. Dedicated organization event-types API can be added in the next phase for full listing."
          />
        ) : null}
        {activeTab === "hierarchy" ? (
          <EmptyTab
            title="Hierarchy"
            message="Hierarchy visibility is reserved for the next enterprise phase. No member reporting changes are available here."
          />
        ) : null}
        {activeTab === "audit" ? (
          <EmptyTab
            title="Audit"
            message="Organization audit timeline will appear here once org-level audit source is connected."
          />
        ) : null}

        {actionOpen ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.42)", display: "grid", placeItems: "center", padding: 18, zIndex: 50 }}>
            <div style={{ width: "min(100%, 560px)", border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 22, boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)", overflow: "hidden" }}>
              <div style={{ padding: 18, borderBottom: "1px solid #e2e8f0", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
                <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>{formatLabel(actionOpen)}</h2>
                <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{actionOpen === "edit-org" ? "Changing slug can affect public workspace URLs. Confirm carefully." : "Confirm carefully. This action is audited."}</p>
              </div>
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                {actionOpen === "edit-org" ? <>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Organization name</span><input value={formName} onChange={(e) => setFormName(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }} /></label>
                  <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Slug</span><input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }} /></label>
                </> : null}
                {actionOpen === "change-role" ? <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>New role</span><select value={formRole} onChange={(e) => setFormRole(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }}><option value="OWNER">OWNER</option><option value="ADMIN">ADMIN</option><option value="MANAGER">MANAGER</option><option value="TL">TL</option><option value="MEMBER">MEMBER</option></select></label> : null}
                {actionOpen === "change-reporting" ? <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>Reports to</span><select value={formReportsTo} onChange={(e) => setFormReportsTo(e.target.value)} style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11 }}><option value="">No manager</option>{recentMembers.filter((member) => String(member.membership_id) !== String(selectedMember?.membership_id)).map((member) => { const user = getMemberUser(member); return <option key={String(member.membership_id || user?.id)} value={String(member.membership_id)}>{user?.name || user?.email || `Member #${member.membership_id}`}</option>; })}</select></label> : null}
                {actionOpen === "remove-member" ? <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 16, padding: 14, fontSize: 14 }}>This removes organization membership if backend safety rules allow it. Last OWNER and unsafe removals are blocked.</div> : null}
                <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>{actionOpen === "org-note" ? "Internal note" : "Reason"}</span><textarea value={formReason} onChange={(e) => setFormReason(e.target.value)} rows={3} placeholder="Add a clear audit reason" style={{ border: "1px solid #dbeafe", borderRadius: 14, padding: 11, resize: "vertical" }} /></label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: 18, borderTop: "1px solid #e2e8f0" }}>
                <ActionButton tone="neutral" onClick={closeAction}>Cancel</ActionButton>
                <ActionButton tone={actionOpen === "remove-member" ? "danger" : "primary"} onClick={submitAction}>{actionLoading ? "Working..." : "Confirm"}</ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function EmptyTab({ title, message }: { title: string; message: string }) {
  return (
    <SectionShell
      title={title}
      description="Read-only placeholder for future enterprise visibility."
    >
      <EmptyState title={`${title} not available yet`} message={message} />
    </SectionShell>
  );
}

function MembersTable({
  members,
  compact = false,
  allMembersCount,
  loading = false,
  error = null,
  search = "",
  roleFilter = "all",
  roles = [],
  onSearchChange,
  onRoleFilterChange,
  onRetry,
  onChangeRole,
  onChangeReportsTo,
  onRemove,
}: {
  members: OrganizationMember[];
  compact?: boolean;
  allMembersCount?: number;
  loading?: boolean;
  error?: string | null;
  search?: string;
  roleFilter?: string;
  roles?: string[];
  onSearchChange?: (value: string) => void;
  onRoleFilterChange?: (value: string) => void;
  onRetry?: () => void;
  canOwnerChange?: boolean;
  onChangeRole?: (member: OrganizationMember) => void;
  onChangeReportsTo?: (member: OrganizationMember) => void;
  onRemove?: (member: OrganizationMember) => void;
}) {
  const showFilters = !compact;
  const totalCount =
    typeof allMembersCount === "number" ? allMembersCount : members.length;

  return (
    <SectionShell
      title={compact ? "Recent members" : "Members"}
      description={
        compact
          ? "Latest organization memberships returned by the overview API."
          : "Searchable read-only organization member directory."
      }
    >
      {showFilters ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 260px)",
            gap: 12,
            padding: 16,
            borderBottom: "1px solid #e2e8f0",
            background: "#fbfdff",
          }}
        >
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Search members
            </span>
            <input
              value={search}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search by name, email, role, reports-to"
              style={{
                width: "100%",
                minWidth: 0,
                border: "1px solid #dbeafe",
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: 14,
                padding: "11px 12px",
                outline: "none",
                fontSize: 14,
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <span
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Role filter
            </span>
            <select
              value={roleFilter}
              onChange={(event) => onRoleFilterChange?.(event.target.value)}
              style={{
                width: "100%",
                minWidth: 0,
                border: "1px solid #dbeafe",
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: 14,
                padding: "11px 12px",
                outline: "none",
                fontSize: 14,
              }}
            >
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {formatLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              Showing{" "}
              <strong style={{ color: "#0f172a" }}>
                {formatNumber(members.length)}
              </strong>{" "}
              of{" "}
              <strong style={{ color: "#0f172a" }}>
                {formatNumber(totalCount)}
              </strong>{" "}
              members.
            </p>
            {search || roleFilter !== "all" ? (
              <Badge tone="slate">Filtered result</Badge>
            ) : (
              <Badge tone="green">Read-only</Badge>
            )}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ display: "grid", gap: 10, padding: 18 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: 48,
                borderRadius: 14,
                background:
                  "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)",
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            margin: 18,
            border: "1px solid #fecaca",
            background: "#fff7f7",
            color: "#991b1b",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>
            Members could not load
          </h3>
          <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginTop: 12,
                border: "1px solid #fecaca",
                background: "#ffffff",
                color: "#991b1b",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          title={
            showFilters && (search || roleFilter !== "all")
              ? "No members match these filters"
              : "No members found"
          }
          message={
            showFilters && (search || roleFilter !== "all")
              ? "Try clearing the search or role filter to see all organization members."
              : "Organization members will appear here once memberships are available."
          }
        />
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: compact ? 760 : 1080,
              borderCollapse: "collapse",
              fontSize: 13,
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
                {(compact
                  ? ["Member", "Role", "Reports To", "Joined At"]
                  : [
                      "Member",
                      "Email",
                      "Role",
                      "Reports To",
                      "Teams",
                      "Event Types",
                      "Bookings",
                      "Joined At",
                      "Actions",
                    ]
                ).map((h) => (
                  <th
                    key={h}
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
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => {
                const user = getMemberUser(member);
                const userName = user?.name || "Unknown user";
                const userEmail = user?.email || "Email not available";
                const reportsTo = getReportsToLabel(member.reports_to);
                return (
                  <tr
                    key={String(
                      member.membership_id || user?.id || userEmail || index,
                    )}
                    style={{ borderBottom: "1px solid #eef2f7" }}
                  >
                    <td style={{ padding: "14px 16px", maxWidth: 320 }}>
                      <UserIdentity user={user} />
                    </td>
                    {!compact ? (
                      <td
                        title={userEmail}
                        style={{
                          padding: "14px 16px",
                          color: "#334155",
                          maxWidth: 260,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {userEmail}
                      </td>
                    ) : null}
                    <td style={{ padding: "14px 16px" }}>
                      <Badge>{formatLabel(member.role)}</Badge>
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#334155",
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={reportsTo}
                    >
                      {reportsTo}
                    </td>
                    {!compact ? (
                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#0f172a",
                          fontWeight: 900,
                        }}
                      >
                        {formatNumber(member.teams_count)}
                      </td>
                    ) : null}
                    {!compact ? (
                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#0f172a",
                          fontWeight: 900,
                        }}
                      >
                        {formatNumber(member.event_types_count)}
                      </td>
                    ) : null}
                    {!compact ? (
                      <td
                        style={{
                          padding: "14px 16px",
                          color: "#0f172a",
                          fontWeight: 900,
                        }}
                      >
                        {formatNumber(member.bookings_count)}
                      </td>
                    ) : null}
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDateTime(member.joined_at)}
                    </td>
                    {!compact ? (
                      <td
                        style={{ padding: "14px 16px", whiteSpace: "nowrap" }}
                      >
                        {user?.id ? (
                          <Link
                            href={`/users/${user.id}`}
                            style={{
                              color: "#2563eb",
                              fontWeight: 900,
                              textDecoration: "none",
                            }}
                          >
                            View user
                          </Link>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>
                            Not available
                          </span>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          {onChangeRole && (canOwnerChange || normalizeRole(member.role) !== "OWNER") ? <ActionButton onClick={() => onChangeRole(member)}>Change role</ActionButton> : null}
                          {onChangeReportsTo ? <ActionButton tone="neutral" onClick={() => onChangeReportsTo(member)}>Reports to</ActionButton> : null}
                          {onRemove && (canOwnerChange || normalizeRole(member.role) !== "OWNER") ? <ActionButton tone="danger" onClick={() => onRemove(member)}>Remove</ActionButton> : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}

function TeamsTable({
  teams,
  compact = false,
  loading = false,
  error = null,
  onRetry,
}: {
  teams: OrganizationTeam[];
  compact?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  canOwnerChange?: boolean;
  onChangeRole?: (member: OrganizationMember) => void;
  onChangeReportsTo?: (member: OrganizationMember) => void;
  onRemove?: (member: OrganizationMember) => void;
}) {
  return (
    <SectionShell
      title={compact ? "Recent teams" : "Teams"}
      description={
        compact
          ? "Latest teams returned by the organization overview API."
          : "Read-only team directory for this organization."
      }
    >
      {loading ? (
        <div style={{ display: "grid", gap: 10, padding: 18 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: 48,
                borderRadius: 14,
                background:
                  "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)",
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            margin: 18,
            border: "1px solid #fecaca",
            background: "#fff7f7",
            color: "#991b1b",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>
            Teams could not load
          </h3>
          <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginTop: 12,
                border: "1px solid #fecaca",
                background: "#ffffff",
                color: "#991b1b",
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams found"
          message="Teams will appear here once they are created for this organization."
        />
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: compact ? 860 : 980,
              borderCollapse: "collapse",
              fontSize: 13,
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
                  "Team",
                  "Slug",
                  "Members",
                  "Event Types",
                  "Bookings",
                  "Created By",
                  "Created At",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
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
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const teamId = team.team_id || team.id;
                const name = team.name || "Untitled team";
                const createdBy =
                  typeof team.created_by === "string"
                    ? team.created_by
                    : getUserLabel(team.created_by);
                return (
                  <tr
                    key={String(teamId || team.slug || name)}
                    style={{ borderBottom: "1px solid #eef2f7" }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#0f172a",
                        fontWeight: 900,
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={name}
                    >
                      {name}
                      {team.description ? (
                        <div
                          title={team.description}
                          style={{
                            marginTop: 4,
                            color: "#64748b",
                            fontSize: 12,
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {team.description}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "14px 16px", maxWidth: 220 }}>
                      <Badge tone="slate">{team.slug || "not-available"}</Badge>
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 900, color: "#0f172a" }}>
                      {formatNumber(team.members_count)}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 900, color: "#0f172a" }}>
                      {formatNumber(team.event_types_count)}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 900, color: "#0f172a" }}>
                      {formatNumber(team.bookings_count)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#334155",
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={createdBy}
                    >
                      {createdBy}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", color: "#334155" }}>
                      {formatDateTime(team.created_at)}
                    </td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      {teamId ? (
                        <Link
                          href={`/teams/${teamId}`}
                          style={{
                            color: "#2563eb",
                            fontWeight: 900,
                            textDecoration: "none",
                          }}
                        >
                          View detail
                        </Link>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Not available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}


function BookingsTable({
  bookings,
  compact = false,
}: {
  bookings: OrganizationBooking[];
  compact?: boolean;
}) {
  return (
    <SectionShell
      title={compact ? "Recent bookings" : "Bookings"}
      description="Latest bookings connected with this organization."
    >
      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          message="Organization bookings will appear here once matching bookings are created."
        />
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 960,
              borderCollapse: "collapse",
              fontSize: 13,
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
                  "Booking",
                  "Guest",
                  "Host",
                  "Date & Time",
                  "Status",
                  "Meeting Mode",
                  "Team",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
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
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const title =
                  booking.title ||
                  booking.profile?.title ||
                  `Booking #${booking.id}`;
                const guest = booking.guest_name || "Guest";
                const guestEmail = booking.guest_email || "Email not available";
                return (
                  <tr
                    key={String(booking.id || title)}
                    style={{ borderBottom: "1px solid #eef2f7" }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#0f172a",
                        fontWeight: 900,
                        maxWidth: 220,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={title}
                    >
                      {title}
                    </td>
                    <td style={{ padding: "14px 16px", maxWidth: 260 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          color: "#0f172a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {guest}
                      </div>
                      <div
                        title={guestEmail}
                        style={{
                          marginTop: 4,
                          color: "#64748b",
                          fontSize: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {guestEmail}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", maxWidth: 240 }}>
                      <UserIdentity
                        user={booking.host_user}
                        fallback="Not assigned"
                      />
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div>{formatDateTime(booking.start_time)}</div>
                      <div
                        style={{ marginTop: 4, color: "#94a3b8", fontSize: 12 }}
                      >
                        Ends {formatDateTime(booking.end_time)}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <StatusBadge status={booking.status} />
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatLabel(booking.meeting_mode)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        color: "#334155",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={booking.team?.name || "Personal"}
                    >
                      {booking.team?.name || "Personal"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {booking.id ? (
                        <Link
                          href={`/bookings/${booking.id}`}
                          style={{
                            color: "#2563eb",
                            fontWeight: 900,
                            textDecoration: "none",
                          }}
                        >
                          View detail
                        </Link>
                      ) : (
                        "Not available"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}
