import type { CSSProperties, ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { AdminBadge } from "./AdminBadge";

type AdminStatCardProps = {
  label: string;
  value: string;
  helper?: string;
  trend?: string;
  icon?: ReactNode;
};

export function AdminStatCard({ label, value, helper, trend, icon }: AdminStatCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.topRow}>
        <div style={styles.iconWrap}>{icon || <TrendingUp size={20} strokeWidth={2.2} />}</div>
        {trend ? <AdminBadge tone="green">{trend}</AdminBadge> : null}
      </div>
      <p style={styles.label}>{label}</p>
      <div style={styles.value}>{value}</div>
      {helper ? <p style={styles.helper}>{helper}</p> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    minWidth: 0,
    border: "1px solid #dbe7f6",
    borderRadius: 22,
    background: "#ffffff",
    padding: 20,
    boxShadow: "0 14px 42px rgba(15,23,42,0.045)",
    overflow: "hidden",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "#eff6ff",
    color: "#2563eb",
    flexShrink: 0,
  },
  label: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    fontWeight: 800,
  },
  value: {
    marginTop: 8,
    color: "#0f172a",
    fontSize: 30,
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 850,
  },
  helper: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
};
