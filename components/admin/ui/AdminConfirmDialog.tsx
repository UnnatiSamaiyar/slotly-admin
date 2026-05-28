"use client";

import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { AdminButton } from "./AdminButton";

type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function AdminConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", children, destructive = false, onConfirm, onClose }: AdminConfirmDialogProps) {
  if (!open) return null;

  return (
    <div style={styles.backdrop} role="presentation">
      <section style={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
        <button type="button" onClick={onClose} style={styles.closeButton} aria-label="Close dialog">
          <X size={18} />
        </button>
        <div style={styles.iconWrap}>
          <AlertTriangle size={24} strokeWidth={2.2} />
        </div>
        <h3 id="admin-confirm-title" style={styles.title}>{title}</h3>
        <p style={styles.description}>{description}</p>
        {children ? <div style={styles.content}>{children}</div> : null}
        <div style={styles.actions}>
          <AdminButton variant="secondary" onClick={onClose}>{cancelLabel}</AdminButton>
          <AdminButton variant={destructive ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</AdminButton>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    display: "grid",
    placeItems: "center",
    padding: 18,
    background: "rgba(15,23,42,0.42)",
  },
  dialog: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
    border: "1px solid #dbe7f6",
    borderRadius: 24,
    background: "#ffffff",
    padding: 24,
    boxShadow: "0 30px 90px rgba(15,23,42,0.22)",
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid #dbe7f6",
    background: "#ffffff",
    color: "#334155",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "#eff6ff",
    color: "#2563eb",
    marginBottom: 16,
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: 22,
    lineHeight: 1.2,
    letterSpacing: "-0.035em",
  },
  description: {
    margin: "10px 0 0",
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.65,
  },
  content: {
    marginTop: 16,
  },
  actions: {
    marginTop: 22,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
};
