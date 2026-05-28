# Slotly Admin Client

Minimal cleaned Next.js admin frontend.

## Current phases

- Phase 1.2: Admin route structure
- Phase 1.3: Protected admin layout with sidebar, topbar, and responsive wrapper

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Routes

```txt
/login
/dashboard
/users
/bookings
/organizations
/teams
/event-types
/group-sessions
/notifications
/audit-logs
/staff
/settings
```

All admin routes are protected. Without token, they redirect to `/login`.
