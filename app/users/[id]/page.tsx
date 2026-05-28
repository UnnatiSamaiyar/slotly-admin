"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  clearToken,
  getOpsUserDetail,
  getOpsUserBookings,
  getOpsUserEventTypes,
  getOpsUserBookingProfiles,
  getOpsUserContacts,
  getOpsUserOrganizations,
  getOpsUserTeams,
  getOpsUserNotifications,
  updateOpsUserStatus,
  forceLogoutOpsUser,
  clearOpsUserGoogleToken,
  triggerOpsUserPasswordReset,
  getToken,
  type OpsUserDetail,
  type RecentActivity,
  type UserBooking,
  type UserEventType,
  type UserBookingProfile,
  type UserContact,
  type UserOrganizationMembership,
  type UserTeamMembership,
  type UserNotification,
} from "../../../lib/api";

type StatCard = {
  title: string;
  value: number;
  description: string;
  tone: "blue" | "green" | "indigo" | "slate";
};

type UserActionKey = "activate" | "deactivate" | "forceLogout" | "clearGoogleToken" | "passwordReset";

type PendingUserAction = {
  key: UserActionKey;
  title: string;
  description: string;
  confirmLabel: string;
  tone: "blue" | "red" | "amber";
};

type TabErrorState = {
  bookings?: string;
  eventTypes?: string;
  bookingProfiles?: string;
  contacts?: string;
  enterprise?: string;
  notifications?: string;
};


function getActionConfig(key: UserActionKey): PendingUserAction {
  const configs: Record<UserActionKey, PendingUserAction> = {
    activate: {
      key: "activate",
      title: "Activate user",
      description: "This will restore the user's active status. The user may be able to access the platform again depending on normal login rules.",
      confirmLabel: "Activate user",
      tone: "blue",
    },
    deactivate: {
      key: "deactivate",
      title: "Deactivate user",
      description: "This will mark the user as inactive. It is a reversible support action and does not delete any user data.",
      confirmLabel: "Deactivate user",
      tone: "red",
    },
    forceLogout: {
      key: "forceLogout",
      title: "Force logout",
      description: "This will invalidate future supported sessions for this user where backend session invalidation is available.",
      confirmLabel: "Force logout",
      tone: "amber",
    },
    clearGoogleToken: {
      key: "clearGoogleToken",
      title: "Clear Google token",
      description: "This will remove the stored Google refresh token connection. The user may need to reconnect Google Calendar.",
      confirmLabel: "Clear Google token",
      tone: "red",
    },
    passwordReset: {
      key: "passwordReset",
      title: "Trigger password reset",
      description: "This will trigger the configured password reset support flow without exposing the user's password.",
      confirmLabel: "Trigger reset",
      tone: "amber",
    },
  };

  return configs[key];
}

const toneStyles = {
  blue: { border: "#bfdbfe", bg: "#eff6ff", color: "#2563eb" },
  green: { border: "#bbf7d0", bg: "#ecfdf5", color: "#047857" },
  indigo: { border: "#c7d2fe", bg: "#eef2ff", color: "#4f46e5" },
  slate: { border: "#e2e8f0", bg: "#f8fafc", color: "#475569" },
};

function formatNumber(value?: number | null): string {
  const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN").format(safe);
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
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "User";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getNumber(user: OpsUserDetail | null, keys: Array<keyof OpsUserDetail>, countKeys: string[] = []): number {
  if (!user) return 0;

  for (const key of keys) {
    const value = user[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }

  const counts = user.counts as Record<string, unknown> | undefined;
  if (counts) {
    for (const key of countKeys) {
      const value = counts[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }

  return 0;
}

function getGoogleConnected(user: OpsUserDetail): boolean {
  return Boolean(
    user.google_connected ||
      user.googleConnected ||
      user.has_google_connection ||
      user.hasGoogleConnection ||
      String(user.auth_provider || user.authProvider || "").toLowerCase() === "google",
  );
}

function getActivityStaff(activity: RecentActivity): string {
  const staffUser = activity.staffUser || activity.staff_user;
  if (typeof staffUser === "string") return staffUser;
  return staffUser?.name || staffUser?.email || activity.staffName || activity.staff_name || activity.staffEmail || activity.staff_email || "System";
}

function getActivityMeta(activity: RecentActivity): string {
  const summary = activity.metaSummary || activity.meta_summary;
  if (summary) return summary;
  if (!activity.meta) return "No metadata available";
  try {
    return JSON.stringify(activity.meta).slice(0, 140);
  } catch {
    return "Metadata unavailable";
  }
}

function getNotificationRead(notification: UserNotification): boolean {
  return Boolean(notification.isRead ?? notification.is_read);
}

function getNotificationSent(notification: UserNotification): boolean {
  return Boolean(notification.isSent ?? notification.is_sent);
}

function getNotificationMeta(notification: UserNotification): string {
  return notification.metadataPreview || notification.metadata_preview || "No metadata available";
}

function Badge({ children, tone = "blue" }: { children: string; tone?: keyof typeof toneStyles }) {
  const style = toneStyles[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${style.border}`, background: style.bg, color: style.color, borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function StatCardView({ card }: { card: StatCard }) {
  const style = toneStyles[card.tone];
  return (
    <article style={{ minWidth: 0, border: `1px solid ${style.border}`, background: "#ffffff", borderRadius: 18, padding: 18, boxShadow: "0 12px 35px rgba(15, 23, 42, 0.06)" }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 13, fontWeight: 800 }}>{card.title}</p>
      <p style={{ margin: "10px 0 0", color: "#0f172a", fontSize: 28, lineHeight: 1, fontWeight: 900, letterSpacing: "-0.04em" }}>{formatNumber(card.value)}</p>
      <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.45 }}>{card.description}</p>
    </article>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)" }}>
        <h2 style={{ margin: 0, color: "#0f172a", fontSize: 18, letterSpacing: "-0.02em" }}>{title}</h2>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>{description}</p>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </section>
  );
}

function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ textAlign: "center", padding: 28 }}>
      <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{title}</h3>
      <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 440, lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

function SectionErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 16, padding: 18 }}>
      <h3 style={{ margin: 0, color: "#7f1d1d", fontSize: 16 }}>{title}</h3>
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, overflowWrap: "anywhere" }}>{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} style={{ marginTop: 14, border: "1px solid #fecaca", background: "#ffffff", color: "#991b1b", borderRadius: 999, padding: "9px 12px", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>Retry</button>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0, border: "1px solid #e2e8f0", background: "#f8fbff", borderRadius: 14, padding: 14 }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p title={value} style={{ margin: "7px 0 0", color: "#0f172a", fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
    </div>
  );
}


function getDuration(value?: number | null): string {
  const minutes = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return minutes > 0 ? `${minutes} min` : "Not set";
}

function getBoolLabel(value?: boolean | null): string {
  return value ? "Enabled" : "Disabled";
}

function UserEventTypesTab({ eventTypes, loading }: { eventTypes: UserEventType[]; loading: boolean }) {
  return (
    <SectionCard title="Event Types" description="Read-only scheduling templates created by this user.">
      {loading ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
          ))}
        </div>
      ) : eventTypes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No event types found</h3>
          <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>This user has not created any event types yet.</p>
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                {["Title", "Slug", "Duration", "Meeting Mode", "Type", "Status", "Org/Team", "Capacity", "Waitlist"].map((header) => (
                  <th key={header} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventTypes.map((eventType) => {
                const title = eventType.title || "Untitled event";
                const slug = eventType.slug || "No slug";
                const duration = eventType.durationMinutes ?? eventType.duration;
                const eventKind = eventType.eventKind || eventType.event_kind || "one_on_one";
                const active = eventType.active ?? eventType.is_active ?? true;
                const capacity = eventType.capacity ?? eventType.groupCapacity ?? eventType.group_capacity;
                const waitlist = eventType.waitlist ?? eventType.allowWaitlist ?? eventType.allow_waitlist ?? false;
                const orgTeam = [eventType.organization || eventType.org, eventType.team].filter(Boolean).join(" / ") || "Personal";
                return (
                  <tr key={String(eventType.id || slug)} style={{ borderBottom: "1px solid #eef2f7" }}>
                    <td title={title} style={{ padding: "14px", color: "#0f172a", fontWeight: 900, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</td>
                    <td title={slug} style={{ padding: "14px", color: "#64748b", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slug}</td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{getDuration(duration)}</td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{formatLabel(eventType.meetingMode || eventType.meeting_mode)}</td>
                    <td style={{ padding: "14px" }}><Badge tone={String(eventKind).toLowerCase().includes("group") ? "indigo" : "blue"}>{formatLabel(eventKind)}</Badge></td>
                    <td style={{ padding: "14px" }}><Badge tone={active ? "green" : "slate"}>{active ? "Active" : "Inactive"}</Badge></td>
                    <td title={orgTeam} style={{ padding: "14px", color: "#334155", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orgTeam}</td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{capacity ?? "Not set"}</td>
                    <td style={{ padding: "14px" }}><Badge tone={waitlist ? "green" : "slate"}>{getBoolLabel(waitlist)}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function UserBookingProfilesTab({ profiles, loading }: { profiles: UserBookingProfile[]; loading: boolean }) {
  return (
    <SectionCard title="Booking Profiles" description="Read-only availability and scheduling profile setup for this user.">
      {loading ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No booking profiles found</h3>
          <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>This user does not have any booking profiles configured yet.</p>
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1040, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                {["Title", "Slug", "Duration", "Timezone", "Active", "Buffer Before", "Buffer After", "Min Notice", "Max Days Ahead"].map((header) => (
                  <th key={header} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const title = profile.title || "Untitled profile";
                const slug = profile.slug || "No slug";
                const duration = profile.durationMinutes ?? profile.duration_minutes ?? profile.duration;
                const active = profile.active ?? profile.is_active ?? true;
                const bufferBefore = profile.bufferBeforeMinutes ?? profile.bufferBefore ?? profile.buffer_before_minutes ?? 0;
                const bufferAfter = profile.bufferAfterMinutes ?? profile.bufferAfter ?? profile.buffer_after_minutes ?? 0;
                const minNotice = profile.minNoticeMinutes ?? profile.minNotice ?? profile.min_notice_minutes ?? 0;
                const maxDaysAhead = profile.maxDaysAhead ?? profile.max_days_ahead ?? 0;
                return (
                  <tr key={String(profile.id || slug)} style={{ borderBottom: "1px solid #eef2f7" }}>
                    <td title={title} style={{ padding: "14px", color: "#0f172a", fontWeight: 900, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</td>
                    <td title={slug} style={{ padding: "14px", color: "#64748b", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slug}</td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{getDuration(duration)}</td>
                    <td title={profile.timezone || "Timezone not set"} style={{ padding: "14px", color: "#334155", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.timezone || "Timezone not set"}</td>
                    <td style={{ padding: "14px" }}><Badge tone={active ? "green" : "slate"}>{active ? "Active" : "Inactive"}</Badge></td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{bufferBefore} min</td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{bufferAfter} min</td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{minNotice} min</td>
                    <td style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{maxDaysAhead} days</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}



function UserContactsTab({ contacts, loading }: { contacts: UserContact[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredContacts = query
    ? contacts.filter((contact) =>
        [contact.name, contact.email, contact.phone, contact.company]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
    : contacts;

  return (
    <SectionCard title="Contacts" description="Read-only contact records saved by this user.">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search contacts by name, email, phone, or company"
          style={{ width: "min(100%, 420px)", border: "1px solid #cbd5e1", borderRadius: 14, padding: "11px 13px", color: "#0f172a", background: "#ffffff", outline: "none", fontSize: 13 }}
        />
        <Badge tone="slate">Read only</Badge>
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No contacts found</h3>
          <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>This user has not saved any contacts yet.</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No matching contacts</h3>
          <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>Try a different name, email, phone, or company search.</p>
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                {["Name", "Email", "Phone", "Company", "Created", "Updated"].map((header) => (
                  <th key={header} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => {
                const name = contact.name || "Unnamed contact";
                const email = contact.email || "Email not available";
                const phone = contact.phone || "Not available";
                const company = contact.company || "Not available";
                return (
                  <tr key={String(contact.id || email)} style={{ borderBottom: "1px solid #eef2f7" }}>
                    <td title={name} style={{ padding: "14px", color: "#0f172a", fontWeight: 900, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</td>
                    <td title={email} style={{ padding: "14px", color: "#334155", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</td>
                    <td title={phone} style={{ padding: "14px", color: "#334155", whiteSpace: "nowrap" }}>{phone}</td>
                    <td title={company} style={{ padding: "14px", color: "#334155", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company}</td>
                    <td style={{ padding: "14px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(contact.createdAt || contact.created_at)}</td>
                    <td style={{ padding: "14px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(contact.updatedAt || contact.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}



function UserNotificationsTab({ notifications, loading }: { notifications: UserNotification[]; loading: boolean }) {
  return (
    <SectionCard title="Notifications" description="Read-only notification records for this user.">
      {loading ? (
        <LoadingRows />
      ) : notifications.length === 0 ? (
        <EmptyState title="No notifications found" description="User notifications will appear here when the system creates them." />
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                {["Notification", "Read", "Sent", "Deliver At", "Created At", "Metadata"].map((header) => (
                  <th key={header} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => {
                const isRead = getNotificationRead(notification);
                const isSent = getNotificationSent(notification);
                const metadata = getNotificationMeta(notification);
                return (
                  <tr key={String(notification.id)} style={{ borderBottom: "1px solid #eef2f7" }}>
                    <td style={{ padding: "14px", verticalAlign: "top", maxWidth: 320 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Badge tone="blue">{formatLabel(notification.type)}</Badge>
                      </div>
                      <div title={notification.title || "Untitled notification"} style={{ marginTop: 8, color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notification.title || "Untitled notification"}</div>
                      <div title={notification.message || "No message"} style={{ marginTop: 4, color: "#64748b", fontSize: 12, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{notification.message || "No message"}</div>
                      {notification.actionUrl || notification.action_url ? (
                        <div title={notification.actionUrl || notification.action_url || undefined} style={{ marginTop: 6, color: "#2563eb", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notification.actionUrl || notification.action_url}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: "14px", verticalAlign: "top" }}><Badge tone={isRead ? "green" : "indigo"}>{isRead ? "Read" : "Unread"}</Badge></td>
                    <td style={{ padding: "14px", verticalAlign: "top" }}><Badge tone={isSent ? "green" : "slate"}>{isSent ? "Sent" : "Unsent"}</Badge></td>
                    <td style={{ padding: "14px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDateTime(notification.deliverAt || notification.deliver_at)}</td>
                    <td style={{ padding: "14px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDateTime(notification.createdAt || notification.created_at)}</td>
                    <td title={metadata} style={{ padding: "14px", color: "#64748b", verticalAlign: "top", maxWidth: 260 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{metadata}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function UserEnterpriseTab({ organizations, teams, loading }: { organizations: UserOrganizationMembership[]; teams: UserTeamMembership[]; loading: boolean }) {
  const hasData = organizations.length > 0 || teams.length > 0;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <SectionCard title="Organization Memberships" description="Organizations this user belongs to with role and reporting information.">
        {loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div style={{ textAlign: "center", padding: 28 }}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No organization memberships</h3>
            <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>This user is not linked with any organization yet.</p>
          </div>
        ) : (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                  {["Organization", "Slug", "Role", "Reports To", "Joined"].map((header) => (
                    <th key={header} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => {
                  const name = org.organizationName || org.organization_name || org.name || "Unnamed organization";
                  const role = org.role || "Member";
                  const reportsTo = org.reportsTo || org.reports_to || "Not assigned";
                  return (
                    <tr key={String(org.organizationId || org.organization_id || org.id || name)} style={{ borderBottom: "1px solid #eef2f7" }}>
                      <td title={name} style={{ padding: "14px", color: "#0f172a", fontWeight: 900, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</td>
                      <td title={org.slug || "No slug"} style={{ padding: "14px", color: "#64748b", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.slug || "No slug"}</td>
                      <td style={{ padding: "14px" }}><Badge tone="indigo">{formatLabel(role)}</Badge></td>
                      <td title={reportsTo} style={{ padding: "14px", color: "#334155", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reportsTo}</td>
                      <td style={{ padding: "14px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(org.joinedAt || org.joined_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Team Memberships" description="Teams this user belongs to with organization and team role context.">
        {loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div style={{ textAlign: "center", padding: 28 }}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No team memberships</h3>
            <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>This user is not assigned to any team yet.</p>
          </div>
        ) : (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 860, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                  {["Team", "Slug", "Organization", "Role In Team", "Joined"].map((header) => (
                    <th key={header} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const name = team.teamName || team.team_name || team.name || "Unnamed team";
                  const role = team.roleInTeam || team.role_in_team || team.role || "Member";
                  const organization = team.organization || "Not linked";
                  return (
                    <tr key={String(team.teamId || team.team_id || team.id || name)} style={{ borderBottom: "1px solid #eef2f7" }}>
                      <td title={name} style={{ padding: "14px", color: "#0f172a", fontWeight: 900, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</td>
                      <td title={team.slug || "No slug"} style={{ padding: "14px", color: "#64748b", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.slug || "No slug"}</td>
                      <td title={organization} style={{ padding: "14px", color: "#334155", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{organization}</td>
                      <td style={{ padding: "14px" }}><Badge tone="blue">{formatLabel(role)}</Badge></td>
                      <td style={{ padding: "14px", color: "#64748b", whiteSpace: "nowrap" }}>{formatDateTime(team.joinedAt || team.joined_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {!loading && !hasData ? (
        <section style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 18, padding: 18, color: "#64748b", fontSize: 14 }}>
          Enterprise memberships will appear here when this user is added to organizations or teams.
        </section>
      ) : null}
    </div>
  );
}

function UserBookingsTab({ bookings, loading }: { bookings: UserBooking[]; loading: boolean }) {
  return (
    <SectionCard title="Bookings" description="Read-only booking history for this user.">
      {loading ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No bookings found</h3>
          <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>This user does not have any booking records yet.</p>
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#475569", textAlign: "left" }}>
                {["Guest", "Date & Time", "Status", "Meeting Mode", "Meet Link", "Org/Team", "Created"].map((header) => (
                  <th key={header} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const guestName = booking.guestName || "Guest";
                const guestEmail = booking.guestEmail || "Email not available";
                const timeline = booking.timelineStatus || (booking.startTime && new Date(booking.startTime).getTime() >= Date.now() ? "upcoming" : "past");
                const orgTeam = [booking.organization, booking.team].filter(Boolean).join(" / ") || "Personal";
                return (
                  <tr key={String(booking.bookingId || booking.id)} style={{ borderBottom: "1px solid #eef2f7" }}>
                    <td style={{ padding: "14px", verticalAlign: "top", maxWidth: 260 }}>
                      <div title={guestName} style={{ color: "#0f172a", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guestName}</div>
                      <div title={guestEmail} style={{ marginTop: 4, color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guestEmail}</div>
                    </td>
                    <td style={{ padding: "14px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>
                      <div>{formatDateTime(booking.startTime)}</div>
                      <div style={{ marginTop: 6 }}><Badge tone={timeline === "upcoming" ? "green" : "slate"}>{formatLabel(timeline)}</Badge></div>
                      <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>Ends {formatDateTime(booking.endTime)}</div>
                    </td>
                    <td style={{ padding: "14px", verticalAlign: "top" }}><Badge tone={String(booking.status || "").toLowerCase().includes("cancel") ? "slate" : "blue"}>{formatLabel(booking.status || "Unknown")}</Badge></td>
                    <td style={{ padding: "14px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatLabel(booking.meetingMode)}</td>
                    <td style={{ padding: "14px", verticalAlign: "top", maxWidth: 190 }}>
                      {booking.meetLink ? (
                        <a href={booking.meetLink} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 900, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>Open meet link</a>
                      ) : (
                        <span style={{ color: "#94a3b8", fontWeight: 800 }}>Not available</span>
                      )}
                    </td>
                    <td title={orgTeam} style={{ padding: "14px", color: "#334155", verticalAlign: "top", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{orgTeam}</td>
                    <td style={{ padding: "14px", color: "#334155", verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDateTime(booking.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ border: `1px solid ${active ? "#2563eb" : "#dbeafe"}`, background: active ? "#2563eb" : "#ffffff", color: active ? "#ffffff" : "#2563eb", borderRadius: 999, padding: "10px 14px", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
      {children}
    </button>
  );
}

function ToastMessage({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <div style={{ border: `1px solid ${tone === "success" ? "#bbf7d0" : "#fecaca"}`, background: tone === "success" ? "#ecfdf5" : "#fff7f7", color: tone === "success" ? "#047857" : "#991b1b", borderRadius: 16, padding: "12px 14px", fontSize: 13, fontWeight: 800 }}>
      {message}
    </div>
  );
}

function ConfirmActionDialog({
  action,
  reason,
  busy,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  action: PendingUserAction;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isReasonValid = reason.trim().length >= 3;
  const color = action.tone === "red" ? "#dc2626" : action.tone === "amber" ? "#b45309" : "#2563eb";

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(15, 23, 42, 0.38)", padding: 18 }}>
      <section style={{ width: "100%", maxWidth: 520, border: "1px solid #e2e8f0", background: "#ffffff", borderRadius: 22, boxShadow: "0 24px 70px rgba(15, 23, 42, 0.22)", padding: 22 }}>
        <p style={{ margin: "0 0 8px", color, fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Confirm action</p>
        <h2 style={{ margin: 0, color: "#0f172a", fontSize: 22, letterSpacing: "-0.03em" }}>{action.title}</h2>
        <p style={{ margin: "10px 0 0", color: "#475569", fontSize: 14, lineHeight: 1.6 }}>{action.description}</p>

        <label style={{ display: "grid", gap: 8, marginTop: 18 }}>
          <span style={{ color: "#334155", fontSize: 13, fontWeight: 900 }}>Action reason</span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Example: Customer support verification completed"
            rows={4}
            style={{ width: "100%", resize: "vertical", border: "1px solid #cbd5e1", borderRadius: 14, padding: 12, color: "#0f172a", outline: "none", fontSize: 14, lineHeight: 1.5 }}
          />
        </label>
        <p style={{ margin: "8px 0 0", color: isReasonValid ? "#64748b" : "#b45309", fontSize: 12, lineHeight: 1.5 }}>
          This reason is used as the admin audit message. Minimum 3 characters required.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ border: "1px solid #e2e8f0", background: "#ffffff", color: "#475569", borderRadius: 999, padding: "10px 14px", fontWeight: 900, cursor: busy ? "not-allowed" : "pointer" }}>Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy || !isReasonValid} style={{ border: `1px solid ${color}`, background: busy || !isReasonValid ? "#f1f5f9" : color, color: busy || !isReasonValid ? "#94a3b8" : "#ffffff", borderRadius: 999, padding: "10px 14px", fontWeight: 900, cursor: busy || !isReasonValid ? "not-allowed" : "pointer" }}>
            {busy ? "Processing..." : action.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function DangerZoneCard({
  isActive,
  googleConnected,
  onAction,
}: {
  isActive: boolean;
  googleConnected: boolean;
  onAction: (key: UserActionKey) => void;
}) {
  const actionButton = (label: string, key: UserActionKey, tone: "blue" | "red" | "amber") => {
    const color = tone === "red" ? "#dc2626" : tone === "amber" ? "#b45309" : "#2563eb";
    return (
      <button type="button" onClick={() => onAction(key)} style={{ border: `1px solid ${color}`, background: "#ffffff", color, borderRadius: 999, padding: "10px 13px", fontSize: 13, fontWeight: 900, cursor: "pointer" }}>
        {label}
      </button>
    );
  };

  return (
    <section style={{ marginTop: 20, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 22, padding: 20, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: "0 0 8px", color: "#dc2626", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Danger zone</p>
          <h2 style={{ margin: 0, color: "#7f1d1d", fontSize: 18 }}>Controlled support actions</h2>
          <p style={{ margin: "8px 0 0", color: "#991b1b", fontSize: 13, lineHeight: 1.6, maxWidth: 760 }}>No hard delete, password visibility, or token visibility is available here. Every action requires confirmation and creates an audit log entry.</p>
        </div>
        <Badge tone={isActive ? "green" : "slate"}>{isActive ? "User active" : "User inactive"}</Badge>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
        {isActive ? actionButton("Deactivate user", "deactivate", "red") : actionButton("Activate user", "activate", "blue")}
        {actionButton("Force logout", "forceLogout", "amber")}
        {actionButton("Clear Google token", "clearGoogleToken", googleConnected ? "red" : "amber")}
        {actionButton("Trigger password reset", "passwordReset", "amber")}
      </div>
    </section>
  );
}

function PageLoader() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", color: "#0f172a", padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 42, height: 42, margin: "0 auto 16px", borderRadius: "50%", border: "4px solid #dbeafe", borderTopColor: "#2563eb" }} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Loading user overview...</p>
      </div>
    </main>
  );
}

function ErrorState({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", padding: 24 }}>
      <section style={{ width: "100%", maxWidth: 560, border: "1px solid #fecaca", background: "#fff7f7", color: "#991b1b", borderRadius: 20, padding: 24, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
        <h1 style={{ margin: 0, color: "#7f1d1d", fontSize: 22 }}>{title}</h1>
        <p style={{ margin: "10px 0 20px", fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <button type="button" onClick={onBack} style={{ border: "1px solid #bfdbfe", borderRadius: 999, background: "#ffffff", color: "#2563eb", padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}>Back to users</button>
      </section>
    </main>
  );
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<OpsUserDetail | null>(null);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [eventTypes, setEventTypes] = useState<UserEventType[]>([]);
  const [bookingProfiles, setBookingProfiles] = useState<UserBookingProfile[]>([]);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [organizationsMemberships, setOrganizationsMemberships] = useState<UserOrganizationMembership[]>([]);
  const [teamMemberships, setTeamMemberships] = useState<UserTeamMembership[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "bookings" | "eventTypes" | "bookingProfiles" | "contacts" | "enterprise" | "notifications">("overview");
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [eventTypesLoading, setEventTypesLoading] = useState(true);
  const [bookingProfilesLoading, setBookingProfilesLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [enterpriseLoading, setEnterpriseLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabErrors, setTabErrors] = useState<TabErrorState>({});
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  async function loadUser() {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setBookingsLoading(true);
    setEventTypesLoading(true);
    setBookingProfilesLoading(true);
    setContactsLoading(true);
    setEnterpriseLoading(true);
    setNotificationsLoading(true);
    setError(null);
    setTabErrors({});

    try {
      const detail = await getOpsUserDetail(params.id);
      setUser(detail);

      const results = await Promise.allSettled([
        getOpsUserBookings(params.id, 20),
        getOpsUserEventTypes(params.id, 50),
        getOpsUserBookingProfiles(params.id, 50),
        getOpsUserContacts(params.id, 100),
        Promise.all([getOpsUserOrganizations(params.id, 100), getOpsUserTeams(params.id, 100)]),
        getOpsUserNotifications(params.id, 100),
      ]);

      const unauthorizedTab = results.find(
        (result) => result.status === "rejected" && result.reason instanceof Error && result.reason.message === "Unauthorized",
      );
      if (unauthorizedTab) {
        clearToken();
        router.replace("/login");
        return;
      }

      const nextTabErrors: TabErrorState = {};

      if (results[0].status === "fulfilled") setBookings(results[0].value);
      else {
        setBookings([]);
        nextTabErrors.bookings = results[0].reason instanceof Error ? results[0].reason.message : "Bookings could not load.";
      }

      if (results[1].status === "fulfilled") setEventTypes(results[1].value);
      else {
        setEventTypes([]);
        nextTabErrors.eventTypes = results[1].reason instanceof Error ? results[1].reason.message : "Event types could not load.";
      }

      if (results[2].status === "fulfilled") setBookingProfiles(results[2].value);
      else {
        setBookingProfiles([]);
        nextTabErrors.bookingProfiles = results[2].reason instanceof Error ? results[2].reason.message : "Booking profiles could not load.";
      }

      if (results[3].status === "fulfilled") setContacts(results[3].value);
      else {
        setContacts([]);
        nextTabErrors.contacts = results[3].reason instanceof Error ? results[3].reason.message : "Contacts could not load.";
      }

      if (results[4].status === "fulfilled") {
        setOrganizationsMemberships(results[4].value[0]);
        setTeamMemberships(results[4].value[1]);
      } else {
        setOrganizationsMemberships([]);
        setTeamMemberships([]);
        nextTabErrors.enterprise = results[4].reason instanceof Error ? results[4].reason.message : "Enterprise memberships could not load.";
      }

      if (results[5].status === "fulfilled") setNotifications(results[5].value);
      else {
        setNotifications([]);
        nextTabErrors.notifications = results[5].reason instanceof Error ? results[5].reason.message : "Notifications could not load.";
      }

      setTabErrors(nextTabErrors);
    } catch (err) {
      const message = err instanceof Error ? err.message : "User detail could not load";
      if (message === "Unauthorized") {
        clearToken();
        router.replace("/login");
        return;
      }
      setError(message);
      setTabErrors({});
      setUser(null);
      setBookings([]);
      setEventTypes([]);
      setBookingProfiles([]);
      setContacts([]);
      setOrganizationsMemberships([]);
      setTeamMemberships([]);
      setNotifications([]);
    } finally {
      setLoading(false);
      setBookingsLoading(false);
      setEventTypesLoading(false);
      setBookingProfilesLoading(false);
      setContactsLoading(false);
      setEnterpriseLoading(false);
      setNotificationsLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);


  function openAction(key: UserActionKey) {
    setSuccessToast(null);
    setErrorToast(null);
    setActionReason("");
    setPendingAction(getActionConfig(key));
  }

  async function confirmAction() {
    if (!pendingAction || !user) return;
    const reason = actionReason.trim();
    if (reason.length < 3) {
      setErrorToast("Please enter a clear action reason before confirming.");
      return;
    }

    const targetUserId = String(user.id || user.userId || user.user_id || params.id);
    setActionBusy(true);
    setSuccessToast(null);
    setErrorToast(null);

    try {
      const result = pendingAction.key === "activate"
        ? await updateOpsUserStatus(targetUserId, true, reason)
        : pendingAction.key === "deactivate"
          ? await updateOpsUserStatus(targetUserId, false, reason)
          : pendingAction.key === "forceLogout"
            ? await forceLogoutOpsUser(targetUserId, reason)
            : pendingAction.key === "clearGoogleToken"
              ? await clearOpsUserGoogleToken(targetUserId, reason)
              : await triggerOpsUserPasswordReset(targetUserId, reason);

      setSuccessToast(result.message || `${pendingAction.title} completed successfully.`);
      setPendingAction(null);
      setActionReason("");
      await loadUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      if (message === "Unauthorized") {
        clearToken();
        router.replace("/login");
        return;
      }
      setErrorToast(message);
    } finally {
      setActionBusy(false);
    }
  }

  const stats = useMemo<StatCard[]>(() => [
    { title: "Total Bookings", value: getNumber(user, ["booking_count", "bookingCount"], ["bookings"]), description: "All booking records for this user", tone: "blue" },
    { title: "Upcoming", value: getNumber(user, ["upcoming_booking_count", "upcomingBookingCount"], ["upcomingBookings", "upcoming_bookings"]), description: "Future scheduled bookings", tone: "indigo" },
    { title: "Completed", value: getNumber(user, ["completed_booking_count", "completedBookingCount"], ["completedBookings", "completed_bookings"]), description: "Finished booking records", tone: "green" },
    { title: "Event Types", value: getNumber(user, ["event_type_count", "eventTypeCount"], ["eventTypes", "event_types"]), description: "Scheduling templates created", tone: "blue" },
    { title: "Contacts", value: getNumber(user, ["contact_count", "contactCount"], ["contacts"]), description: "Saved contact records", tone: "slate" },
    { title: "Notifications", value: getNumber(user, ["notification_count", "notificationCount"], ["notifications"]), description: "Notification records linked", tone: "indigo" },
  ], [user]);

  if (loading) return <PageLoader />;

  if (error) {
    const isNotFound = error.toLowerCase().includes("not found") || error.includes("404");
    return (
      <ErrorState
        title={isNotFound ? "User not found" : "User detail could not load"}
        message={isNotFound ? "This user does not exist or may have been removed." : error}
        onBack={() => router.push("/users")}
      />
    );
  }

  if (!user) {
    return <ErrorState title="User not found" message="No user detail was returned by the server." onBack={() => router.push("/users")} />;
  }

  const userId = user.id || user.userId || user.user_id || params.id;
  const name = user.name || "Unnamed user";
  const email = user.email || "Email not available";
  const provider = user.auth_provider || user.authProvider || "unknown";
  const googleConnected = getGoogleConnected(user);
  const isActive = getUserActive(user);
  const organizations = getNumber(user, ["organization_count", "organizationCount"], ["organizations"]);
  const teams = getNumber(user, ["team_count", "teamCount"], ["teams"]);
  const activity = user.recent_activity || user.recentActivity || [];

  return (
    <main style={{ width: "100%", minHeight: "100vh", overflowX: "hidden", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", color: "#0f172a" }}>
      <div style={{ width: "100%", maxWidth: 1480, margin: "0 auto", padding: "24px clamp(16px, 3vw, 32px)" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ minWidth: 0 }}>
            <button type="button" onClick={() => router.push("/users")} style={{ border: "1px solid #dbeafe", background: "#ffffff", color: "#2563eb", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 900, cursor: "pointer", marginBottom: 14 }}>Back to users</button>
            <p style={{ margin: "0 0 8px", color: "#2563eb", fontSize: 13, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>User Overview</p>
            <h1 title={name} style={{ margin: 0, fontSize: "clamp(26px, 4vw, 38px)", lineHeight: 1.1, letterSpacing: "-0.045em", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</h1>
            <p title={email} style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge>{formatLabel(provider)}</Badge>
            <Badge tone={googleConnected ? "green" : "slate"}>{googleConnected ? "Google connected" : "Google not connected"}</Badge>
          </div>
        </header>

        {successToast ? <div style={{ marginBottom: 14 }}><ToastMessage tone="success" message={successToast} /></div> : null}
        {errorToast ? <div style={{ marginBottom: 14 }}><ToastMessage tone="error" message={errorToast} /></div> : null}

        <nav style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>Overview</TabButton>
          <TabButton active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")}>Bookings</TabButton>
          <TabButton active={activeTab === "eventTypes"} onClick={() => setActiveTab("eventTypes")}>Event Types</TabButton>
          <TabButton active={activeTab === "bookingProfiles"} onClick={() => setActiveTab("bookingProfiles")}>Booking Profiles</TabButton>
          <TabButton active={activeTab === "contacts"} onClick={() => setActiveTab("contacts")}>Contacts</TabButton>
          <TabButton active={activeTab === "enterprise"} onClick={() => setActiveTab("enterprise")}>Enterprise</TabButton>
          <TabButton active={activeTab === "notifications"} onClick={() => setActiveTab("notifications")}>Notifications</TabButton>
        </nav>

        {activeTab === "bookings" ? (
          tabErrors.bookings ? (
            <SectionCard title="Bookings" description="Read-only booking history for this user."><SectionErrorState title="Bookings could not load" message={tabErrors.bookings} onRetry={loadUser} /></SectionCard>
          ) : <UserBookingsTab bookings={bookings} loading={bookingsLoading} />
        ) : activeTab === "eventTypes" ? (
          tabErrors.eventTypes ? (
            <SectionCard title="Event Types" description="Read-only scheduling templates created by this user."><SectionErrorState title="Event types could not load" message={tabErrors.eventTypes} onRetry={loadUser} /></SectionCard>
          ) : <UserEventTypesTab eventTypes={eventTypes} loading={eventTypesLoading} />
        ) : activeTab === "bookingProfiles" ? (
          tabErrors.bookingProfiles ? (
            <SectionCard title="Booking Profiles" description="Read-only availability and scheduling profile setup for this user."><SectionErrorState title="Booking profiles could not load" message={tabErrors.bookingProfiles} onRetry={loadUser} /></SectionCard>
          ) : <UserBookingProfilesTab profiles={bookingProfiles} loading={bookingProfilesLoading} />
        ) : activeTab === "contacts" ? (
          tabErrors.contacts ? (
            <SectionCard title="Contacts" description="Read-only contact records saved by this user."><SectionErrorState title="Contacts could not load" message={tabErrors.contacts} onRetry={loadUser} /></SectionCard>
          ) : <UserContactsTab contacts={contacts} loading={contactsLoading} />
        ) : activeTab === "enterprise" ? (
          tabErrors.enterprise ? (
            <SectionCard title="Enterprise" description="Organization and team memberships for this user."><SectionErrorState title="Enterprise memberships could not load" message={tabErrors.enterprise} onRetry={loadUser} /></SectionCard>
          ) : <UserEnterpriseTab organizations={organizationsMemberships} teams={teamMemberships} loading={enterpriseLoading} />
        ) : activeTab === "notifications" ? (
          tabErrors.notifications ? (
            <SectionCard title="Notifications" description="Read-only notification records for this user."><SectionErrorState title="Notifications could not load" message={tabErrors.notifications} onRetry={loadUser} /></SectionCard>
          ) : <UserNotificationsTab notifications={notifications} loading={notificationsLoading} />
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
          <section style={{ minWidth: 0, border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 22, padding: 20, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.picture} alt={name} onError={(event) => { event.currentTarget.style.display = "none"; }} style={{ width: 72, height: 72, borderRadius: 22, objectFit: "cover", border: "1px solid #dbeafe", background: "#eff6ff", flex: "0 0 auto" }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: 22, display: "grid", placeItems: "center", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", fontSize: 22, fontWeight: 900, flex: "0 0 auto" }}>{getInitials(user.name, user.email)}</div>
              )}
              <div style={{ minWidth: 0 }}>
                <h2 title={name} style={{ margin: 0, color: "#0f172a", fontSize: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</h2>
                <p title={email} style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
              <InfoRow label="User ID" value={String(userId)} />
              <InfoRow label="Timezone" value={user.timezone || "Timezone not set"} />
              <InfoRow label="Auth Provider" value={formatLabel(provider)} />
              <InfoRow label="Created At" value={formatDateTime(user.created_at || user.createdAt)} />
            </div>
          </section>

          <div style={{ minWidth: 0, display: "grid", gap: 20 }}>
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 16 }}>
              {stats.map((stat) => <StatCardView key={stat.title} card={stat} />)}
            </section>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 20 }}>
              <SectionCard title="Account summary" description="Basic account and connection details.">
                <div style={{ display: "grid", gap: 12 }}>
                  <InfoRow label="Google connection" value={googleConnected ? "Connected" : "Not connected"} />
                  <InfoRow label="Brand logo" value={user.brand_logo_url || user.brandLogoUrl || "Not configured"} />
                  <InfoRow label="Updated At" value={formatDateTime(user.updated_at || user.updatedAt)} />
                </div>
              </SectionCard>

              <SectionCard title="Enterprise summary" description="Organization and team associations.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <InfoRow label="Organizations" value={formatNumber(organizations)} />
                  <InfoRow label="Teams" value={formatNumber(teams)} />
                </div>
              </SectionCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 20 }}>
              <SectionCard title="Scheduling summary" description="Booking and event-type totals.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <InfoRow label="Bookings" value={formatNumber(stats[0].value)} />
                  <InfoRow label="Event Types" value={formatNumber(stats[3].value)} />
                  <InfoRow label="Upcoming" value={formatNumber(stats[1].value)} />
                  <InfoRow label="Completed" value={formatNumber(stats[2].value)} />
                </div>
              </SectionCard>

              <SectionCard title="Communication summary" description="Contacts and notification records.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <InfoRow label="Contacts" value={formatNumber(stats[4].value)} />
                  <InfoRow label="Notifications" value={formatNumber(stats[5].value)} />
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Recent activity preview" description="Latest related admin activity, if available from the API.">
              {activity.length === 0 ? (
                <div style={{ textAlign: "center", padding: 18 }}>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>No recent activity</h3>
                  <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 14, maxWidth: 420 }}>Activity will appear here after admin actions are logged for this user.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {activity.slice(0, 5).map((item, index) => {
                    const entity = item.entityType || item.entity_type || "entity";
                    const createdAt = item.createdAt || item.created_at;
                    return (
                      <article key={String(item.id || index)} style={{ minWidth: 0, border: "1px solid #e2e8f0", background: "#f8fbff", borderRadius: 14, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <strong style={{ color: "#0f172a", fontSize: 14 }}>{formatLabel(item.action || "Activity")}</strong>
                          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{formatDateTime(createdAt)}</span>
                        </div>
                        <p style={{ margin: "7px 0 0", color: "#334155", fontSize: 13 }}>{formatLabel(entity)} by {getActivityStaff(item)}</p>
                        <p title={getActivityMeta(item)} style={{ margin: "7px 0 0", color: "#64748b", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getActivityMeta(item)}</p>
                      </article>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <DangerZoneCard isActive={isActive} googleConnected={googleConnected} onAction={openAction} />
          </div>
        </div>
        )}
      </div>
      {pendingAction ? (
        <ConfirmActionDialog
          action={pendingAction}
          reason={actionReason}
          busy={actionBusy}
          onReasonChange={setActionReason}
          onCancel={() => {
            if (!actionBusy) {
              setPendingAction(null);
              setActionReason("");
            }
          }}
          onConfirm={confirmAction}
        />
      ) : null}
    </main>
  );
}
function getUserActive(user: OpsUserDetail): boolean {
  const rawUser = user as OpsUserDetail & {
    is_active?: boolean | number | string | null;
    isActive?: boolean | number | string | null;
    active?: boolean | number | string | null;
    status?: string | null;
  };

  const directValue = rawUser.is_active ?? rawUser.isActive ?? rawUser.active;

  if (typeof directValue === "boolean") return directValue;
  if (typeof directValue === "number") return directValue === 1;
  if (typeof directValue === "string") {
    const normalized = directValue.trim().toLowerCase();
    if (["true", "1", "active", "enabled"].includes(normalized)) return true;
    if (["false", "0", "inactive", "disabled", "deactivated", "suspended"].includes(normalized)) return false;
  }

  const status = rawUser.status?.trim().toLowerCase();
  if (status) {
    if (["inactive", "disabled", "deactivated", "suspended", "blocked"].includes(status)) return false;
    if (["active", "enabled"].includes(status)) return true;
  }

  return true;
}

