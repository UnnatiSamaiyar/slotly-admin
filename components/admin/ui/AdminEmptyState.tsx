import type { CSSProperties, ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { AdminBadge } from "./AdminBadge";

type AdminEmptyStateProps = {
  label?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function AdminEmptyState({ label = "Empty state", title, description, action }: AdminEmptyStateProps) {
  return (
    <div style={styles.emptyCard}>
      <div style={styles.emptyIconWrap} aria-hidden="true">
        <Clock3 size={28} strokeWidth={2} />
      </div>
      <div style={styles.emptyTextWrap}>
        <p style={styles.emptyLabel}>{label}</p>
        <h3 style={styles.emptyTitle}>{title}</h3>
        <p style={styles.emptyDescription}>{description}</p>
      </div>
      <div style={styles.rightWrap}>{action || <AdminBadge tone="green">Ready</AdminBadge>}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  emptyCard: {
    width: "100%",
    border: "1px solid #dbe7f6",
    borderRadius: 22,
    background: "#ffffff",
    padding: "clamp(18px, 3vw, 26px)",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 18,
    boxShadow: "0 14px 42px rgba(15,23,42,0.045)",
    overflow: "hidden",
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "#eff6ff",
    color: "#2563eb",
  },
  emptyTextWrap: {
    minWidth: 0,
  },
  emptyLabel: {
    margin: "0 0 6px",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  emptyTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    lineHeight: 1.2,
    letterSpacing: "-0.025em",
  },
  emptyDescription: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
  rightWrap: {
    display: "flex",
    justifyContent: "flex-end",
    minWidth: 0,
  },
};
