import type { CSSProperties, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { AdminButton } from "./AdminButton";

type AdminErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function AdminErrorState({ title = "Something went wrong", description = "The admin panel could not load this section. Please refresh and try again.", action }: AdminErrorStateProps) {
  return (
    <div style={styles.card}>
      <div style={styles.iconWrap}>
        <AlertCircle size={26} strokeWidth={2.2} />
      </div>
      <div style={styles.textWrap}>
        <p style={styles.kicker}>Error</p>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.description}>{description}</p>
      </div>
      <div style={styles.actionWrap}>{action || <AdminButton href="/dashboard">Back to dashboard</AdminButton>}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    width: "100%",
    border: "1px solid #fecaca",
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
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "#fef2f2",
    color: "#dc2626",
  },
  textWrap: { minWidth: 0 },
  kicker: {
    margin: "0 0 6px",
    color: "#dc2626",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 20,
    lineHeight: 1.2,
    letterSpacing: "-0.025em",
  },
  description: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
  actionWrap: {
    display: "flex",
    justifyContent: "flex-end",
  },
};
