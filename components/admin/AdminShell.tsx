

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Gauge,
  History,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useAdminAuth } from "./AdminAuthProvider";
import { LoadingScreen, UnauthorizedFallback } from "./AdminStates";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const protectedRoutes = [
  "/dashboard",
  "/users",
  "/bookings",
  "/organizations",
  "/teams",
  "/event-types",
  "/group-sessions",
  "/notifications",
  "/audit-logs",
  "/staff",
  "/settings",
];

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/users", label: "Users", icon: Users },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/teams", label: "Teams", icon: ShieldCheck },
  { href: "/event-types", label: "Event Types", icon: ClipboardList },
  { href: "/group-sessions", label: "Group Sessions", icon: CalendarDays },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/audit-logs", label: "Audit Logs", icon: History },
  { href: "/staff", label: "Staff Users", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isProtectedPath(pathname: string | null) {
  if (!pathname) return false;
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname: string | null) {
  const current = navItems.find((item) => isActivePath(pathname, item.href));
  return current?.label || "Admin";
}

function formatRole(role?: string | null) {
  if (!role) return "ADMIN";
  return role.replace(/_/g, " ").toUpperCase();
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Admin";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldProtect = isProtectedPath(pathname);
  const { staff, status, isAuthenticated, logout: logoutAdmin } = useAdminAuth();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  const roleLabel = formatRole(staff?.role);
  const initials = getInitials(staff?.name, staff?.email);

  useEffect(() => {
    if (!shouldProtect) return;
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, shouldProtect, status]);

  useEffect(() => {
    setMobileSidebarOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.adminTheme = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileSidebarOpen(false);
      setProfileOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 1023) setDesktopSidebarCollapsed(false);
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function logout() {
    logoutAdmin();
    router.replace("/login");
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function toggleDesktopSidebar() {
    setDesktopSidebarCollapsed((current) => !current);
  }

  if (!shouldProtect) {
    return <>{children}</>;
  }

  if (shouldProtect && status === "loading") {
    return <LoadingScreen message="Checking admin session..." />;
  }

  if (shouldProtect && !isAuthenticated) {
    return <UnauthorizedFallback />;
  }

  return (
    <div
      className="admin-shell"
      data-theme={theme}
      data-sidebar-collapsed={desktopSidebarCollapsed ? "true" : "false"}
      data-mobile-sidebar-open={mobileSidebarOpen ? "true" : "false"}
    >
      <button
        type="button"
        className="admin-backdrop"
        aria-label="Close sidebar"
        onClick={() => setMobileSidebarOpen(false)}
      />

      <aside className="admin-sidebar" aria-label="Admin sidebar">
        <div className="admin-sidebar-scroll">
          <div className="admin-brand-row">
            <Link href="/dashboard" className="admin-brand-link" onClick={() => setMobileSidebarOpen(false)}>
              <span className="admin-brand-mark">S</span>
              <span className="admin-brand-copy">
                <span className="admin-brand-name">Slotly Admin</span>
                <span className="admin-brand-caption">Control panel</span>
              </span>
            </Link>

            <button
              type="button"
              className="admin-sidebar-collapse"
              onClick={toggleDesktopSidebar}
              aria-label={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {desktopSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="admin-mobile-close"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="admin-role-card">
            <div className="admin-role-label">Signed in role</div>
            <div className="admin-role-badge">{roleLabel}</div>
          </div>

          <nav className="admin-nav" aria-label="Admin navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link${active ? " admin-nav-link-active" : ""}`}
                  title={item.label}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <Icon className="admin-nav-icon" size={18} strokeWidth={2} />
                  <span className="admin-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-user-box" title={staff?.email || "admin"}>
            <span className="admin-sidebar-avatar">{initials}</span>
            <span className="admin-sidebar-user-copy">
              <span className="admin-sidebar-user-name">{staff?.name || "Admin User"}</span>
              <span className="admin-sidebar-user-email">{staff?.email || "admin"}</span>
            </span>
          </div>
          <button type="button" onClick={logout} className="admin-sidebar-logout-button" title="Logout">
            <LogOut size={17} />
            <span className="admin-sidebar-logout-text">Logout</span>
          </button>
        </div>
      </aside>

      <div className="admin-content-wrap">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="admin-menu-button"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="admin-title-stack">
              <div className="admin-kicker">Admin App</div>
              <h1 className="admin-page-title">{pageTitle}</h1>
            </div>
          </div>

          <div className="admin-topbar-right">
            {/* Search — visible but disabled */}
            <form
              className="admin-global-search admin-global-search-desktop"
              onSubmit={handleSearchSubmit}
              style={{ opacity: 0.45, pointerEvents: "none", cursor: "not-allowed" }}
            >
              <Search size={17} />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search admin panel"
                aria-label="Global search"
                disabled
              />
            </form>

            {/* Notifications */}
            <button
              type="button"
              className="admin-icon-button admin-notification-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="admin-notification-dot" />
            </button>

            {/* Theme toggle — visible but disabled */}
            <button
              type="button"
              className="admin-icon-button admin-theme-button"
              aria-label="Toggle theme"
              title="Toggle theme (coming soon)"
              disabled
              style={{ opacity: 0.45, cursor: "not-allowed" }}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Profile menu */}
            <div className="admin-profile-menu-wrap">
              <button
                type="button"
                onClick={() => setProfileOpen((current) => !current)}
                className="admin-profile-button"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="admin-avatar">{initials}</span>
                <span className="admin-profile-text-wrap">
                  <span className="admin-profile-name">{staff?.name || "Admin User"}</span>
                  <span className="admin-profile-email">{staff?.email || "admin"}</span>
                </span>
                <span className="admin-topbar-role-badge">{roleLabel}</span>
                <ChevronDown className="admin-profile-chevron" size={16} />
              </button>

              {profileOpen ? (
                <div className="admin-profile-dropdown" role="menu">
                  <div className="admin-dropdown-header">
                    <div className="admin-dropdown-name">{staff?.name || "Admin User"}</div>
                    <div className="admin-dropdown-email">{staff?.email || "admin"}</div>
                    <div className="admin-dropdown-role">{roleLabel}</div>
                  </div>
                  <Link href="/settings" className="admin-dropdown-item" role="menuitem">
                    <Settings size={16} />
                    <span>Profile & settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="admin-dropdown-item admin-dropdown-logout"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="admin-main-content">{children}</main>
      </div>

      <style jsx global>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        html,
        body {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          margin: 0;
        }

        img, svg, canvas, video {
          max-width: 100%;
        }

        .admin-shell {
          --admin-sidebar-width: 248px;
          --admin-sidebar-collapsed-width: 68px;
          --admin-current-sidebar-width: var(--admin-sidebar-width);
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          background: #f6f9ff;
          color: #0f172a;
          overflow-x: hidden;
        }

        .admin-shell[data-theme="dark"] {
          background: #0f172a;
          color: #e5edf8;
        }

        .admin-shell[data-sidebar-collapsed="true"] {
          --admin-current-sidebar-width: var(--admin-sidebar-collapsed-width);
        }

        /* ── Sidebar ── */
        .admin-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 50;
          width: var(--admin-current-sidebar-width);
          height: 100vh;
          height: 100dvh;
          background: #0b1220;
          color: #ffffff;
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translate3d(0,0,0);
          transition: width 220ms ease, transform 220ms ease, box-shadow 220ms ease;
          will-change: width, transform;
        }

        .admin-sidebar-scroll {
          min-height: 0;
          flex: 1 1 auto;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          padding: 14px 10px 8px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .admin-sidebar-scroll::-webkit-scrollbar,
        .admin-sidebar::-webkit-scrollbar {
          width: 0; height: 0; display: none;
        }

        /* ── Brand row ── */
        .admin-brand-row {
          min-width: 0;
          min-height: 56px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 2px 4px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          margin-bottom: 12px;
        }

        .admin-brand-link {
          min-width: 0;
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          gap: 10px;
          color: inherit;
          text-decoration: none;
          overflow: hidden;
        }

        .admin-brand-mark {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: #2563eb;
          color: #ffffff;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: -0.04em;
          flex: 0 0 34px;
          box-shadow: 0 8px 24px rgba(37,99,235,0.28);
        }

        .admin-brand-copy,
        .admin-sidebar-user-copy,
        .admin-nav-label,
        .admin-sidebar-logout-text {
          min-width: 0;
          transition: opacity 160ms ease, width 160ms ease;
        }

        .admin-brand-name {
          display: block;
          font-size: 13px;
          font-weight: 750;
          letter-spacing: -0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #ffffff;
        }

        .admin-brand-caption {
          display: block;
          font-size: 11px;
          color: #93a4bd;
          margin-top: 1px;
          white-space: nowrap;
        }

        /* ── Collapse / mobile close buttons ── */
        .admin-sidebar-collapse,
        .admin-mobile-close {
          width: 36px;
          height: 36px;
          min-width: 36px;
          min-height: 36px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 11px;
          background: rgba(255,255,255,0.055);
          color: #dbe7f6;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          flex: 0 0 36px;
          transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
        }

        .admin-sidebar-collapse:hover,
        .admin-mobile-close:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(96,165,250,0.35);
          color: #ffffff;
        }

        .admin-mobile-close {
          display: none;
        }

        /* ── Role card ── */
        .admin-role-card {
          border: 1px solid rgba(96,165,250,0.18);
          border-radius: 13px;
          background: rgba(37,99,235,0.1);
          padding: 10px 12px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
        }

        .admin-role-label {
          color: #93a4bd;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          margin: 0;
        }

        .admin-role-badge {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          border-radius: 999px;
          background: #2563eb;
          color: #ffffff;
          padding: 0 9px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.03em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }

        /* ── Nav ── */
        .admin-nav {
          display: grid;
          gap: 3px;
        }

        .admin-nav-link {
          min-width: 0;
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px;
          border-radius: 11px;
          color: #b8c3d4;
          text-decoration: none;
          font-size: 12.5px;
          font-weight: 650;
          outline: none;
          overflow: hidden;
          transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease;
        }

        .admin-nav-link:hover {
          background: rgba(255,255,255,0.06);
          color: #ffffff;
        }

        .admin-nav-link:focus-visible {
          box-shadow: 0 0 0 3px rgba(96,165,250,0.3);
        }

        .admin-nav-link-active {
          background: rgba(37,99,235,0.23);
          color: #ffffff;
          box-shadow: inset 0 0 0 1px rgba(96,165,250,0.22);
        }

        .admin-nav-icon {
          flex: 0 0 auto;
        }

        .admin-nav-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Sidebar bottom ── */
        .admin-sidebar-bottom {
          flex: 0 0 auto;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding: 12px 10px;
          display: grid;
          gap: 8px;
          overflow: hidden;
        }

        .admin-sidebar-user-box {
          min-width: 0;
          border-radius: 13px;
          background: rgba(255,255,255,0.05);
          padding: 9px 10px;
          display: flex;
          align-items: center;
          gap: 9px;
          overflow: hidden;
        }

        .admin-sidebar-avatar {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #2563eb;
          color: #ffffff;
          font-size: 11px;
          font-weight: 900;
        }

        .admin-sidebar-user-name {
          display: block;
          font-size: 12.5px;
          font-weight: 800;
          color: #ffffff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-sidebar-user-email {
          display: block;
          margin-top: 1px;
          font-size: 11px;
          color: #93a4bd;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-sidebar-logout-button {
          width: 100%;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 11px;
          background: rgba(255,255,255,0.06);
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          overflow: hidden;
        }

        /* ── Collapsed sidebar states ── */
        .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-scroll {
          padding: 14px 8px 8px;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-brand-row {
          justify-content: center;
          padding: 2px 0 14px;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-brand-link,
        .admin-shell[data-sidebar-collapsed="true"] .admin-brand-copy,
        .admin-shell[data-sidebar-collapsed="true"] .admin-nav-label,
        .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-user-copy,
        .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-logout-text {
          display: none;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-role-card {
          display: none;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-nav {
          gap: 6px;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-nav-link {
          width: 42px;
          height: 42px;
          min-height: 42px;
          justify-content: center;
          padding: 0;
          margin-inline: auto;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-bottom {
          padding: 10px 8px;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-user-box {
          width: 42px;
          height: 42px;
          justify-content: center;
          padding: 0;
          margin-inline: auto;
        }

        .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-logout-button {
          width: 42px;
          height: 42px;
          justify-content: center;
          padding: 0;
          margin-inline: auto;
        }

        /* ── Content wrap ── */
        .admin-content-wrap {
          min-width: 0;
          width: auto;
          max-width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          margin-left: var(--admin-current-sidebar-width);
          display: flex;
          flex-direction: column;
          transition: margin-left 220ms ease;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        /* ── Topbar ── */
        .admin-topbar {
          min-height: 60px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          background: rgba(255,255,255,0.92);
          border-bottom: 1px solid #e4ecf7;
          backdrop-filter: blur(14px);
          position: sticky;
          top: 0;
          z-index: 30;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .admin-shell[data-theme="dark"] .admin-topbar {
          background: rgba(15,23,42,0.92);
          border-bottom-color: rgba(148,163,184,0.18);
        }

        .admin-topbar-left {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
        }

        .admin-title-stack {
          min-width: 0;
          overflow: hidden;
        }

        .admin-kicker {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #2563eb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-page-title {
          margin: 0;
          color: #0f172a;
          font-size: 18px;
          line-height: 1.2;
          letter-spacing: -0.03em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-shell[data-theme="dark"] .admin-page-title {
          color: #f8fafc;
        }

        .admin-topbar-right {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-shrink: 0;
        }

        /* ── Topbar buttons ── */
        .admin-menu-button,
        .admin-icon-button {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          border: 1px solid #dbe7f6;
          background: #ffffff;
          color: #334155;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: 0 0 auto;
          position: relative;
        }

        .admin-menu-button {
          display: none;
        }

        .admin-shell[data-theme="dark"] .admin-menu-button,
        .admin-shell[data-theme="dark"] .admin-icon-button {
          border-color: rgba(148,163,184,0.22);
          background: #111c2f;
          color: #cbd5e1;
        }

        /* ── Search ── */
        .admin-global-search {
          height: 38px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe7f6;
          border-radius: 999px;
          background: #ffffff;
          color: #64748b;
          padding: 0 13px;
          min-width: 0;
        }

        .admin-global-search-desktop {
          width: clamp(180px, 22vw, 320px);
        }

        .admin-global-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font-size: 13px;
        }

        .admin-global-search input::placeholder {
          color: #94a3b8;
        }

        .admin-shell[data-theme="dark"] .admin-global-search {
          border-color: rgba(148,163,184,0.22);
          background: #111c2f;
          color: #94a3b8;
        }

        .admin-shell[data-theme="dark"] .admin-global-search input {
          color: #e5edf8;
        }

        /* ── Notification dot ── */
        .admin-notification-dot {
          position: absolute;
          right: 9px;
          top: 8px;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #2563eb;
          box-shadow: 0 0 0 2px #ffffff;
        }

        .admin-shell[data-theme="dark"] .admin-notification-dot {
          box-shadow: 0 0 0 2px #111c2f;
        }

        /* ── Profile button ── */
        .admin-profile-menu-wrap {
          position: relative;
          flex: 0 0 auto;
        }

        .admin-profile-button {
          height: 40px;
          max-width: 360px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #dbe7f6;
          border-radius: 999px;
          background: #ffffff;
          color: #334155;
          padding: 0 10px 0 5px;
          cursor: pointer;
          overflow: hidden;
        }

        .admin-shell[data-theme="dark"] .admin-profile-button {
          border-color: rgba(148,163,184,0.22);
          background: #111c2f;
          color: #cbd5e1;
        }

        .admin-avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: #2563eb;
          color: #ffffff;
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 900;
          flex: 0 0 30px;
        }

        .admin-profile-text-wrap {
          display: grid;
          min-width: 0;
          text-align: left;
        }

        .admin-profile-name {
          max-width: 110px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #0f172a;
          font-size: 12.5px;
          font-weight: 800;
          line-height: 1.1;
        }

        .admin-shell[data-theme="dark"] .admin-profile-name {
          color: #f8fafc;
        }

        .admin-profile-email {
          max-width: 130px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #64748b;
          font-size: 11px;
          line-height: 1.2;
          margin-top: 1px;
        }

        .admin-topbar-role-badge {
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0 7px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.04em;
          flex: 0 0 auto;
          white-space: nowrap;
        }

        /* ── Profile dropdown ── */
        .admin-profile-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: min(250px, calc(100vw - 24px));
          border-radius: 16px;
          border: 1px solid #dbe7f6;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(15,23,42,0.14);
          padding: 7px;
          z-index: 70;
        }

        .admin-shell[data-theme="dark"] .admin-profile-dropdown {
          border-color: rgba(148,163,184,0.22);
          background: #111c2f;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }

        .admin-dropdown-header {
          padding: 9px 9px 11px;
          border-bottom: 1px solid #e4ecf7;
          margin-bottom: 5px;
        }

        .admin-shell[data-theme="dark"] .admin-dropdown-header {
          border-bottom-color: rgba(148,163,184,0.18);
        }

        .admin-dropdown-name {
          color: #0f172a;
          font-size: 13px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-shell[data-theme="dark"] .admin-dropdown-name {
          color: #f8fafc;
        }

        .admin-dropdown-email {
          color: #64748b;
          font-size: 11.5px;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .admin-dropdown-role {
          display: inline-flex;
          margin-top: 8px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 4px 8px;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.04em;
        }

        .admin-dropdown-item {
          width: 100%;
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #334155;
          text-decoration: none;
          padding: 0 9px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          text-align: left;
        }

        .admin-dropdown-item:hover {
          background: #f1f6ff;
        }

        .admin-shell[data-theme="dark"] .admin-dropdown-item {
          color: #cbd5e1;
        }

        .admin-shell[data-theme="dark"] .admin-dropdown-item:hover {
          background: rgba(255,255,255,0.06);
        }

        .admin-dropdown-logout {
          color: #dc2626;
        }

        /* ── Main content ── */
        .admin-main-content {
          min-width: 0;
          width: 100%;
          max-width: 100%;
          padding: 16px;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .admin-main-content > * {
          min-width: 0;
          max-width: 100%;
        }

        /* ── Backdrop ── */
        .admin-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 45;
          border: 0;
          background: rgba(15,23,42,0.52);
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .admin-shell[data-mobile-sidebar-open="true"] .admin-backdrop {
          display: block;
        }

        /* ════════════════════════════════════════
           RESPONSIVE BREAKPOINTS
        ════════════════════════════════════════ */

        @media (max-width: 1180px) {
          .admin-global-search-desktop {
            width: clamp(160px, 18vw, 260px);
          }
          .admin-profile-email,
          .admin-topbar-role-badge {
            display: none;
          }
        }

        @media (max-width: 1023px) {
          .admin-shell,
          .admin-shell[data-sidebar-collapsed="true"] {
            --admin-current-sidebar-width: 0px;
          }

          .admin-sidebar,
          .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar {
            width: min(300px, calc(100vw - 24px));
            transform: translate3d(calc(-100% - 16px), 0, 0);
            box-shadow: none;
          }

          .admin-shell[data-mobile-sidebar-open="true"] .admin-sidebar,
          .admin-shell[data-sidebar-collapsed="true"][data-mobile-sidebar-open="true"] .admin-sidebar {
            transform: translate3d(0, 0, 0);
            box-shadow: 24px 0 60px rgba(15,23,42,0.22);
          }

          .admin-content-wrap,
          .admin-shell[data-sidebar-collapsed="true"] .admin-content-wrap {
            margin-left: 0;
            width: 100%;
            max-width: 100vw;
            overflow-x: hidden;
          }

          .admin-menu-button { display: inline-flex; }
          .admin-sidebar-collapse { display: none; }
          .admin-mobile-close { display: inline-flex; }

          /* restore collapsed sidebar to full on mobile */
          .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-scroll {
            padding: 14px 10px 8px;
          }
          .admin-shell[data-sidebar-collapsed="true"] .admin-brand-row {
            justify-content: flex-start;
            padding: 2px 4px 14px;
          }
          .admin-shell[data-sidebar-collapsed="true"] .admin-brand-link { display: flex; }
          .admin-shell[data-sidebar-collapsed="true"] .admin-brand-copy,
          .admin-shell[data-sidebar-collapsed="true"] .admin-nav-label,
          .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-user-copy,
          .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-logout-text { display: block; }
          .admin-shell[data-sidebar-collapsed="true"] .admin-role-card { display: block; }
          .admin-shell[data-sidebar-collapsed="true"] .admin-nav { gap: 3px; }
          .admin-shell[data-sidebar-collapsed="true"] .admin-nav-link {
            width: auto; height: auto; min-height: 38px;
            justify-content: flex-start; padding: 0 10px; margin-inline: 0;
          }
          .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-bottom { padding: 12px 10px; }
          .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-user-box {
            width: auto; height: auto; justify-content: flex-start; padding: 9px 10px; margin-inline: 0;
          }
          .admin-shell[data-sidebar-collapsed="true"] .admin-sidebar-logout-button {
            width: 100%; height: 38px; justify-content: center; padding: 0; margin-inline: 0;
          }

          .admin-topbar { min-height: 56px; padding: 9px 14px; }
          .admin-page-title { font-size: 17px; }
          .admin-main-content { padding: 12px; }
        }

        @media (max-width: 760px) {
          .admin-topbar {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
            padding: 9px 12px;
            min-height: 52px;
          }
          .admin-global-search-desktop { display: none; }
          .admin-kicker { display: none; }
          .admin-page-title { font-size: 16px; }
          .admin-topbar-left { gap: 8px; }
          .admin-topbar-right { gap: 7px; }
          .admin-profile-button {
            width: 36px; height: 36px;
            padding: 0; justify-content: center; border-radius: 11px;
          }
          .admin-profile-text-wrap,
          .admin-profile-chevron,
          .admin-topbar-role-badge { display: none; }
          .admin-menu-button,
          .admin-icon-button { width: 36px; height: 36px; border-radius: 11px; }
          .admin-avatar { width: 26px; height: 26px; flex: 0 0 26px; font-size: 10px; }
        }

        @media (max-width: 520px) {
          .admin-topbar { padding: 8px 10px; min-height: 50px; gap: 6px; }
          .admin-menu-button,
          .admin-icon-button,
          .admin-profile-button { width: 34px; height: 34px; border-radius: 10px; }
          .admin-avatar { width: 24px; height: 24px; flex: 0 0 24px; }
          .admin-page-title { font-size: 15px; }
          .admin-main-content { padding: 10px; }
          .admin-profile-dropdown {
            position: fixed;
            top: 56px; right: 8px; left: 8px; width: auto;
          }
        }

        @media (max-width: 430px) {
          .admin-topbar { gap: 5px; }
          .admin-topbar-right { gap: 5px; }
          .admin-notification-button { display: none; }
          .admin-page-title { font-size: 14px; }
        }

        @media (max-width: 370px) {
          .admin-menu-button,
          .admin-icon-button,
          .admin-profile-button { width: 32px; height: 32px; }
          .admin-theme-button { display: none; }
          .admin-page-title { font-size: 13px; }
          .admin-topbar-right { gap: 4px; }
        }

        @media (max-height: 680px) and (min-width: 1024px) {
          .admin-sidebar-scroll { padding-top: 10px; }
          .admin-brand-row { min-height: 48px; margin-bottom: 8px; padding-bottom: 10px; }
          .admin-role-card { margin-bottom: 8px; padding: 8px 10px; }
          .admin-nav { gap: 2px; }
          .admin-nav-link { min-height: 34px; }
          .admin-sidebar-bottom { padding: 8px 10px; }
        }
      `}</style>
    </div>
  );
}