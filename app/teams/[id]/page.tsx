//@ts-nocheck
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE, clearToken, getToken } from "../../../lib/api";

type StaffMe = {
  id?: number | string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

type TabKey = "overview" | "members" | "event-types" | "bookings" | "audit";

type PersonSummary = {
  id?: number | string | null;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

type OrganizationSummary = {
  id?: number | string | null;
  name?: string | null;
  slug?: string | null;
};

type TeamStats = {
  members_count?: number | null;
  event_types_count?: number | null;
  bookings_count?: number | null;
};

type TeamMember = {
  membership_id?: number | string | null;
  user_id?: number | string | null;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  role?: string | null;
  role_in_team?: string | null;
  org_role?: string | null;
  joined_at?: string | null;
};

type TeamEventType = {
  id?: number | string | null;
  title?: string | null;
  slug?: string | null;
  owner?: PersonSummary | null;
  event_kind?: string | null;
  duration_minutes?: number | string | null;
  meeting_mode?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type TeamBooking = {
  booking_id?: number | string | null;
  id?: number | string | null;
  guest_name?: string | null;
  guest_email?: string | null;
  title?: string | null;
  host_user?: PersonSummary | string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  raw_status?: string | null;
  meeting_mode?: string | null;
  created_at?: string | null;
};

type TeamDetail = {
  id: number | string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  organization?: OrganizationSummary | null;
  created_by?: PersonSummary | null;
  created_at?: string | null;
  stats?: TeamStats | null;
  recent_members?: TeamMember[] | null;
  recent_event_types?: TeamEventType[] | null;
  recent_bookings?: TeamBooking[] | null;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "members", label: "Members" },
  { key: "event-types", label: "Event Types" },
  { key: "bookings", label: "Bookings" },
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
  active: { bg: "#ecfdf5", color: "#047857", border: "#bbf7d0" },
  inactive: { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  default: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

function formatNumber(value?: number | string | null): string {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("en-IN").format(
    Number.isFinite(numeric) ? numeric : 0,
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

function formatLabel(value?: string | null): string {
  if (!value) return "Not available";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPersonLabel(person?: PersonSummary | string | null): string {
  if (!person) return "Not available";
  if (typeof person === "string") return person;
  return person.name || person.email || "Not available";
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "TM";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getOrganizationLabel(
  organization?: OrganizationSummary | null,
): string {
  if (!organization) return "Not assigned";
  const name = organization.name || "Unnamed organization";
  return organization.slug ? `${name} / ${organization.slug}` : name;
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: keyof typeof statusStyles;
}) {
  const style = statusStyles[tone] || statusStyles.default;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
        borderRadius: 999,
        padding: "6px 9px",
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
  return (
    <Badge
      tone={(statusStyles[key] ? key : "default") as keyof typeof statusStyles}
    >
      {formatLabel(status || "Unknown")}
    </Badge>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
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
          padding: "16px 18px",
          borderBottom: "1px solid #e2e8f0",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: 17,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value?: number | string | null;
  helper: string;
}) {
  return (
    <article
      style={{
        minWidth: 0,
        border: "1px solid #bfdbfe",
        background: "#ffffff",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
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
        {helper}
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "150px minmax(0, 1fr)",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid #eef2f7",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
        {label}
      </div>
      <div
        style={{
          minWidth: 0,
          color: "#0f172a",
          fontSize: 14,
          overflowWrap: "anywhere",
        }}
      >
        {value || "Not available"}
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ padding: 34, textAlign: "center" }}>
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

function LoadingState() {
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
          Loading team detail...
        </p>

        {actionOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.42)",
              display: "grid",
              placeItems: "center",
              padding: 18,
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "min(100%, 520px)",
                border: "1px solid #dbeafe",
                background: "#ffffff",
                borderRadius: 22,
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 18,
                  borderBottom: "1px solid #e2e8f0",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                  {formatLabel(actionOpen)}
                </h2>
                <p
                  style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}
                >
                  Confirm carefully. This action is audited.
                </p>
              </div>
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                {actionOpen === "edit-team" ? (
                  <>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Name
                      </span>
                      <input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Slug
                      </span>
                      <input
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Description
                      </span>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={3}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                          resize: "vertical",
                        }}
                      />
                    </label>
                  </>
                ) : null}
                {actionOpen === "add-member" ? (
                  <>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        User ID
                      </span>
                      <input
                        value={formUserId}
                        onChange={(e) => setFormUserId(e.target.value)}
                        placeholder="Existing org user ID"
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Role in team
                      </span>
                      <input
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                  </>
                ) : null}
                {actionOpen === "change-member-role" ? (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#64748b",
                      }}
                    >
                      New role
                    </span>
                    <input
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      style={{
                        border: "1px solid #dbeafe",
                        borderRadius: 14,
                        padding: 11,
                      }}
                    />
                  </label>
                ) : null}
                {actionOpen === "remove-member" ? (
                  <div
                    style={{
                      border: "1px solid #fecaca",
                      background: "#fff7f7",
                      color: "#991b1b",
                      borderRadius: 16,
                      padding: 14,
                      fontSize: 14,
                    }}
                  >
                    This removes the member from the team only. No user account
                    is deleted.
                  </div>
                ) : null}
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}
                  >
                    {actionOpen === "team-note" ? "Internal note" : "Reason"}
                  </span>
                  <textarea
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    rows={3}
                    placeholder="Add a clear audit reason"
                    style={{
                      border: "1px solid #dbeafe",
                      borderRadius: 14,
                      padding: 11,
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: 18,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <ActionButton tone="neutral" onClick={closeAction}>
                  Cancel
                </ActionButton>
                <ActionButton
                  tone={actionOpen === "remove-member" ? "danger" : "primary"}
                  onClick={submitAction}
                >
                  {actionLoading ? "Working..." : "Confirm"}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        overflowX: "hidden",
        background:
          "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)",
        color: "#0f172a",
        padding: "24px clamp(16px, 3vw, 32px)",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {actionSuccess ? (
          <Toast message={actionSuccess} tone="success" />
        ) : null}
        {actionError ? <Toast message={actionError} tone="error" /> : null}
        <Link
          href="/teams"
          style={{
            display: "inline-flex",
            marginBottom: 16,
            color: "#2563eb",
            fontSize: 13,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Back to teams
        </Link>
        <section
          style={{
            border: "1px solid #fecaca",
            background: "#fff7f7",
            color: "#991b1b",
            borderRadius: 20,
            padding: 22,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}>
            {message}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginTop: 14,
                border: "1px solid #fecaca",
                borderRadius: 12,
                background: "#ffffff",
                color: "#991b1b",
                padding: "10px 13px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          ) : null}
        </section>

        {actionOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.42)",
              display: "grid",
              placeItems: "center",
              padding: 18,
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "min(100%, 520px)",
                border: "1px solid #dbeafe",
                background: "#ffffff",
                borderRadius: 22,
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 18,
                  borderBottom: "1px solid #e2e8f0",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                  {formatLabel(actionOpen)}
                </h2>
                <p
                  style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}
                >
                  Confirm carefully. This action is audited.
                </p>
              </div>
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                {actionOpen === "edit-team" ? (
                  <>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Name
                      </span>
                      <input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Slug
                      </span>
                      <input
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Description
                      </span>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={3}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                          resize: "vertical",
                        }}
                      />
                    </label>
                  </>
                ) : null}
                {actionOpen === "add-member" ? (
                  <>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        User ID
                      </span>
                      <input
                        value={formUserId}
                        onChange={(e) => setFormUserId(e.target.value)}
                        placeholder="Existing org user ID"
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Role in team
                      </span>
                      <input
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                  </>
                ) : null}
                {actionOpen === "change-member-role" ? (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#64748b",
                      }}
                    >
                      New role
                    </span>
                    <input
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      style={{
                        border: "1px solid #dbeafe",
                        borderRadius: 14,
                        padding: 11,
                      }}
                    />
                  </label>
                ) : null}
                {actionOpen === "remove-member" ? (
                  <div
                    style={{
                      border: "1px solid #fecaca",
                      background: "#fff7f7",
                      color: "#991b1b",
                      borderRadius: 16,
                      padding: 14,
                      fontSize: 14,
                    }}
                  >
                    This removes the member from the team only. No user account
                    is deleted.
                  </div>
                ) : null}
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}
                  >
                    {actionOpen === "team-note" ? "Internal note" : "Reason"}
                  </span>
                  <textarea
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    rows={3}
                    placeholder="Add a clear audit reason"
                    style={{
                      border: "1px solid #dbeafe",
                      borderRadius: 14,
                      padding: 11,
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: 18,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <ActionButton tone="neutral" onClick={closeAction}>
                  Cancel
                </ActionButton>
                <ActionButton
                  tone={actionOpen === "remove-member" ? "danger" : "primary"}
                  onClick={submitAction}
                >
                  {actionLoading ? "Working..." : "Confirm"}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Avatar({ person }: { person: PersonSummary }) {
  const name = person.name || "Unnamed user";
  const email = person.email || "Email not available";

  if (person.picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.picture}
        alt={name}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          objectFit: "cover",
          border: "1px solid #dbeafe",
          background: "#eff6ff",
          flex: "0 0 auto",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        display: "grid",
        placeItems: "center",
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#2563eb",
        fontWeight: 900,
        flex: "0 0 auto",
      }}
    >
      {getInitials(name, email)}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "primary" | "danger" | "neutral";
}) {
  const styles =
    tone === "danger"
      ? { border: "#fecaca", bg: "#fff7f7", color: "#b91c1c" }
      : tone === "neutral"
        ? { border: "#e2e8f0", bg: "#ffffff", color: "#475569" }
        : { border: "#bfdbfe", bg: "#eff6ff", color: "#2563eb" };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${styles.border}`,
        background: styles.bg,
        color: styles.color,
        borderRadius: 999,
        padding: "8px 11px",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function getStaffRoleKey(role?: string | null): string {
  const key = String(role || "")
    .trim()
    .toUpperCase();
  if (["CEO", "OWNER", "ROOT"].includes(key)) return "SUPER_ADMIN";
  return key;
}

function canManageTeam(role?: string | null): boolean {
  return ["SUPER_ADMIN", "ADMIN"].includes(getStaffRoleKey(role));
}

function Toast({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error";
}) {
  return (
    <div
      style={{
        marginBottom: 14,
        border: `1px solid ${tone === "success" ? "#bbf7d0" : "#fecaca"}`,
        background: tone === "success" ? "#ecfdf5" : "#fff7f7",
        color: tone === "success" ? "#047857" : "#991b1b",
        borderRadius: 16,
        padding: 14,
        fontSize: 14,
        fontWeight: 800,
      }}
    >
      {message}
    </div>
  );
}

function MembersTab({
  members,
  onChangeRole,
  onRemove,
}: {
  members: TeamMember[];
  onChangeRole?: (member: TeamMember) => void;
  onRemove?: (member: TeamMember) => void;
}) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="No team members found"
        message="Members assigned to this team will appear here."
      />
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          minWidth: 780,
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
            {["Member", "Email", "Role", "Joined At", "Actions"].map(
              (header) => (
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
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const name = member.name || "Unnamed member";
            const email = member.email || "Email not available";
            return (
              <tr
                key={String(member.membership_id || member.user_id || email)}
                style={{ borderBottom: "1px solid #eef2f7" }}
              >
                <td
                  style={{
                    padding: "14px 16px",
                    verticalAlign: "top",
                    maxWidth: 280,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <Avatar person={member} />
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
                        style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}
                      >
                        User #{member.user_id || "N/A"}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  title={email}
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    maxWidth: 260,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email}
                </td>
                <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                  <Badge>
                    {formatLabel(
                      member.role_in_team || member.role || "Member",
                    )}
                  </Badge>
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDateTime(member.joined_at)}
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {member.user_id ? (
                      <Link
                        href={`/users/${member.user_id}`}
                        style={{
                          display: "inline-flex",
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
                        View user
                      </Link>
                    ) : null}
                    {onChangeRole ? (
                      <ActionButton onClick={() => onChangeRole(member)}>
                        Change role
                      </ActionButton>
                    ) : null}
                    {onRemove ? (
                      <ActionButton
                        tone="danger"
                        onClick={() => onRemove(member)}
                      >
                        Remove
                      </ActionButton>
                    ) : null}
                    {!member.user_id && !onChangeRole && !onRemove
                      ? "Not available"
                      : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EventTypesTab({ eventTypes }: { eventTypes: TeamEventType[] }) {
  if (eventTypes.length === 0) {
    return (
      <EmptyState
        title="No event types found"
        message="Event types assigned to this team will appear here."
      />
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          minWidth: 920,
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
              "Event Type",
              "Owner",
              "Kind",
              "Duration",
              "Meeting Mode",
              "Status",
              "Created At",
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
          {eventTypes.map((eventType) => {
            const title = eventType.title || "Untitled event type";
            const slug = eventType.slug || "not-available";
            const isActive = eventType.is_active !== false;
            return (
              <tr
                key={String(eventType.id || slug)}
                style={{ borderBottom: "1px solid #eef2f7" }}
              >
                <td
                  style={{
                    padding: "14px 16px",
                    verticalAlign: "top",
                    maxWidth: 260,
                  }}
                >
                  <div
                    title={title}
                    style={{
                      color: "#0f172a",
                      fontWeight: 900,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {title}
                  </div>
                  <div
                    title={slug}
                    style={{
                      marginTop: 5,
                      color: "#64748b",
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {slug}
                  </div>
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={getPersonLabel(eventType.owner)}
                >
                  {getPersonLabel(eventType.owner)}
                </td>
                <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                  <Badge>
                    {formatLabel(eventType.event_kind || "one_on_one")}
                  </Badge>
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {eventType.duration_minutes
                    ? `${eventType.duration_minutes} min`
                    : "Not available"}
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatLabel(eventType.meeting_mode)}
                </td>
                <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                  <Badge tone={isActive ? "active" : "inactive"}>
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDateTime(eventType.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BookingsTab({ bookings }: { bookings: TeamBooking[] }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No recent bookings found"
        message="Team bookings will appear here after guests schedule team-related meetings."
      />
    );
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          minWidth: 980,
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
              "Guest",
              "Host",
              "Meeting",
              "Date & Time",
              "Status",
              "Meeting Mode",
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
          {bookings.map((booking) => {
            const bookingId = booking.booking_id || booking.id;
            const guestName = booking.guest_name || "Guest";
            const guestEmail = booking.guest_email || "Email not available";
            const host = getPersonLabel(booking.host_user);

            return (
              <tr
                key={String(bookingId || guestEmail)}
                style={{ borderBottom: "1px solid #eef2f7" }}
              >
                <td
                  style={{
                    padding: "14px 16px",
                    verticalAlign: "top",
                    maxWidth: 260,
                  }}
                >
                  <div
                    title={guestName}
                    style={{
                      color: "#0f172a",
                      fontWeight: 900,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {guestName}
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

                <td
                  title={host}
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    maxWidth: 190,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {host}
                </td>

                <td
                  title={booking.title || undefined}
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {booking.title || "Untitled meeting"}
                </td>

                <td
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div>{formatDateTime(booking.start_time)}</div>
                  <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 12 }}>
                    Ends {formatDateTime(booking.end_time)}
                  </div>
                </td>

                <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                  <StatusBadge status={booking.status || booking.raw_status} />
                </td>

                <td
                  style={{
                    padding: "14px 16px",
                    color: "#334155",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatLabel(booking.meeting_mode)}
                </td>

                <td
                  style={{
                    padding: "14px 16px",
                    verticalAlign: "top",
                    whiteSpace: "nowrap",
                  }}
                >
                  {bookingId ? (
                    <Link
                      href={`/bookings/${bookingId}`}
                      style={{
                        display: "inline-flex",
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
                      View booking
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
  );
}

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const teamId = params?.id;
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionOpen, setActionOpen] = useState<
    | null
    | "edit-team"
    | "team-note"
    | "add-member"
    | "change-member-role"
    | "remove-member"
  >(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formRole, setFormRole] = useState("MEMBER");
  const [formReason, setFormReason] = useState("");
  const [staff, setStaff] = useState<StaffMe | null>(null);

  const members = useMemo(() => team?.recent_members || [], [team]);
  const eventTypes = useMemo(() => team?.recent_event_types || [], [team]);
  const bookings = useMemo(() => team?.recent_bookings || [], [team]);

  async function handleUnauthorized() {
    clearToken();
    router.replace("/login");
  }

  async function loadTeam() {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!teamId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [meResponse, response] = await Promise.all([
        fetch(`${API_BASE}/ops/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }),
        fetch(`${API_BASE}/ops/teams/${encodeURIComponent(teamId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }),
      ]);

      if (meResponse.status === 401 || response.status === 401) {
        await handleUnauthorized();
        return;
      }

      if (response.status === 404) {
        setTeam(null);
        setNotFound(true);
        return;
      }

      if (!response.ok) {
        let message = "Team detail could not load";
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

      const data: TeamDetail = await response.json();
      setTeam(data);
    } catch (err) {
      setTeam(null);
      setError(
        err instanceof Error ? err.message : "Team detail could not load",
      );
    } finally {
      setLoading(false);
    }
  }

  function openAction(action: typeof actionOpen, member?: TeamMember) {
    if (!team) return;
    setActionOpen(action);
    setSelectedMember(member || null);
    setActionError(null);
    setActionSuccess(null);
    setFormReason("");
    setFormName(team.name || "");
    setFormSlug(team.slug || "");
    setFormDescription(team.description || "");
    setFormUserId("");
    setFormRole(member?.role_in_team || member?.role || "MEMBER");
  }

  function closeAction() {
    if (actionLoading) return;
    setActionOpen(null);
    setSelectedMember(null);
    setActionError(null);
  }

  async function submitAction() {
    const token = getToken();
    if (!token || !teamId || !actionOpen) return;
    setActionLoading(true);
    setActionError(null);
    try {
      let path = "";
      let method = "POST";
      let body: Record<string, unknown> = {
        reason: formReason.trim() || undefined,
      };

      if (actionOpen === "edit-team") {
        path = `/ops/teams/${encodeURIComponent(teamId)}`;
        method = "PATCH";
        body = {
          name: formName.trim(),
          slug: formSlug.trim(),
          description: formDescription.trim(),
          reason: formReason.trim() || undefined,
        };
      } else if (actionOpen === "team-note") {
        path = `/ops/teams/${encodeURIComponent(teamId)}/internal-note`;
        body = {
          note: formReason.trim(),
          reason: formReason.trim() || undefined,
        };
      } else if (actionOpen === "add-member") {
        path = `/ops/teams/${encodeURIComponent(teamId)}/members`;
        body = {
          user_id: Number(formUserId),
          role_in_team: formRole,
          reason: formReason.trim() || undefined,
        };
      } else if (actionOpen === "change-member-role") {
        path = `/ops/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(String(selectedMember?.membership_id || ""))}`;
        method = "PATCH";
        body = {
          role_in_team: formRole,
          reason: formReason.trim() || undefined,
        };
      } else if (actionOpen === "remove-member") {
        path = `/ops/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(String(selectedMember?.membership_id || ""))}`;
        method = "DELETE";
      }

      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (response.status === 401) {
        await handleUnauthorized();
        return;
      }
      if (!response.ok) {
        let message = "Action failed";
        try {
          const data = await response.json();
          message = data?.detail || data?.message || message;
        } catch {
          message = await response.text();
        }
        throw new Error(message);
      }
      setActionSuccess(
        "Action completed successfully. Audit log entry was created by the backend.",
      );
      setActionOpen(null);
      await loadTeam();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  if (loading) return <LoadingState />;

  if (notFound) {
    return (
      <ErrorState
        title="Team not found"
        message="This team does not exist or is no longer available."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Team detail could not load"
        message={error}
        onRetry={loadTeam}
      />
    );
  }

  if (!team) {
    return (
      <ErrorState
        title="Team detail unavailable"
        message="No team data was returned by the server."
        onRetry={loadTeam}
      />
    );
  }

  const stats = team.stats || {};
  const teamName = team.name || "Unnamed team";
  const teamSlug = team.slug || "not-available";
  const organization = team.organization;
  const canManage = canManageTeam(staff?.role);

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
        {actionSuccess ? (
          <Toast message={actionSuccess} tone="success" />
        ) : null}
        {actionError ? <Toast message={actionError} tone="error" /> : null}
        <Link
          href="/teams"
          style={{
            display: "inline-flex",
            marginBottom: 16,
            color: "#2563eb",
            fontSize: 13,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Back to teams
        </Link>

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
              Team Detail
            </p>
            <h1
              title={teamName}
              style={{
                margin: 0,
                fontSize: "clamp(26px, 4vw, 38px)",
                lineHeight: 1.1,
                letterSpacing: "-0.045em",
                overflowWrap: "anywhere",
              }}
            >
              {teamName}
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              {team.description ||
                "Team overview, members, scheduling templates, and recent booking activity."}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Badge>{teamSlug}</Badge>
            <Badge>
              {canManage
                ? `${getStaffRoleKey(staff?.role)} access`
                : "Read-only access"}
            </Badge>
            {canManage ? (
              <ActionButton onClick={() => openAction("edit-team")}>
                Edit team
              </ActionButton>
            ) : null}
            {canManage ? (
              <ActionButton
                tone="neutral"
                onClick={() => openAction("team-note")}
              >
                Add note
              </ActionButton>
            ) : null}
            {organization?.id ? (
              <Link
                href={`/organizations/${organization.id}`}
                style={{
                  display: "inline-flex",
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
                View organization
              </Link>
            ) : null}
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Members"
            value={stats.members_count}
            helper="Team members assigned"
          />
          <StatCard
            label="Event Types"
            value={stats.event_types_count}
            helper="Scheduling templates mapped"
          />
          <StatCard
            label="Bookings"
            value={stats.bookings_count}
            helper="Bookings under this team"
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Card title="Team summary">
            <DetailRow label="Team ID" value={team.id} />
            <DetailRow label="Name" value={teamName} />
            <DetailRow label="Slug" value={teamSlug} />
            <DetailRow
              label="Organization"
              value={getOrganizationLabel(organization)}
            />
            <DetailRow
              label="Created At"
              value={formatDateTime(team.created_at)}
            />
          </Card>

          <Card title="Created by">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              <Avatar person={team.created_by || { name: "Not available" }} />
              <div style={{ minWidth: 0 }}>
                <p
                  title={getPersonLabel(team.created_by)}
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: 15,
                    fontWeight: 900,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getPersonLabel(team.created_by)}
                </p>
                <p
                  title={team.created_by?.email || undefined}
                  style={{
                    margin: "5px 0 0",
                    color: "#64748b",
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {team.created_by?.email || "Email not available"}
                </p>
              </div>
            </div>
            {team.created_by?.id ? (
              <Link
                href={`/users/${team.created_by.id}`}
                style={{
                  marginTop: 14,
                  display: "inline-flex",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#2563eb",
                  borderRadius: 999,
                  padding: "8px 11px",
                  fontSize: 12,
                  fontWeight: 900,
                  textDecoration: "none",
                }}
              >
                View creator
              </Link>
            ) : null}
          </Card>
        </section>

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
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: 12,
              borderBottom: "1px solid #e2e8f0",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    border: active ? "1px solid #2563eb" : "1px solid #dbeafe",
                    background: active ? "#2563eb" : "#ffffff",
                    color: active ? "#ffffff" : "#334155",
                    borderRadius: 999,
                    padding: "9px 13px",
                    fontSize: 13,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === "overview" ? (
            <div
              style={{
                padding: 18,
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: 14,
              }}
            >
              <Card title="Recent members">
                {members.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                    No recent members found.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {members.slice(0, 4).map((member) => (
                      <div
                        key={String(member.membership_id || member.user_id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        <Avatar person={member} />
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              color: "#0f172a",
                              fontSize: 14,
                              fontWeight: 900,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {member.name || "Unnamed member"}
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0",
                              color: "#64748b",
                              fontSize: 12,
                            }}
                          >
                            {formatLabel(
                              member.role_in_team || member.role || "Member",
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Recent event types">
                {eventTypes.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                    No event types found.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {eventTypes.slice(0, 4).map((eventType) => (
                      <div
                        key={String(eventType.id || eventType.slug)}
                        style={{ minWidth: 0 }}
                      >
                        <p
                          title={eventType.title || undefined}
                          style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: 14,
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {eventType.title || "Untitled event type"}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#64748b",
                            fontSize: 12,
                          }}
                        >
                          {formatLabel(eventType.event_kind || "one_on_one")} ·{" "}
                          {eventType.duration_minutes || 0} min
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Recent bookings">
                {bookings.length === 0 ? (
                  <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                    No recent bookings found.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {bookings.slice(0, 4).map((booking) => (
                      <div
                        key={String(booking.booking_id || booking.id)}
                        style={{ minWidth: 0 }}
                      >
                        <p
                          title={booking.guest_email || undefined}
                          style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: 14,
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {booking.guest_name || "Guest"}
                        </p>
                        <p
                          style={{
                            margin: "4px 0 0",
                            color: "#64748b",
                            fontSize: 12,
                          }}
                        >
                          {formatDateTime(booking.start_time)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : activeTab === "members" ? (
            <div>
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  background: "#fbfdff",
                }}
              >
                <ActionButton onClick={() => openAction("add-member")}>
                  Add team member
                </ActionButton>
              </div>
              <MembersTab
                members={members}
                onChangeRole={(member) =>
                  openAction("change-member-role", member)
                }
                onRemove={(member) => openAction("remove-member", member)}
              />
            </div>
          ) : activeTab === "event-types" ? (
            <EventTypesTab eventTypes={eventTypes} />
          ) : activeTab === "bookings" ? (
            <BookingsTab bookings={bookings} />
          ) : (
            <EmptyState
              title="Audit timeline coming soon"
              message="Team audit events will appear here when a dedicated team audit endpoint is added."
            />
          )}
        </section>

        {actionOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.42)",
              display: "grid",
              placeItems: "center",
              padding: 18,
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: "min(100%, 520px)",
                border: "1px solid #dbeafe",
                background: "#ffffff",
                borderRadius: 22,
                boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: 18,
                  borderBottom: "1px solid #e2e8f0",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                  {formatLabel(actionOpen)}
                </h2>
                <p
                  style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}
                >
                  Confirm carefully. This action is audited.
                </p>
              </div>
              <div style={{ padding: 18, display: "grid", gap: 12 }}>
                {actionOpen === "edit-team" ? (
                  <>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Name
                      </span>
                      <input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Slug
                      </span>
                      <input
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Description
                      </span>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={3}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                          resize: "vertical",
                        }}
                      />
                    </label>
                  </>
                ) : null}
                {actionOpen === "add-member" ? (
                  <>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        User ID
                      </span>
                      <input
                        value={formUserId}
                        onChange={(e) => setFormUserId(e.target.value)}
                        placeholder="Existing org user ID"
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                    <label style={{ display: "grid", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        Role in team
                      </span>
                      <input
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        style={{
                          border: "1px solid #dbeafe",
                          borderRadius: 14,
                          padding: 11,
                        }}
                      />
                    </label>
                  </>
                ) : null}
                {actionOpen === "change-member-role" ? (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#64748b",
                      }}
                    >
                      New role
                    </span>
                    <input
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      style={{
                        border: "1px solid #dbeafe",
                        borderRadius: 14,
                        padding: 11,
                      }}
                    />
                  </label>
                ) : null}
                {actionOpen === "remove-member" ? (
                  <div
                    style={{
                      border: "1px solid #fecaca",
                      background: "#fff7f7",
                      color: "#991b1b",
                      borderRadius: 16,
                      padding: 14,
                      fontSize: 14,
                    }}
                  >
                    This removes the member from the team only. No user account
                    is deleted.
                  </div>
                ) : null}
                <label style={{ display: "grid", gap: 6 }}>
                  <span
                    style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}
                  >
                    {actionOpen === "team-note" ? "Internal note" : "Reason"}
                  </span>
                  <textarea
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    rows={3}
                    placeholder="Add a clear audit reason"
                    style={{
                      border: "1px solid #dbeafe",
                      borderRadius: 14,
                      padding: 11,
                      resize: "vertical",
                    }}
                  />
                </label>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: 18,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <ActionButton tone="neutral" onClick={closeAction}>
                  Cancel
                </ActionButton>
                <ActionButton
                  tone={actionOpen === "remove-member" ? "danger" : "primary"}
                  onClick={submitAction}
                >
                  {actionLoading ? "Working..." : "Confirm"}
                </ActionButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
