"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AdminAuthProvider";
import { LoadingScreen, UnauthorizedFallback } from "./AdminStates";

type ProtectedPageProps = {
  children: ReactNode;
};

export function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();
  const { status, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status === "loading") {
    return <LoadingScreen message="Checking admin session..." />;
  }

  if (!isAuthenticated) {
    return <UnauthorizedFallback />;
  }

  return <>{children}</>;
}
