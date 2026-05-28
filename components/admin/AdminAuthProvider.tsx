"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { clearToken, getCurrentStaff, getToken, type StaffMe } from "../../lib/api";

type AdminAuthStatus = "loading" | "authenticated" | "unauthenticated";

type AdminAuthContextValue = {
  staff: StaffMe | null;
  status: AdminAuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<StaffMe | null>;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffMe | null>(null);
  const [status, setStatus] = useState<AdminAuthStatus>("loading");

  const logout = useCallback(() => {
    clearToken();
    setStaff(null);
    setStatus("unauthenticated");
  }, []);

  const refreshSession = useCallback(async () => {
    if (!getToken()) {
      setStaff(null);
      setStatus("unauthenticated");
      return null;
    }

    setStatus("loading");

    try {
      const currentStaff = await getCurrentStaff();
      setStaff(currentStaff);
      setStatus("authenticated");
      return currentStaff;
    } catch {
      clearToken();
      setStaff(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (!getToken()) {
        if (!active) return;
        setStaff(null);
        setStatus("unauthenticated");
        return;
      }

      try {
        const currentStaff = await getCurrentStaff();
        if (!active) return;
        setStaff(currentStaff);
        setStatus("authenticated");
      } catch {
        if (!active) return;
        clearToken();
        setStaff(null);
        setStatus("unauthenticated");
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      clearToken();
      setStaff(null);
      setStatus("unauthenticated");
    }

    window.addEventListener("slotly-admin-auth-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("slotly-admin-auth-unauthorized", handleUnauthorized);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      staff,
      status,
      isLoading: status === "loading",
      isAuthenticated: status === "authenticated",
      refreshSession,
      logout,
    }),
    [staff, status, refreshSession, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }

  return context;
}
