

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../../lib/api";
// import { BookingStatusBadge } from "../../../lib/bookingStatus";

type BasicUser = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
} | null;

type BasicEntity = {
  id?: number | string | null;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  duration_minutes?: number | null;
  event_kind?: string | null;
} | null;


type StaffMe = {
  id?: number | string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

type BookingAuditEntry = {
  id?: number | string | null;
  action?: string | null;
  actor_user_id?: number | string | null;
  actor_user?: BasicUser;
  actor?: BasicUser;
  old_start_time?: string | null;
  old_end_time?: string | null;
  new_start_time?: string | null;
  new_end_time?: string | null;
  metadata_json?: unknown;
  metadata?: unknown;
  meta_summary?: string | null;
  created_at?: string | null;
};

type BookingDetail = {
  id?: number | string;
  booking?: {
    id?: number | string;
    title?: string | null;
    // status?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    timezone?: string | null;
    guest_timezone?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    version?: number | string | null;
  } | null;
  guest?: {
    name?: string | null;
    email?: string | null;
    attendees?: unknown;
  } | null;
  host_user?: BasicUser;
  assigned_user?: BasicUser;
  profile?: BasicEntity;
  event_type?: BasicEntity;
  organization?: BasicEntity;
  team?: BasicEntity;
  meeting?: {
    mode?: string | null;
    meet_link?: string | null;
    location?: string | null;
    google_event_id?: string | null;
  } | null;
  rsvp?: {
    attendees?: unknown;
    available?: boolean | null;
  } | null;
  reschedule?: {
    count?: number | null;
    last_rescheduled_at?: string | null;
    rescheduled_from_booking_id?: number | string | null;
    requests?: Array<{
      id?: number | string | null;
      policy?: string | null;
      state?: string | null;
      expires_at?: string | null;
      created_at?: string | null;
      created_by?: BasicUser;
    }>;
  } | null;
  slot_holds?: Array<{
    id?: number | string | null;
    start_time?: string | null;
    end_time?: string | null;
    expires_at?: string | null;
    created_at?: string | null;
    is_active?: boolean | null;
    host_user?: BasicUser;
    profile?: BasicEntity;
  }>;
  audit_log_summary?: Array<{
    id?: number | string | null;
    action?: string | null;
    actor_user?: BasicUser;
    old_start_time?: string | null;
    old_end_time?: string | null;
    new_start_time?: string | null;
    new_end_time?: string | null;
    meta_summary?: string | null;
    created_at?: string | null;
  }>;
};

type BookingActionKey = "confirm" | "complete" | "cancel" | "note" | "release_hold";

type PendingAction = {
  key: BookingActionKey;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "blue" | "green" | "red" | "slate";
  holdId?: number | string | null;
};

function formatLabel(value?: string | null): string {
  if (!value) return "Not available";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeStaffRole(role?: string | null): string {
  const normalized = String(role || "").trim().toUpperCase();
  if (["CEO", "OWNER", "ROOT"].includes(normalized)) return "SUPER_ADMIN";
  return normalized || "UNKNOWN";
}

function canPerformBookingActions(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN", "SUPPORT"].includes(normalizeStaffRole(role));
}

function PermissionNotice() {
  return (
    <div style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45 }}>
      Your role has read-only access for booking operations. Action buttons are hidden and protected by the backend.
    </div>
  );
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

function formatPerson(user: BasicUser): string {
  if (!user) return "Not assigned";
  return user.name || user.email || "Not assigned";
}

function stringifyPreview(value: unknown): string {
  if (!value) return "Not available";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getAuditRows(payload: unknown): BookingAuditEntry[] {
  if (Array.isArray(payload)) return payload as BookingAuditEntry[];
  if (!payload || typeof payload !== "object") return [];

  const data = payload as {
    items?: BookingAuditEntry[];
    audit_log?: BookingAuditEntry[];
    auditLogs?: BookingAuditEntry[];
    logs?: BookingAuditEntry[];
    data?: BookingAuditEntry[];
  };

  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.audit_log)) return data.audit_log;
  if (Array.isArray(data.auditLogs)) return data.auditLogs;
  if (Array.isArray(data.logs)) return data.logs;
  if (Array.isArray(data.data)) return data.data;

  return [];
}

function getAuditActor(audit: BookingAuditEntry): string {
  if (audit.actor_user) return formatPerson(audit.actor_user);
  if (audit.actor) return formatPerson(audit.actor);
  if (audit.actor_user_id) return `Staff/User #${audit.actor_user_id}`;
  return "System";
}

function getAuditMetadataPreview(audit: BookingAuditEntry): string {
  if (audit.meta_summary) return audit.meta_summary;
  if (audit.metadata_json) return stringifyPreview(audit.metadata_json);
  if (audit.metadata) return stringifyPreview(audit.metadata);
  return "No metadata preview";
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="booking-card" style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)", overflow: "hidden", minWidth: 0 }}>
      <div className="booking-card-head" style={{ padding: "16px 18px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
        <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18, letterSpacing: "-0.02em" }}>{title}</h2>
        {description ? <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{description}</p> : null}
      </div>
      <div className="booking-card-body" style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ border: "1px dashed #bfdbfe", background: "#f8fbff", borderRadius: 18, padding: 22, textAlign: "center" }}>
      <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{title}</h3>
      <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 460 }}>{description}</p>
    </div>
  );
}


function ToastMessage({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  const isSuccess = type === "success";
  return (
    <div style={{ border: `1px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`, background: isSuccess ? "#ecfdf5" : "#fff7f7", color: isSuccess ? "#047857" : "#991b1b", borderRadius: 16, padding: 14, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 850, overflowWrap: "anywhere" }}>{message}</p>
      <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", fontWeight: 700, fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

function ConfirmDialog({ action, reason, loading, onReasonChange, onCancel, onConfirm }: { action: PendingAction; reason: string; loading: boolean; onReasonChange: (value: string) => void; onCancel: () => void; onConfirm: () => void }) {
  const isDanger = action.tone === "red";
  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 18, background: "rgba(15, 23, 42, 0.42)" }}>
      <section style={{ width: "100%", maxWidth: 520, border: `1px solid ${isDanger ? "#fecaca" : "#bfdbfe"}`, background: "#ffffff", borderRadius: 22, boxShadow: "0 28px 80px rgba(15, 23, 42, 0.24)", overflow: "hidden" }}>
        <div style={{ padding: 20, borderBottom: "1px solid #e2e8f0", background: isDanger ? "#fff7f7" : "#f8fbff" }}>
          <p style={{ margin: 0, color: isDanger ? "#b91c1c" : "#2563eb", fontSize: 12, fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" }}>Confirm action</p>
          <h2 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: 21, letterSpacing: "-0.03em" }}>{action.title}</h2>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.55 }}>{action.description}</p>
        </div>
        <div style={{ padding: 20, display: "grid", gap: 14 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "#334155", fontSize: 13, fontWeight: 700 }}>Reason / internal note</span>
            <textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Add a short reason for audit log..." rows={4} style={{ width: "100%", resize: "vertical", border: "1px solid #cbd5e1", borderRadius: 14, padding: 12, color: "#0f172a", outline: "none", font: "inherit", fontSize: 14, lineHeight: 1.5 }} />
          </label>
          <div style={{ border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45 }}>
            This action does not hard delete anything. Important booking changes will be recorded in audit logs.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={onCancel} disabled={loading} style={{ ...secondaryButtonStyle, color: "#475569", borderColor: "#cbd5e1" }}>Cancel</button>
            <button type="button" onClick={onConfirm} disabled={loading} style={{ ...primaryButtonStyle, background: isDanger ? "#dc2626" : "#2563eb", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.75 : 1 }}>{loading ? "Processing..." : action.confirmLabel}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionButton({ children, tone = "blue", onClick, disabled }: { children: React.ReactNode; tone?: "blue" | "green" | "red" | "slate"; onClick: () => void; disabled?: boolean }) {
  const styles = {
    blue: { border: "#bfdbfe", bg: "#eff6ff", color: "#2563eb" },
    green: { border: "#bbf7d0", bg: "#ecfdf5", color: "#047857" },
    red: { border: "#fecaca", bg: "#fff7f7", color: "#b91c1c" },
    slate: { border: "#cbd5e1", bg: "#ffffff", color: "#475569" },
  }[tone];
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ border: `1px solid ${styles.border}`, borderRadius: 999, background: styles.bg, color: styles.color, padding: "10px 13px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.65 : 1 }}>
      {children}
    </button>
  );
}


function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  const displayValue =
    value === null || value === undefined || value === "" ? "Not available" : value;

  return (
    <div style={{ minWidth: 0, border: "1px solid #e2e8f0", background: "#f8fbff", borderRadius: 14, padding: 14 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <div style={{ marginTop: 7, color: "#0f172a", fontSize: 14, fontWeight: 500, overflowWrap: "anywhere", minWidth: 0 }}>
        {typeof displayValue === "string" || typeof displayValue === "number" || typeof displayValue === "boolean" ? String(displayValue) : displayValue}
      </div>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 18, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Could not load this section</p>
      <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>{message}</p>
      {onRetry ? <button type="button" onClick={onRetry} style={{ ...secondaryButtonStyle, marginTop: 12, color: "#991b1b", borderColor: "#fecaca" }}>Retry</button> : null}
    </div>
  );
}

function LoadingScreen() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", color: "#0f172a", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 42, height: 42, margin: "0 auto 16px", borderRadius: "50%", border: "4px solid #dbeafe", borderTopColor: "#2563eb" }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Loading booking detail...</p>
      </div>
    </main>
  );
}

function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", color: "#0f172a", padding: "24px clamp(16px, 3vw, 32px)" }}>
      <div style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
        <Link href="/bookings" style={backLinkStyle}>Back to bookings</Link>
        <section style={{ marginTop: 18, border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 20, padding: 22 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{message}</p>
          {onRetry ? <button type="button" onClick={onRetry} style={{ ...secondaryButtonStyle, marginTop: 16, color: "#991b1b", borderColor: "#fecaca" }}>Retry</button> : null}
        </section>
      </div>
    </main>
  );
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<BookingAuditEntry[]>([]);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadAuditLog() {
    const token = getToken();
    if (!token || !bookingId) return;

    setAuditLoading(true);
    setAuditError(null);

    try {
      const response = await fetch(`${API_BASE}/ops/bookings/${bookingId}/audit-log`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        let message = "Booking audit log could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message || "Booking audit log could not load");
      }

      const data = await response.json();
      setAuditLogs(getAuditRows(data));
    } catch (err) {
      setAuditLogs([]);
      setAuditError(err instanceof Error ? err.message : "Booking audit log could not load");
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadDetail() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!bookingId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setAuditError(null);
    setAuditLogs([]);
    setNotFound(false);

    try {
      const staffResponse = await fetch(`${API_BASE}/ops/me`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (staffResponse.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (staffResponse.ok) {
        const staffData = (await staffResponse.json()) as StaffMe;
        setStaffRole(normalizeStaffRole(staffData.role));
      } else {
        setStaffRole(null);
      }

      const response = await fetch(`${API_BASE}/ops/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (response.status === 404) {
        setNotFound(true);
        setDetail(null);
        return;
      }

      if (!response.ok) {
        let message = "Booking detail could not load";
        try {
          const body = await response.json();
          message = body?.detail || body?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message || "Booking detail could not load");
      }

      const data = (await response.json()) as BookingDetail;
      setDetail(data);
      void loadAuditLog();
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : "Booking detail could not load");
    } finally {
      setLoading(false);
    }
  }

  function openAction(action: PendingAction) {
    setPendingAction(action);
    setActionReason("");
    setActionError(null);
    setActionSuccess(null);
  }

  async function runBookingAction() {
    if (!pendingAction || !bookingId) return;
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!canPerformBookingActions(staffRole)) {
      setActionError("Your role has read-only access. Booking actions are not allowed.");
      setPendingAction(null);
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      let path = "";
      let method = "POST";
      let body: Record<string, unknown> = {};
      const reason = actionReason.trim();

      if (pendingAction.key === "confirm") {
        path = `/ops/bookings/${bookingId}/status`;
        method = "PATCH";
        body = { status: "confirmed", reason };
      } else if (pendingAction.key === "complete") {
        path = `/ops/bookings/${bookingId}/status`;
        method = "PATCH";
        body = { status: "completed", reason };
      } else if (pendingAction.key === "cancel") {
        path = `/ops/bookings/${bookingId}/cancel`;
        body = { reason };
      } else if (pendingAction.key === "note") {
        path = `/ops/bookings/${bookingId}/internal-note`;
        body = { note: reason, reason };
      } else if (pendingAction.key === "release_hold") {
        path = `/ops/slot-holds/${pendingAction.holdId}/release`;
        body = { reason };
      }

      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (response.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        let message = "Action failed";
        try {
          const payload = await response.json();
          message = payload?.detail || payload?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message || "Action failed");
      }

      const payload = await response.json().catch(() => null);
      const message = payload?.message || `${pendingAction.title} completed successfully`;
      setActionSuccess(message);
      setPendingAction(null);
      setActionReason("");
      await loadDetail();
      await loadAuditLog();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyMeetLink() {
    const meetLink = detail?.meeting?.meet_link;
    if (!meetLink) {
      setActionError("Meet link is not available for this booking.");
      return;
    }

    try {
      await navigator.clipboard.writeText(meetLink);
      setActionSuccess("Meet link copied successfully.");
      setActionError(null);
    } catch {
      setActionError("Could not copy meet link. Please copy it manually.");
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const booking = detail?.booking;
  const title = booking?.title || detail?.profile?.title || detail?.event_type?.title || `Booking #${bookingId}`;
  const orgTeam = useMemo(() => [detail?.organization?.name, detail?.team?.name].filter(Boolean).join(" / ") || "Personal booking", [detail]);
  const canManageBookingActions = canPerformBookingActions(staffRole);

  if (loading) return <LoadingScreen />;
  if (notFound) return <ErrorState title="Booking not found" message="This booking does not exist or is not available in admin operations." />;
  if (error) return <ErrorState title="Booking detail could not load" message={error} onRetry={loadDetail} />;
  if (!detail) return <ErrorState title="Booking detail unavailable" message="No booking detail was returned from the server." onRetry={loadDetail} />;

  return (
    <main style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", overflowX: "hidden", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", color: "#0f172a" }}>
      <div className="booking-page-wrap" style={{ width: "100%", maxWidth: 1920, minWidth: 0, margin: "0 auto", padding: "clamp(18px, 1.45vw, 36px)" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ minWidth: 0 }}>
            <Link href="/bookings" style={backLinkStyle}>Back to bookings</Link>
            <p style={{ margin: "18px 0 8px", color: "#2563eb", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Booking Detail</p>
            <h1 style={{ margin: 0, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, letterSpacing: "-0.045em", overflowWrap: "anywhere" }}>{title}</h1>
            <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>Read-only operational view for booking #{booking?.id || detail.id || bookingId}.</p>
          </div>
          {/* <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <BookingStatusBadge status={booking?.status} />
            <span style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "8px 11px", fontSize: 12, fontWeight: 700 }}>{formatLabel(detail.meeting?.mode)}</span>
          </div> */}
        </header>

        {(actionSuccess || actionError) ? (
          <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
            {actionSuccess ? <ToastMessage type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} /> : null}
            {actionError ? <ToastMessage type="error" message={actionError} onClose={() => setActionError(null)} /> : null}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 420px)", gap: "clamp(18px, 1vw, 26px)", alignItems: "start" }} className="booking-detail-grid">
          <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
            <Card title="Booking summary" description="Core booking timing and ownership context.">
              <div style={detailGridStyle}>
                <DetailRow label="Booking ID" value={booking?.id || detail.id || bookingId} />
                {/* <DetailRow label="Status" value={<BookingStatusBadge status={booking?.status} />} /> */}
                <DetailRow label="Start time" value={formatDateTime(booking?.start_time)} />
                <DetailRow label="End time" value={formatDateTime(booking?.end_time)} />
                <DetailRow label="Timezone" value={booking?.timezone || "Not available"} />
                <DetailRow label="Guest timezone" value={booking?.guest_timezone || "Not available"} />
                <DetailRow label="Created at" value={formatDateTime(booking?.created_at)} />
                <DetailRow label="Updated at" value={formatDateTime(booking?.updated_at)} />
              </div>
              <div style={{ marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                {/* <p style={{ margin: "0 0 10px", color: "#334155", fontSize: 13, fontWeight: 950 }}>Status actions</p> */}
                {canManageBookingActions ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <ActionButton tone="blue" onClick={() => openAction({ key: "confirm", title: "Mark booking confirmed", description: "This will update the booking status to confirmed if the current status transition is allowed.", confirmLabel: "Mark confirmed", tone: "blue" })}>Mark confirmed</ActionButton>
                    <ActionButton tone="green" onClick={() => openAction({ key: "complete", title: "Mark booking completed", description: "This will update the booking status to completed if the current status transition is allowed.", confirmLabel: "Mark completed", tone: "green" })}>Mark completed</ActionButton>
                  </div>
                ) : (
                  <PermissionNotice />
                )}
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "clamp(18px, 1vw, 26px)" }} className="two-card-grid">
              <Card title="Guest card">
                <div style={{ display: "grid", gap: 16 }}>
                  <DetailRow label="Name" value={detail.guest?.name || "Guest"} />
                  <DetailRow label="Email" value={detail.guest?.email || "Email not available"} />
                  <DetailRow label="RSVP data" value={detail.rsvp?.available ? "Available" : "Not available"} />
                </div>
              </Card>

              <Card title="Host card">
                <div style={{ display: "grid", gap: 16 }}>
                  <DetailRow label="Host" value={formatPerson(detail.host_user)} />
                  <DetailRow label="Host email" value={detail.host_user?.email || "Not available"} />
                  <DetailRow label="Assigned user" value={formatPerson(detail.assigned_user)} />
                </div>
              </Card>
            </div>

            <Card title="Meeting details" description="Meeting mode, link, location, profile, and event type mapping.">
              <div style={detailGridStyle}>
                <DetailRow label="Meeting mode" value={formatLabel(detail.meeting?.mode)} />
                <DetailRow label="Meet link" value={detail.meeting?.meet_link ? <a href={detail.meeting.meet_link} target="_blank" rel="noreferrer" style={inlineLinkStyle}>Open meeting link</a> : "Not available"} />
                <DetailRow label="Location" value={detail.meeting?.location || "Not available"} />
                <DetailRow label="Google event ID" value={detail.meeting?.google_event_id || "Not available"} />
                <DetailRow label="Profile" value={detail.profile?.title || detail.profile?.slug || "Not available"} />
                <DetailRow label="Profile duration" value={detail.profile?.duration_minutes ? `${detail.profile.duration_minutes} min` : "Not available"} />
                <DetailRow label="Event type" value={detail.event_type?.title || detail.event_type?.slug || "Not available"} />
                <DetailRow label="Event kind" value={formatLabel(detail.event_type?.event_kind)} />
                <DetailRow label="Org / Team" value={orgTeam} />
              </div>
              <div style={{ marginTop: 16, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                <ActionButton tone="blue" disabled={!detail.meeting?.meet_link} onClick={copyMeetLink}>Copy meet link</ActionButton>
              </div>
            </Card>

            <Card title="Timeline card" description="Quick operational timeline from booking lifecycle fields.">
              <div style={timelineStyle}>
                <TimelineItem title="Booking created" value={formatDateTime(booking?.created_at)} />
                <TimelineItem title="Meeting starts" value={formatDateTime(booking?.start_time)} />
                <TimelineItem title="Meeting ends" value={formatDateTime(booking?.end_time)} />
                <TimelineItem title="Last updated" value={formatDateTime(booking?.updated_at)} />
              </div>
            </Card>
          </div>

          <aside style={{ display: "grid", gap: 18, alignContent: "start", minWidth: 0 }}>
            <Card title="Reschedule details">
              <div style={{ display: "grid", gap: 14 }}>
                <DetailRow label="Reschedule count" value={detail.reschedule?.count ?? 0} />
                <DetailRow label="Last rescheduled" value={formatDateTime(detail.reschedule?.last_rescheduled_at)} />
                <DetailRow label="From booking ID" value={detail.reschedule?.rescheduled_from_booking_id || "Not available"} />
                {detail.reschedule?.requests?.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {detail.reschedule.requests.map((request) => (
                      <MiniRecord key={String(request.id)} title={`Request #${request.id || "N/A"}`} meta={`${formatLabel(request.state)} · ${formatDateTime(request.created_at)}`} description={`Created by ${formatPerson(request.created_by)}`} />
                    ))}
                  </div>
                ) : <EmptyState title="No reschedule requests" description="No related reschedule request records are linked to this booking." />}
              </div>
            </Card>

            <Card title="Slot hold details">
              {detail.slot_holds?.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {detail.slot_holds.map((hold) => {
                    const expired = hold.expires_at ? new Date(hold.expires_at).getTime() <= Date.now() : !hold.is_active;
                    return (
                      <div key={String(hold.id)} style={{ display: "grid", gap: 8 }}>
                        <MiniRecord title={`Hold #${hold.id || "N/A"}`} meta={`${hold.is_active ? "Active" : "Expired"} · Expires ${formatDateTime(hold.expires_at)}`} description={`${formatDateTime(hold.start_time)} → ${formatDateTime(hold.end_time)}`} />
                        {canManageBookingActions ? (
                          <ActionButton tone="slate" disabled={!expired || !hold.id} onClick={() => openAction({ key: "release_hold", holdId: hold.id, title: `Release slot hold #${hold.id || "N/A"}`, description: "This will release or acknowledge an expired slot hold if the backend supports release fields. Active holds are not released from this UI.", confirmLabel: "Release hold", tone: "slate" })}>Release expired hold</ActionButton>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : <EmptyState title="No slot holds" description="No slot hold record is linked to this booking." />}
            </Card>

            <Card title="Support card" description="Add a read-only internal support note to the booking audit history.">
              <div style={{ display: "grid", gap: 12 }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>Internal notes are stored for admin/support context. No guest-facing message is sent from this action.</p>
                {canManageBookingActions ? (
                  <ActionButton tone="blue" onClick={() => openAction({ key: "note", title: "Add internal support note", description: "This will add your note to the booking audit trail without editing booking timing or deleting data.", confirmLabel: "Add note", tone: "blue" })}>Add internal note</ActionButton>
                ) : (
                  <PermissionNotice />
                )}
              </div>
            </Card>

            <Card title="Danger zone" description="Controlled risky support actions. No hard delete is available.">
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 14, padding: 12, fontSize: 13, lineHeight: 1.45 }}>
                  Cancelling a booking is a business-impacting action. Use only after verification and provide a clear reason.
                </div>
                {canManageBookingActions ? (
                  <ActionButton tone="red" onClick={() => openAction({ key: "cancel", title: "Cancel booking", description: "This will mark the booking as cancelled if the current status transition is allowed. It will not hard delete the booking.", confirmLabel: "Cancel booking", tone: "red" })}>Cancel booking</ActionButton>
                ) : (
                  <PermissionNotice />
                )}
              </div>
            </Card>

            <Card title="Audit activity" description="Newest booking audit log entries with actor, timing changes, and metadata preview.">
              {auditLoading ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} style={{ height: 78, borderRadius: 16, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
                  ))}
                </div>
              ) : auditError ? (
                <InlineError message={auditError} onRetry={loadAuditLog} />
              ) : auditLogs.length ? (
                <AuditTimeline entries={auditLogs} />
              ) : detail.audit_log_summary?.length ? (
                <AuditTimeline entries={detail.audit_log_summary} />
              ) : (
                <EmptyState title="No audit activity" description="Audit entries will appear here once booking events are logged." />
              )}
            </Card>
          </aside>
        </div>
      </div>

      {pendingAction ? (
        <ConfirmDialog
          action={pendingAction}
          reason={actionReason}
          loading={actionLoading}
          onReasonChange={setActionReason}
          onCancel={() => {
            if (!actionLoading) {
              setPendingAction(null);
              setActionReason("");
              setActionError(null);
            }
          }}
          onConfirm={runBookingAction}
        />
      ) : null}

      <style jsx>{`

      @media (min-width: 1800px) {
        .booking-page-wrap {
          max-width: 1880px !important;
          padding-left: 28px !important;
          padding-right: 28px !important;
        }

        .booking-detail-grid {
          grid-template-columns: minmax(0, 1fr) 400px !important;
          gap: 24px !important;
          align-items: start;
        }

        .booking-card :global(h2) {
          font-size: 17px !important;
        }

        .booking-card-head {
          padding: 15px 17px !important;
        }

        .booking-card-body {
          padding: 17px !important;
        }
      }

      @media (min-width: 2400px) {
        .booking-page-wrap {
          max-width: 1960px !important;
        }

        .booking-detail-grid {
          grid-template-columns: minmax(0, 1fr) 420px !important;
        }
      }

      @media (max-width: 1180px) {
        .booking-detail-grid {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 760px) {
        .two-card-grid {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 640px) {
        .booking-page-wrap {
          padding: 14px !important;
        }

        main :global(section) {
          border-radius: 16px !important;
        }

        main :global(h1) {
          font-size: 24px !important;
        }
      }
`}</style>
    </main>
  );
}

function AuditTimeline({ entries }: { entries: BookingAuditEntry[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {entries.map((audit, index) => {
        const oldTime = [formatDateTime(audit.old_start_time), formatDateTime(audit.old_end_time)].filter((value) => value !== "Not available").join(" → ");
        const newTime = [formatDateTime(audit.new_start_time), formatDateTime(audit.new_end_time)].filter((value) => value !== "Not available").join(" → ");

        return (
          <article key={String(audit.id || `${audit.action || "audit"}-${audit.created_at || index}`)} style={{ position: "relative", display: "grid", gap: 10, border: "1px solid #e2e8f0", background: "#f8fbff", borderRadius: 16, padding: 14, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: "#2563eb", marginTop: 5, flex: "0 0 auto", boxShadow: "0 0 0 5px #dbeafe" }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, color: "#0f172a", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{formatLabel(audit.action)}</p>
                <p style={{ margin: "5px 0 0", color: "#2563eb", fontSize: 12, fontWeight: 850, overflowWrap: "anywhere" }}>{getAuditActor(audit)} · {formatDateTime(audit.created_at)}</p>
              </div>
            </div>

            {(oldTime || newTime) ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 10 }}>
                <AuditValue label="Old value" value={oldTime || "Not available"} />
                <AuditValue label="New value" value={newTime || "Not available"} />
              </div>
            ) : null}

            <div style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 14, padding: 11, minWidth: 0 }}>
              <p style={{ margin: 0, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Metadata preview</p>
              <p style={{ margin: "6px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere", wordBreak: "break-word" }}>{getAuditMetadataPreview(audit)}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AuditValue({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 14, padding: 10, minWidth: 0 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: "6px 0 0", color: "#0f172a", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}

function TimelineItem({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
      <div style={{ width: 10, height: 10, borderRadius: 999, background: "#2563eb", marginTop: 5, flex: "0 0 auto", boxShadow: "0 0 0 5px #dbeafe" }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, color: "#0f172a", fontSize: 14, fontWeight: 700 }}>{title}</p>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13, overflowWrap: "anywhere" }}>{value}</p>
      </div>
    </div>
  );
}

function MiniRecord({ title, meta, description }: { title: string; meta: string; description: string }) {
  return (
    <article style={{ border: "1px solid #e2e8f0", background: "#f8fbff", borderRadius: 16, padding: 13, minWidth: 0 }}>
      <p style={{ margin: 0, color: "#0f172a", fontSize: 14, fontWeight: 700, overflowWrap: "anywhere" }}>{title}</p>
      <p style={{ margin: "5px 0 0", color: "#2563eb", fontSize: 12, fontWeight: 850, overflowWrap: "anywhere" }}>{meta}</p>
      <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>{description}</p>
    </article>
  );
}

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: 14,
};

const timelineStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #bfdbfe",
  background: "#ffffff",
  color: "#2563eb",
  textDecoration: "none",
  borderRadius: 999,
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 700,
};

const primaryButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 999,
  background: "#2563eb",
  color: "#ffffff",
  padding: "10px 14px",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  borderRadius: 999,
  background: "#ffffff",
  color: "#2563eb",
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const inlineLinkStyle: React.CSSProperties = {
  color: "#2563eb",
  fontWeight: 700,
  textDecoration: "none",
  overflowWrap: "anywhere",
};
