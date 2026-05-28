export const API_BASE =
  process.env.NEXT_PUBLIC_OPS_API_BASE || "http://127.0.0.1:8000";

const TOKEN_KEY = "slotly_ops_token";

export type StaffMe = {
  id: number;
  email: string;
  name?: string | null;
  role: string;
};

export type DashboardSummary = {
  users: { total: number };
  bookings: {
    total: number;
    today: number;
    upcoming: number;
    pending: number;
    cancelled: number;
  };
  enterprise: {
    organizations: number;
    teams: number;
  };
  events: {
    eventTypes: number;
    groupSessions: number;
    groupRegistrants: number;
  };
  system: {
    unreadNotifications: number;
    openRescheduleRequests: number;
    activeSlotHolds: number;
  };
};

export type RecentBooking = {
  id?: number | string;
  bookingId?: number | string;
  guestName?: string | null;
  guestEmail?: string | null;
  hostUser?:
    | string
    | {
        name?: string | null;
        email?: string | null;
      }
    | null;
  hostName?: string | null;
  hostEmail?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  meetingMode?: string | null;
  organization?: string | null;
  team?: string | null;
  createdAt?: string | null;
};

export type RecentUser = {
  id?: number | string;
  userId?: number | string;
  name?: string | null;
  email?: string | null;
  authProvider?: string | null;
  timezone?: string | null;
  picture?: string | null;
  totalBookings?: number | null;
  totalEventTypes?: number | null;
};

export type RecentActivity = {
  id?: number | string;
  action?: string | null;
  entityType?: string | null;
  entity_type?: string | null;
  entityId?: number | string | null;
  entity_id?: number | string | null;
  staffUser?:
    | string
    | {
        name?: string | null;
        email?: string | null;
      }
    | null;
  staff_user?:
    | string
    | {
        name?: string | null;
        email?: string | null;
      }
    | null;
  staffName?: string | null;
  staffEmail?: string | null;
  staff_name?: string | null;
  staff_email?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  metaSummary?: string | null;
  meta_summary?: string | null;
  meta?: unknown;
};

export type OpsUser = {
  id: number | string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  timezone?: string | null;
  auth_provider?: string | null;
  authProvider?: string | null;
  brand_logo_url?: string | null;
  brandLogoUrl?: string | null;
  total_bookings?: number | null;
  totalBookings?: number | null;
  total_event_types?: number | null;
  totalEventTypes?: number | null;
  total_contacts?: number | null;
  totalContacts?: number | null;
  total_organizations?: number | null;
  totalOrganizations?: number | null;
  total_teams?: number | null;
  totalTeams?: number | null;
  google_connected?: boolean | null;
  googleConnected?: boolean | null;
  status?: string | null;
  is_active?: boolean | null;
  isActive?: boolean | null;
};

export type UsersListResponse = {
  items: OpsUser[];
  page: number;
  limit: number;
  total: number;
  total_pages?: number;
  totalPages?: number;
};

export type OpsUserDetail = {
  id?: number | string;
  userId?: number | string;
  user_id?: number | string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  timezone?: string | null;
  auth_provider?: string | null;
  authProvider?: string | null;
  brand_logo_url?: string | null;
  brandLogoUrl?: string | null;
  google_connected?: boolean | null;
  googleConnected?: boolean | null;
  has_google_connection?: boolean | null;
  hasGoogleConnection?: boolean | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  counts?: {
    bookings?: number | null;
    upcomingBookings?: number | null;
    upcoming_bookings?: number | null;
    completedBookings?: number | null;
    completed_bookings?: number | null;
    eventTypes?: number | null;
    event_types?: number | null;
    contacts?: number | null;
    organizations?: number | null;
    teams?: number | null;
    notifications?: number | null;
  };
  booking_count?: number | null;
  bookingCount?: number | null;
  upcoming_booking_count?: number | null;
  upcomingBookingCount?: number | null;
  completed_booking_count?: number | null;
  completedBookingCount?: number | null;
  event_type_count?: number | null;
  eventTypeCount?: number | null;
  contact_count?: number | null;
  contactCount?: number | null;
  organization_count?: number | null;
  organizationCount?: number | null;
  team_count?: number | null;
  teamCount?: number | null;
  notification_count?: number | null;
  notificationCount?: number | null;
  recent_activity?: RecentActivity[];
  recentActivity?: RecentActivity[];
};


export type UserBooking = {
  id?: number | string;
  bookingId?: number | string;
  guestName?: string | null;
  guestEmail?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  timelineStatus?: string | null;
  meetingMode?: string | null;
  meetLink?: string | null;
  organization?: string | null;
  team?: string | null;
  createdAt?: string | null;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = response.status === 401 ? "Unauthorized" : "Request failed";
    if (response.status === 404) message = "Not Found";
    try {
      const body = await response.json();
      message = body?.detail || body?.message || message;
    } catch {
      try {
        message = await response.text();
      } catch {
        // keep default message
      }
    }
    throw new Error(message);
  }

  return response;
}

function pickArray<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

export async function getCurrentStaff(): Promise<StaffMe> {
  const response = await apiFetch("/ops/me");
  return response.json();
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiFetch("/ops/dashboard/summary");
  return response.json();
}

export async function getRecentBookings(limit = 10): Promise<RecentBooking[]> {
  const response = await apiFetch(`/ops/dashboard/recent-bookings?limit=${limit}`);
  const data = await response.json();
  return pickArray<RecentBooking>(data, ["bookings", "items", "data", "results"]);
}

export async function getRecentUsers(limit = 10): Promise<RecentUser[]> {
  const response = await apiFetch(`/ops/dashboard/recent-users?limit=${limit}`);
  const data = await response.json();
  return pickArray<RecentUser>(data, ["users", "items", "data", "results"]);
}

export async function getRecentActivity(limit = 10): Promise<RecentActivity[]> {
  const response = await apiFetch(`/ops/dashboard/recent-activity?limit=${limit}`);
  const data = await response.json();
  return pickArray<RecentActivity>(data, ["activity", "activities", "auditLogs", "logs", "items", "data", "results"]);
}

export async function getOpsUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  authProvider?: string;
  timezone?: string;
  hasBookings?: string;
  hasOrganizations?: string;
  googleConnected?: string;
  sort?: string;
} = {}): Promise<UsersListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 20));
  query.set("sort", params.sort || "created_at_desc");

  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.authProvider?.trim() && params.authProvider !== "all") {
    query.set("auth_provider", params.authProvider.trim());
  }
  if (params.timezone?.trim()) query.set("timezone", params.timezone.trim());
  if (params.hasBookings?.trim() && params.hasBookings !== "all") query.set("has_bookings", params.hasBookings.trim());
  if (params.hasOrganizations?.trim() && params.hasOrganizations !== "all") query.set("has_organizations", params.hasOrganizations.trim());
  if (params.googleConnected?.trim() && params.googleConnected !== "all") query.set("google_connected", params.googleConnected.trim());

  const response = await apiFetch(`/ops/users?${query.toString()}`);
  const data = await response.json();

  const items = Array.isArray(data)
    ? data
    : Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.users)
        ? data.users
        : Array.isArray(data.data)
          ? data.data
          : [];

  const pagination = data?.pagination && typeof data.pagination === "object" ? data.pagination : {};
  const total = Number(data.total ?? pagination.total ?? data.count ?? items.length ?? 0);
  const limit = Number(data.limit ?? pagination.limit ?? params.limit ?? 20);
  const page = Number(data.page ?? pagination.page ?? params.page ?? 1);

  return {
    items,
    page,
    limit,
    total,
    total_pages: Number(data.total_pages ?? data.totalPages ?? pagination.total_pages ?? pagination.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, limit)))),
  };
}

export async function getOpsUserDetail(userId: string | number): Promise<OpsUserDetail> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}`);
  const data = await response.json();

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (record.user && typeof record.user === "object") {
      return { ...(record.user as OpsUserDetail), ...(record.overview as object || {}), counts: (record.counts as OpsUserDetail["counts"]) || (record.user as OpsUserDetail).counts };
    }
  }

  return data as OpsUserDetail;
}


export async function getOpsUserBookings(userId: string | number, limit = 20): Promise<UserBooking[]> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/bookings?limit=${limit}`);
  const data = await response.json();
  return pickArray<UserBooking>(data, ["bookings", "items", "data", "results"]);
}

export type UserEventType = {
  id?: number | string;
  title?: string | null;
  slug?: string | null;
  duration?: number | null;
  durationMinutes?: number | null;
  meetingMode?: string | null;
  meeting_mode?: string | null;
  eventKind?: string | null;
  event_kind?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  organization?: string | null;
  org?: string | null;
  team?: string | null;
  capacity?: number | null;
  groupCapacity?: number | null;
  group_capacity?: number | null;
  waitlist?: boolean | null;
  allowWaitlist?: boolean | null;
  allow_waitlist?: boolean | null;
};

export type UserBookingProfile = {
  id?: number | string;
  slug?: string | null;
  title?: string | null;
  duration?: number | null;
  durationMinutes?: number | null;
  duration_minutes?: number | null;
  timezone?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
  bufferBefore?: number | null;
  bufferBeforeMinutes?: number | null;
  buffer_before_minutes?: number | null;
  bufferAfter?: number | null;
  bufferAfterMinutes?: number | null;
  buffer_after_minutes?: number | null;
  minNotice?: number | null;
  minNoticeMinutes?: number | null;
  min_notice_minutes?: number | null;
  maxDaysAhead?: number | null;
  max_days_ahead?: number | null;
};

export type UserContact = {
  id?: number | string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
};


export type UserOrganizationMembership = {
  id?: number | string;
  organizationId?: number | string;
  organization_id?: number | string;
  organizationName?: string | null;
  organization_name?: string | null;
  name?: string | null;
  slug?: string | null;
  role?: string | null;
  reportsTo?: string | null;
  reports_to?: string | null;
  joinedAt?: string | null;
  joined_at?: string | null;
};

export type UserTeamMembership = {
  id?: number | string;
  teamId?: number | string;
  team_id?: number | string;
  teamName?: string | null;
  team_name?: string | null;
  name?: string | null;
  slug?: string | null;
  organization?: string | null;
  role?: string | null;
  roleInTeam?: string | null;
  role_in_team?: string | null;
  joinedAt?: string | null;
  joined_at?: string | null;
};

export type UserNotification = {
  id?: number | string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  actionUrl?: string | null;
  action_url?: string | null;
  isRead?: boolean | null;
  is_read?: boolean | null;
  readStatus?: string | null;
  read_status?: string | null;
  isSent?: boolean | null;
  is_sent?: boolean | null;
  sentStatus?: string | null;
  sent_status?: string | null;
  deliverAt?: string | null;
  deliver_at?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  metadataPreview?: string | null;
  metadata_preview?: string | null;
};

export async function getOpsUserEventTypes(userId: string | number, limit = 50): Promise<UserEventType[]> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/event-types?limit=${limit}`);
  const data = await response.json();
  return pickArray<UserEventType>(data, ["eventTypes", "event_types", "items", "data", "results"]);
}

export async function getOpsUserBookingProfiles(userId: string | number, limit = 50): Promise<UserBookingProfile[]> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/booking-profiles?limit=${limit}`);
  const data = await response.json();
  return pickArray<UserBookingProfile>(data, ["bookingProfiles", "booking_profiles", "profiles", "items", "data", "results"]);
}


export async function getOpsUserOrganizations(userId: string | number, limit = 100): Promise<UserOrganizationMembership[]> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/organizations?limit=${limit}`);
  const data = await response.json();
  return pickArray<UserOrganizationMembership>(data, ["organizations", "memberships", "items", "data", "results"]);
}

export async function getOpsUserTeams(userId: string | number, limit = 100): Promise<UserTeamMembership[]> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/teams?limit=${limit}`);
  const data = await response.json();
  return pickArray<UserTeamMembership>(data, ["teams", "memberships", "items", "data", "results"]);
}

export async function getOpsUserContacts(userId: string | number, limit = 100, search = ""): Promise<UserContact[]> {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (search.trim()) query.set("search", search.trim());

  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/contacts?${query.toString()}`);
  const data = await response.json();
  return pickArray<UserContact>(data, ["contacts", "items", "data", "results"]);
}

export async function getOpsUserNotifications(userId: string | number, limit = 100): Promise<UserNotification[]> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/notifications?limit=${limit}`);
  const data = await response.json();
  return pickArray<UserNotification>(data, ["notifications", "items", "data", "results"]);
}


export type SafeUserActionResponse = {
  status?: string;
  user_id?: number | string;
  userId?: number | string;
  action?: string;
  message?: string;
  is_active?: boolean;
  isActive?: boolean;
  user_status?: string;
  userStatus?: string;
};

export async function updateOpsUserStatus(
  userId: string | number,
  isActive: boolean,
  reason: string
): Promise<SafeUserActionResponse> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive, reason: reason.trim() || null }),
  });
  return response.json();
}

export async function forceLogoutOpsUser(
  userId: string | number,
  reason: string
): Promise<SafeUserActionResponse> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/force-logout`, {
    method: "POST",
    body: JSON.stringify({ reason: reason.trim() || null }),
  });
  return response.json();
}

export async function clearOpsUserGoogleToken(
  userId: string | number,
  reason: string
): Promise<SafeUserActionResponse> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/clear-google-token`, {
    method: "POST",
    body: JSON.stringify({ reason: reason.trim() || null }),
  });
  return response.json();
}

export async function triggerOpsUserPasswordReset(
  userId: string | number,
  reason: string
): Promise<SafeUserActionResponse> {
  const response = await apiFetch(`/ops/users/${encodeURIComponent(String(userId))}/password-reset`, {
    method: "POST",
    body: JSON.stringify({ reason: reason.trim() || null }),
  });
  return response.json();
}
