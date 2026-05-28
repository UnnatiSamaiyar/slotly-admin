import type { CSSProperties, ReactNode } from "react";
import { AdminBadge } from "./AdminBadge";

type AdminTableShellProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  rightSlot?: ReactNode;
};

export function AdminTableShell({ title, description, children, rightSlot }: AdminTableShellProps) {
  return (
    <section style={styles.shell}>
      <div style={styles.header}>
        <div style={styles.headerText}>
          <h3 style={styles.title}>{title}</h3>
          {description ? <p style={styles.description}>{description}</p> : null}
        </div>
        <div style={styles.rightSlot}>{rightSlot || <AdminBadge tone="slate">Table shell</AdminBadge>}</div>
      </div>
      <div style={styles.body}>{children || <div style={styles.placeholder}>Table content will be connected in upcoming module phases.</div>}</div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    width: "100%",
    minWidth: 0,
    border: "1px solid #dbe7f6",
    borderRadius: 22,
    background: "#ffffff",
    boxShadow: "0 14px 42px rgba(15,23,42,0.045)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "18px 20px",
    borderBottom: "1px solid #e4ecf7",
  },
  headerText: { minWidth: 0 },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 18,
    letterSpacing: "-0.025em",
  },
  description: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
  rightSlot: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  body: {
    minWidth: 0,
    overflowX: "auto",
  },
  placeholder: {
    minWidth: 520,
    padding: 20,
    color: "#64748b",
    fontSize: 14,
  },
};
