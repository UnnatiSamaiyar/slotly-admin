import type { CSSProperties, ReactNode } from "react";

type AdminBadgeTone = "blue" | "green" | "amber" | "slate" | "red";

type AdminBadgeProps = {
  children: ReactNode;
  tone?: AdminBadgeTone;
};

const toneStyles: Record<AdminBadgeTone, CSSProperties> = {
  blue: { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" },
  green: { background: "#ecfdf5", color: "#047857", borderColor: "#bbf7d0" },
  amber: { background: "#fffbeb", color: "#b45309", borderColor: "#fde68a" },
  slate: { background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" },
  red: { background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" },
};

export function AdminBadge({ children, tone = "blue" }: AdminBadgeProps) {
  return <span style={{ ...styles.badge, ...toneStyles[tone] }}>{children}</span>;
}

const styles: Record<string, CSSProperties> = {
  badge: {
    minHeight: 26,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid",
    borderRadius: 999,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
};
