

"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearToken,
  getCurrentStaff,
  getDashboardSummary,
  getRecentActivity,
  getRecentBookings,
  getRecentUsers,
  getToken,
  type DashboardSummary,
  type RecentActivity,
  type RecentBooking,
  type RecentUser,
  type StaffMe,
} from "../../lib/api";

type CardTone = "blue" | "indigo" | "sky" | "slate";
type SummaryCard = {
  title: string;
  value: number;
  description: string;
  icon: string;
  tone: CardTone;
};

const toneStyles: Record<CardTone, { border: string; bg: string; iconBg: string; iconColor: string }> = {
  blue: { border: "#bfdbfe", bg: "#eff6ff", iconBg: "#dbeafe", iconColor: "#2563eb" },
  indigo: { border: "#c7d2fe", bg: "#eef2ff", iconBg: "#e0e7ff", iconColor: "#4f46e5" },
  sky: { border: "#bae6fd", bg: "#f0f9ff", iconBg: "#e0f2fe", iconColor: "#0284c7" },
  slate: { border: "#e2e8f0", bg: "#f8fafc", iconBg: "#f1f5f9", iconColor: "#475569" },
};

const statusStyles: Record<string, { bg: string; color: string; border: string }> = {
  confirmed: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
  completed: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  pending: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  cancelled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  canceled: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  rescheduled: { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
  default: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

const INITIAL_SHOW = 5;
const RECENT_USERS_INITIAL_SHOW = 3;

/* ─── SVG icons ─── */
function LineIcon({ label }: { label: string }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      {label === "users" ? (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>)
        : label === "calendar" ? (<><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>)
          : label === "clock" ? (<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>)
            : label === "building" ? (<><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></>)
              : label === "layers" ? (<><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>)
                : label === "bell" ? (<><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /></>)
                  : label === "refresh" ? (<><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M16 8h5V3" /></>)
                    : (<><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></>)}
    </svg>
  );
}

/* ─── Formatters ─── */
function formatNumber(value?: number | null): string {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-IN").format(v);
}
function formatDateTime(value?: string | null): string {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}
function formatLabel(value?: string | null): string {
  if (!value) return "Not available";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function getUserInitials(name?: string | null, email?: string | null): string {
  const src = name?.trim() || email?.trim() || "User";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return src.slice(0, 2).toUpperCase();
}
function getPersonLabel(value?: string | { name?: string | null; email?: string | null } | null, fb1?: string | null, fb2?: string | null): string {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") return value.name || value.email || fb1 || fb2 || "System";
  return fb1 || fb2 || "System";
}
function formatMetaPreview(activity: RecentActivity): string {
  const s = activity.metaSummary || activity.meta_summary;
  if (s) return s;
  if (activity.meta && typeof activity.meta === "object") { try { return JSON.stringify(activity.meta); } catch { return "Metadata unavailable"; } }
  if (typeof activity.meta === "string") return activity.meta;
  return "No metadata attached";
}
function buildCards(summary: DashboardSummary): SummaryCard[] {
  return [
    { title: "Total Users", value: summary.users.total, description: "Registered platform users", icon: "users", tone: "blue" },
    { title: "Total Bookings", value: summary.bookings.total, description: "All-time booking records", icon: "calendar", tone: "indigo" },
    { title: "Today Bookings", value: summary.bookings.today, description: "Bookings scheduled today", icon: "clock", tone: "sky" },
    { title: "Upcoming Bookings", value: summary.bookings.upcoming, description: "Future scheduled bookings", icon: "calendar", tone: "blue" },
    { title: "Organizations", value: summary.enterprise.organizations, description: "Enterprise workspaces", icon: "building", tone: "indigo" },
    { title: "Teams", value: summary.enterprise.teams, description: "Teams across organizations", icon: "users", tone: "sky" },
    { title: "Event Types", value: summary.events.eventTypes, description: "Configured event templates", icon: "layers", tone: "blue" },
    { title: "Group Sessions", value: summary.events.groupSessions, description: "Group event sessions", icon: "calendar", tone: "indigo" },
    { title: "Unread Notifications", value: summary.system.unreadNotifications, description: "Unread admin alerts", icon: "bell", tone: "sky" },
    { title: "Open Reschedules", value: summary.system.openRescheduleRequests, description: "Pending reschedule requests", icon: "refresh", tone: "blue" },
    { title: "Active Slot Holds", value: summary.system.activeSlotHolds, description: "Temporary active holds", icon: "sliders", tone: "slate" },
  ];
}

/* ─── Load More Button ─── */
function LoadMoreButton({ shown, total, onLoad }: { shown: number; total: number; onLoad: () => void }) {
  if (shown >= total) return null;
  return (
    <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, background: "#fafcff" }}>
      {/* <span style={{ color: "#64748b", fontSize: 13 }}>
        Showing <strong style={{ color: "#0f172a" }}>{shown}</strong> of <strong style={{ color: "#0f172a" }}>{total}</strong>
      </span> */}
      <button
        type="button"
        onClick={onLoad}
        className="load-more-btn"
        style={{ border: "1px solid #bfdbfe", borderRadius: 999, background: "#ffffff", color: "#2563eb", padding: "9px 28px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
      >
        Load more
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
  );
}

/* ─── Summary Card ─── */
function SummaryCardView({ card, compact = false }: { card: SummaryCard; compact?: boolean }) {
  const tone = toneStyles[card.tone];
  return (
    <article
      style={{
        minWidth: 0,
        border: "1px solid #e8eef8",
        background: "#ffffff",
        borderRadius: compact ? 16 : 20,
        padding: compact ? "16px" : "20px",
        boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
        minHeight: compact ? 112 : 132,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: compact ? 12 : 13, fontWeight: 500, letterSpacing: "-0.01em" }}>{card.title}</p>
          <p style={{ margin: "8px 0 0", color: "#0f172a", fontSize: compact ? 26 : 34, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.05em" }}>{formatNumber(card.value)}</p>
        </div>
        <div style={{ flexShrink: 0, width: compact ? 36 : 40, height: compact ? 36 : 40, borderRadius: compact ? 11 : 12, display: "grid", placeItems: "center", background: tone.iconBg, color: tone.iconColor }}>
          <LineIcon label={card.icon} />
        </div>
      </div>
      <p style={{ margin: compact ? "10px 0 0" : "12px 0 0", color: "#64748b", fontSize: compact ? 12 : 12.5, lineHeight: 1.45, fontWeight: 400 }}>{card.description}</p>
    </article>
  );
}

/* ─── Status / Provider chips ─── */
function StatusChip({ status }: { status?: string | null }) {
  const key = String(status || "default").toLowerCase();
  const s = statusStyles[key] || statusStyles.default;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${s.border}`, background: s.bg, color: s.color, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {formatLabel(status || "Unknown")}
    </span>
  );
}
function ProviderBadge({ provider }: { provider?: string | null }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {formatLabel(provider || "unknown")}
    </span>
  );
}

/* ─── Skeletons ─── */
function TableSkeleton() {
  return (
    <div style={{ display: "grid", gap: 10, padding: 18 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: 44, borderRadius: 12, background: "linear-gradient(90deg,#f1f5f9 0%,#eaf2ff 50%,#f1f5f9 100%)" }} />
      ))}
    </div>
  );
}
function CardSkeletonGrid() {
  return (
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 14, width: "100%" }}>
      {Array.from({ length: 11 }).map((_, i) => (
        <article key={i} style={{ minWidth: 0, border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(15,23,42,0.05)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ width: "55%", height: 12, borderRadius: 999, background: "#eaf2ff" }} />
              <div style={{ width: "40%", height: 26, borderRadius: 10, background: "#f1f5f9", marginTop: 10 }} />
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#dbeafe", flexShrink: 0 }} />
          </div>
          <div style={{ width: "72%", height: 11, borderRadius: 999, background: "#f1f5f9", marginTop: 14 }} />
        </article>
      ))}
    </section>
  );
}

/* ─── Error card ─── */
function ApiErrorCard({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <section style={{ border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 20, padding: "16px 20px", color: "#991b1b", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 600 }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, letterSpacing: "-0.01em", overflowWrap: "anywhere" }}>{message}</p>
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} style={{ border: "1px solid #fecaca", borderRadius: 999, background: "#ffffff", color: "#991b1b", padding: "7px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Retry</button>
        )}
      </div>
    </section>
  );
}

/* ─── Section shell ─── */
function SectionShell({ title, description, badge, children }: { title: string; description: string; badge?: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 24, border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 18, boxShadow: "0 2px 16px rgba(15,23,42,0.06)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "16px 20px", borderBottom: "1px solid #e2e8f0", background: "#fafcff" }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{title}</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13, fontWeight: 400 }}>{description}</p>
        </div>
        {badge && (
          <span style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 500 }}>{badge}</span>
        )}
      </div>
      {children}
    </section>
  );
}

/* ─── Recent Bookings ─── */
function RecentBookingsTable({ bookings, loading }: { bookings: RecentBooking[]; loading: boolean }) {
  const [shown, setShown] = useState(INITIAL_SHOW);
  useEffect(() => { setShown(INITIAL_SHOW); }, [bookings]);

  const visible = bookings.slice(0, shown);

  return (
    <SectionShell title="Recent bookings" description="Latest bookings sorted newest first." badge={`Latest ${bookings.length || 10}`}>
      {loading ? <TableSkeleton /> : bookings.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 600 }}>No recent bookings</h3>
          <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 13, fontWeight: 400, maxWidth: 400 }}>Bookings will appear here when users start creating appointments.</p>
        </div>
      ) : (
        <>
          <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#475569" }}>
                  {["Guest", "Host", "Date & Time", "Meeting Mode", "Org/Team"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => {
                  const host = typeof booking.hostUser === "string" ? booking.hostUser : booking.hostUser?.name || booking.hostUser?.email || booking.hostName || booking.hostEmail || "Not assigned";
                  const guestName = booking.guestName || "Guest";
                  const guestEmail = booking.guestEmail || "Email not available";
                  const orgTeam = [booking.organization, booking.team].filter(Boolean).join(" / ") || "Personal";
                  return (
                    <tr key={String(booking.bookingId || booking.id)} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "13px 16px", verticalAlign: "top", maxWidth: 240 }}>
                        <div style={{ color: "#0f172a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guestName}</div>
                        <div title={guestEmail} style={{ marginTop: 3, color: "#64748b", fontSize: 12, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guestEmail}</div>
                      </td>
                      <td style={{ padding: "13px 16px", color: "#334155", fontWeight: 400, verticalAlign: "top", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={host}>{host}</td>
                      <td style={{ padding: "13px 16px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <div style={{ color: "#334155", fontWeight: 400 }}>{formatDateTime(booking.startTime)}</div>
                        <div style={{ marginTop: 3, color: "#64748b", fontSize: 12, fontWeight: 400 }}>Ends {formatDateTime(booking.endTime)}</div>
                      </td>
                      <td style={{ padding: "13px 16px", color: "#334155", fontWeight: 400, verticalAlign: "top", whiteSpace: "nowrap" }}>{formatLabel(booking.meetingMode)}</td>
                      <td style={{ padding: "13px 16px", color: "#334155", fontWeight: 400, verticalAlign: "top", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={orgTeam}>{orgTeam}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <LoadMoreButton shown={shown} total={bookings.length} onLoad={() => setShown(bookings.length)} />
        </>
      )}
    </SectionShell>
  );
}

/* ─── Recent Users ─── */
function RecentUsersSection({ users, loading }: { users: RecentUser[]; loading: boolean }) {
  const [shown, setShown] = useState(RECENT_USERS_INITIAL_SHOW);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Reset recent users to 3 when new data arrives
  useEffect(() => { setShown(RECENT_USERS_INITIAL_SHOW); }, [users]);

  // Auto-collapse recent users back to 3 when section scrolls fully out of view
  useEffect(() => {
    if (shown <= RECENT_USERS_INITIAL_SHOW) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) setShown(RECENT_USERS_INITIAL_SHOW); },
      { threshold: 0, rootMargin: "0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);

  const visible = users.slice(0, shown);

  return (
    <div ref={sectionRef}>
      <SectionShell title="Recent users" description="Latest registered users with safe public admin fields only." badge={`Latest ${users.length || 10}`}>
        {loading ? <TableSkeleton /> : users.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 600 }}>No recent users</h3>
            <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 13, fontWeight: 400, maxWidth: 400 }}>Users will appear here after accounts are created.</p>
          </div>
        ) : (
          <>
            {/* Single-column list */}
            <div style={{ padding: "6px 0" }}>
              {visible.map((user, idx) => {
                const name = user.name || "Unnamed user";
                const email = user.email || "Email not available";
                return (
                  <div
                    key={String(user.userId || user.id || email)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderBottom: idx < visible.length - 1 ? "1px solid #f1f5f9" : "none", minWidth: 0 }}
                  >
                    {/* Avatar */}
                    {user.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.picture} alt={name} onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: 42, height: 42, borderRadius: 12, objectFit: "cover", border: "1px solid #dbeafe", background: "#eff6ff", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>{getUserInitials(user.name, user.email)}</div>
                    )}

                    {/* Name + email */}
                    <div style={{ minWidth: 0, flex: "1 1 160px" }}>
                      <div title={name} style={{ color: "#0f172a", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                      <div title={email} style={{ marginTop: 3, color: "#64748b", fontSize: 12, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</div>
                    </div>

                    {/* Provider + timezone */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <ProviderBadge provider={user.authProvider} />
                      <span title={user.timezone || "Timezone not available"} style={{ display: "inline-flex", alignItems: "center", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 400, whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.timezone || "Timezone not set"}
                      </span>
                    </div>

                    {/* Stats */}
                    <div
                      className="recent-user-stats"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {[
                        { label: "Bookings", value: user.totalBookings },
                        { label: "Event Types", value: user.totalEventTypes },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          style={{
                            minWidth: 76,
                            minHeight: 44,
                            display: "grid",
                            alignContent: "center",
                            border: "1px solid #dbeafe",
                            borderRadius: 12,
                            padding: "7px 10px",
                            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                            textAlign: "center",
                            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.035)",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              color: "#475569",
                              fontSize: 9.5,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              lineHeight: 1.1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0",
                              color: "#0f172a",
                              fontSize: 15,
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            {formatNumber(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <LoadMoreButton shown={shown} total={users.length} onLoad={() => setShown(users.length)} />
          </>
        )}
      </SectionShell>
    </div>
  );
}

/* ─── Recent Activity ─── */
function RecentActivitySection({ activities, loading }: { activities: RecentActivity[]; loading: boolean }) {
  const [shown, setShown] = useState(INITIAL_SHOW);
  useEffect(() => { setShown(INITIAL_SHOW); }, [activities]);

  const visible = activities.slice(0, shown);

  return (
    <SectionShell title="Recent admin activity" description="Latest read-only ops audit events." badge={`Latest ${activities.length || 10}`}>
      {loading ? <TableSkeleton /> : activities.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center" }}>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 15, fontWeight: 600 }}>No recent activity</h3>
          <p style={{ margin: "8px auto 0", color: "#64748b", fontSize: 13, fontWeight: 400, maxWidth: 440 }}>Ops audit activity will appear here after admins perform tracked actions.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 10, padding: 18 }}>
            {visible.map((activity, i) => {
              const entityType = activity.entityType || activity.entity_type || "Unknown entity";
              const entityId = activity.entityId || activity.entity_id || "N/A";
              const staffUser = getPersonLabel(activity.staffUser || activity.staff_user, activity.staffName || activity.staff_name, activity.staffEmail || activity.staff_email);
              const createdAt = activity.createdAt || activity.created_at;
              const metaPreview = formatMetaPreview(activity);

              return (
                <article key={String(activity.id || `${activity.action}-${entityType}-${entityId}-${i}`)} style={{ minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 14, background: "#ffffff", padding: "14px 16px", boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
                          {formatLabel(activity.action || "Unknown action")}
                        </span>
                        <span style={{ color: "#475569", fontSize: 13, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                          {formatLabel(entityType)} · {String(entityId)}
                        </span>
                      </div>
                      <p title={metaPreview} style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13, fontWeight: 400, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                        {metaPreview}
                      </p>
                    </div>
                    <div style={{ minWidth: 160, textAlign: "right", flexShrink: 0 }}>
                      <p title={staffUser} style={{ margin: 0, color: "#0f172a", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{staffUser}</p>
                      <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 12, fontWeight: 400, whiteSpace: "nowrap" }}>{formatDateTime(createdAt)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <LoadMoreButton shown={shown} total={activities.length} onLoad={() => setShown(activities.length)} />
        </>
      )}
    </SectionShell>
  );
}

/* ══════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMe | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  function getErrorMessage(r: PromiseSettledResult<unknown>, fallback: string): string | null {
    if (r.status === "fulfilled") return null;
    return r.reason instanceof Error ? r.reason.message : fallback;
  }
  function redirectIfUnauthorized(msgs: Array<string | null>): boolean {
    if (!msgs.some((m) => m === "Unauthorized")) return false;
    clearToken(); router.replace("/login"); return true;
  }

  async function loadDashboard(isRefresh = false) {
    if (!getToken()) { router.replace("/login"); return; }
    if (isRefresh) setRefreshing(true);
    setLoading(true); setBookingsLoading(true); setUsersLoading(true); setActivityLoading(true);
    setError(null); setBookingsError(null); setUsersError(null); setActivityError(null);

    const [staffR, summaryR, bookingsR, usersR, activityR] = await Promise.allSettled([
      getCurrentStaff(), getDashboardSummary(), getRecentBookings(10), getRecentUsers(10), getRecentActivity(10),
    ]);

    const summaryErr = getErrorMessage(summaryR, "Dashboard summary could not load");
    const bookingsErr = getErrorMessage(bookingsR, "Recent bookings could not load");
    const usersErr = getErrorMessage(usersR, "Recent users could not load");
    const activityErr = getErrorMessage(activityR, "Recent admin activity could not load");
    const staffErr = getErrorMessage(staffR, "Admin session could not load");

    if (redirectIfUnauthorized([staffErr, summaryErr, bookingsErr, usersErr, activityErr])) return;

    if (staffR.status === "fulfilled") setStaff(staffR.value);
    if (summaryR.status === "fulfilled") setSummary(summaryR.value); else setSummary(null);
    if (bookingsR.status === "fulfilled") setRecentBookings(bookingsR.value); else setRecentBookings([]);
    if (usersR.status === "fulfilled") setRecentUsers(usersR.value); else setRecentUsers([]);
    if (activityR.status === "fulfilled") setRecentActivity(activityR.value); else setRecentActivity([]);

    setError(summaryErr || staffErr);
    setBookingsError(bookingsErr); setUsersError(usersErr); setActivityError(activityErr);
    setLoading(false); setBookingsLoading(false); setUsersLoading(false); setActivityLoading(false); setRefreshing(false);
  }

  useEffect(() => { loadDashboard(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function logout() { clearToken(); router.replace("/login"); }

  const cards = useMemo(() => (summary ? buildCards(summary) : []), [summary]);
  const mainCards = cards.slice(0, 4);
  const secondaryCards = cards.slice(4, 8);
  const systemCards = cards.slice(8);

  return (
    <>
      <style jsx global>{`
        /* ── Summary overview layout ── */
        .summary-overview-shell {
          border: 1px solid #dbeafe;
          background: rgba(255, 255, 255, 0.78);
          border-radius: 24px;
          padding: 18px;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
        }

        .summary-main-grid,
        .summary-secondary-grid {
          display: grid;
          gap: 14px;
          width: 100%;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .summary-secondary-grid {
          margin-top: 14px;
        }

        .summary-system-strip {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #eaf1fb;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .summary-system-item {
          flex: 1 1 220px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid #e8eef8;
          background: #f8fbff;
          border-radius: 14px;
          padding: 12px 14px;
          color: #64748b;
          font-size: 13px;
          min-width: 0;
        }

        .summary-system-item span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summary-system-item strong {
          color: #0f172a;
          font-size: 18px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
        }

        @media (max-width: 1200px) {
          .summary-main-grid,
          .summary-secondary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .summary-overview-shell {
            padding: 12px;
            border-radius: 20px;
          }

          .summary-main-grid,
          .summary-secondary-grid {
            grid-template-columns: 1fr;
          }

          .summary-system-strip {
            gap: 10px;
          }

          .summary-system-item {
            flex-basis: 100%;
          }
        }

        @media (min-width: 1800px) {
          .summary-overview-shell {
            padding: 20px;
          }
        }

        /* ── Load more button hover ── */
        .load-more-btn:hover {
          background: #eff6ff !important;
          border-color: #93c5fd !important;
        }

        /* ── Row hover in tables ── */
        .dash-table-row:hover { background: #fafcff; }

        /* ── Responsive page container ── */
        .dash-page {
          min-height: 100vh;
          background: #f6f9ff;
          color: #0f172a;
          overflow-x: hidden;
        }
        .dash-inner {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 28px clamp(14px, 3vw, 40px);
          box-sizing: border-box;
        }
        @media (min-width: 2560px) {
          .dash-inner { max-width: 2200px; padding: 40px clamp(24px, 3vw, 60px); }
        }

        /* ── Page header ── */
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .dash-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* ── User row responsive (single-column list) ── */
        .dash-user-row-stats { display: flex; gap: 10px; flex-shrink: 0; }
        .dash-user-row-meta  { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }

        @media (max-width: 640px) {
          /* Stack avatar+name on the left, stats hidden / wrap under */
          .dash-user-row-stats { display: none; }
          .dash-user-row-meta  { display: none; }
        }
        @media (max-width: 860px) {
          .dash-user-row-stats { gap: 8px; }
          .dash-user-row-meta  { display: none; }
        }
      `}</style>

      <div className="dash-page">
        <div className="dash-inner">

          {/* Page header */}
          <header className="dash-header">
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: "0 0 6px", color: "#2563eb", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin Dashboard</p>
              <h1 style={{ margin: 0, fontSize: "clamp(24px,4vw,36px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.04em", color: "#0f172a" }}>Summary overview</h1>
              <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14, fontWeight: 400 }}>Live read-only metrics and latest records from admin APIs.</p>
            </div>
            <div className="dash-header-actions">
              {staff && (
                <div style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 999, padding: "8px 14px", color: "#334155", fontSize: 13, fontWeight: 400, boxShadow: "0 2px 10px rgba(15,23,42,0.06)", whiteSpace: "nowrap" }}>
                  <strong style={{ color: "#0f172a", fontWeight: 600 }}>{staff.name || "Admin"}</strong>
                  <span style={{ color: "#64748b" }}> · </span>
                  <span>{staff.email}</span>
                </div>
              )}
              <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing} style={{ border: "1px solid #bfdbfe", borderRadius: 999, background: refreshing ? "#eff6ff" : "#ffffff", color: "#2563eb", padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: refreshing ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              <button type="button" onClick={logout} style={{ border: "1px solid #e2e8f0", borderRadius: 999, background: "#ffffff", color: "#475569", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                Logout
              </button>
            </div>
          </header>

          {/* Summary error */}
          {error && <ApiErrorCard title="Dashboard data could not load" message={error} onRetry={() => loadDashboard(true)} />}

          {/* Summary cards */}
          {loading ? <CardSkeletonGrid /> : summary ? (
            <section className="summary-overview-shell">
              <div className="summary-main-grid">
                {mainCards.map((card) => (
                  <SummaryCardView key={card.title} card={card} />
                ))}
              </div>

              <div className="summary-secondary-grid">
                {secondaryCards.map((card) => (
                  <SummaryCardView key={card.title} card={card} compact />
                ))}
              </div>

              <div className="summary-system-strip">
                {systemCards.map((card) => (
                  <div key={card.title} className="summary-system-item">
                    <span>{card.title}</span>
                    <strong>{formatNumber(card.value)}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : !error ? (
            <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, padding: 28, textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: 400 }}>No dashboard summary data available.</section>
          ) : null}

          {/* Sections */}
          {bookingsError && <ApiErrorCard title="Recent bookings could not load" message={bookingsError} onRetry={() => loadDashboard(true)} />}
          <RecentBookingsTable bookings={recentBookings} loading={bookingsLoading} />

          {usersError && <ApiErrorCard title="Recent users could not load" message={usersError} onRetry={() => loadDashboard(true)} />}
          <RecentUsersSection users={recentUsers} loading={usersLoading} />

          {activityError && <ApiErrorCard title="Recent admin activity could not load" message={activityError} onRetry={() => loadDashboard(true)} />}
          <RecentActivitySection activities={recentActivity} loading={activityLoading} />

        </div>
      </div>
    </>
  );
}