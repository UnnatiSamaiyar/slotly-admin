import type { ReactNode } from "react";

export type BookingStatusKey =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rescheduled"
  | "unknown";

export type BookingStatusMeta = {
  key: BookingStatusKey;
  label: string;
  description: string;
  tone: "amber" | "green" | "red" | "blue" | "violet" | "slate";
  bg: string;
  color: string;
  border: string;
};

const BOOKING_STATUS_META: Record<BookingStatusKey, BookingStatusMeta> = {
  pending: {
    key: "pending",
    label: "Pending",
    description: "Booking is waiting for confirmation or completion.",
    tone: "amber",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fde68a",
  },
  confirmed: {
    key: "confirmed",
    label: "Confirmed",
    description: "Booking is confirmed and scheduled.",
    tone: "green",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#bbf7d0",
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    description: "Booking has been cancelled.",
    tone: "red",
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fecaca",
  },
  completed: {
    key: "completed",
    label: "Completed",
    description: "Booking has been completed.",
    tone: "blue",
    bg: "#eff6ff",
    color: "#2563eb",
    border: "#bfdbfe",
  },
  rescheduled: {
    key: "rescheduled",
    label: "Rescheduled",
    description: "Booking has been rescheduled from its original time.",
    tone: "violet",
    bg: "#f5f3ff",
    color: "#6d28d9",
    border: "#ddd6fe",
  },
  unknown: {
    key: "unknown",
    label: "Unknown",
    description: "Status is not recognized by the admin UI.",
    tone: "slate",
    bg: "#f8fafc",
    color: "#475569",
    border: "#e2e8f0",
  },
};

const STATUS_ALIASES: Record<string, BookingStatusKey> = {
  pending: "pending",
  awaiting: "pending",
  awaiting_confirmation: "pending",
  confirmed: "confirmed",
  scheduled: "confirmed",
  success: "confirmed",
  cancelled: "cancelled",
  canceled: "cancelled",
  failed: "cancelled",
  rejected: "cancelled",
  completed: "completed",
  complete: "completed",
  done: "completed",
  rescheduled: "rescheduled",
  reschedule: "rescheduled",
};

export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatusKey, BookingStatusKey[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled", "completed"],
  cancelled: [],
  completed: [],
  rescheduled: ["confirmed", "cancelled", "completed"],
  unknown: [],
};

export function normalizeBookingStatus(status?: string | null): BookingStatusKey {
  const key = String(status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_ALIASES[key] || "unknown";
}

export function getBookingStatusMeta(status?: string | null): BookingStatusMeta {
  return BOOKING_STATUS_META[normalizeBookingStatus(status)];
}

export function canTransitionBookingStatus(from?: string | null, to?: string | null): boolean {
  const fromKey = normalizeBookingStatus(from);
  const toKey = normalizeBookingStatus(to);
  return BOOKING_STATUS_TRANSITIONS[fromKey].includes(toKey);
}

export function getAllowedBookingStatusTransitions(from?: string | null): BookingStatusMeta[] {
  return BOOKING_STATUS_TRANSITIONS[normalizeBookingStatus(from)].map((status) => BOOKING_STATUS_META[status]);
}

export function BookingStatusBadge({ status, title }: { status?: string | null; title?: ReactNode }) {
  const meta = getBookingStatusMeta(status);

  return (
    <span
      title={typeof title === "string" ? title : meta.description}
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${meta.border}`,
        background: meta.bg,
        color: meta.color,
        borderRadius: 999,
        padding: "5px 9px",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {title || meta.label}
    </span>
  );
}
