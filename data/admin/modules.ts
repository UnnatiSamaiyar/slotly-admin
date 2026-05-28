export type AdminModuleKey =
  | "users"
  | "bookings"
  | "organizations"
  | "teams"
  | "eventTypes"
  | "groupSessions"
  | "notifications"
  | "auditLogs"
  | "staff"
  | "settings";

export type AdminModuleMeta = {
  title: string;
  description: string;
  moduleName: string;
};

export const adminModules: Record<AdminModuleKey, AdminModuleMeta> = {
  users: {
    title: "Users",
    description: "Manage platform users, user status, and future user-level controls from one clean admin screen.",
    moduleName: "Users",
  },
  bookings: {
    title: "Bookings",
    description: "Review all bookings, booking status, attendee details, and operational booking activity.",
    moduleName: "Bookings",
  },
  organizations: {
    title: "Organizations",
    description: "Manage customer organizations, workspace records, ownership, and account-level controls.",
    moduleName: "Organizations",
  },
  teams: {
    title: "Teams",
    description: "Prepare team management for members, team assignment, and scheduling ownership workflows.",
    moduleName: "Teams",
  },
  eventTypes: {
    title: "Event Types",
    description: "Create and manage event type definitions, durations, availability logic, and routing behavior.",
    moduleName: "Event Types",
  },
  groupSessions: {
    title: "Group Sessions",
    description: "Manage upcoming group sessions, registrations, waitlists, and group capacity rules.",
    moduleName: "Group Sessions",
  },
  notifications: {
    title: "Notifications",
    description: "Centralize admin alerts, system notifications, delivery status, and notification history.",
    moduleName: "Notifications",
  },
  auditLogs: {
    title: "Audit Logs",
    description: "Track important admin actions, security events, login activity, and operational changes.",
    moduleName: "Audit Logs",
  },
  staff: {
    title: "Staff Users",
    description: "Manage internal admin staff, roles, access levels, and account permissions.",
    moduleName: "Staff Users",
  },
  settings: {
    title: "Settings",
    description: "Configure admin preferences, security settings, profile details, and app-level controls.",
    moduleName: "Settings",
  },
};
