

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AdminAuthProvider } from "../components/admin/AdminAuthProvider";
import { AdminShell } from "../components/admin/AdminShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slotly Admin",
  description: "Slotly internal admin panel",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          width: "100%",
          minWidth: 0,
          minHeight: "100vh",
          overflowX: "hidden",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <AdminAuthProvider>
          <AdminShell>{children}</AdminShell>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
