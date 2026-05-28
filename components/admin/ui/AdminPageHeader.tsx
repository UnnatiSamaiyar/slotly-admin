import type { CSSProperties, ReactNode } from "react";

export type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({ eyebrow = "Admin module", title, description, actions }: AdminPageHeaderProps) {
  return (
    <div style={styles.headerCard}>
      <div style={styles.headerTextWrap}>
        <p style={styles.kicker}>{eyebrow}</p>
        <h2 style={styles.heading}>{title}</h2>
        {description ? <p style={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div style={styles.actions}>{actions}</div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  headerCard: {
    width: "100%",
    border: "1px solid #dbe7f6",
    borderRadius: 24,
    background: "linear-gradient(135deg, #ffffff 0%, #f7fbff 100%)",
    padding: "clamp(20px, 4vw, 30px)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
    overflow: "hidden",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
  },
  headerTextWrap: {
    minWidth: 0,
    maxWidth: 760,
  },
  kicker: {
    margin: "0 0 10px",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  heading: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(26px, 4vw, 40px)",
    lineHeight: 1.08,
    letterSpacing: "-0.045em",
  },
  description: {
    margin: "12px 0 0",
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.7,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
};
