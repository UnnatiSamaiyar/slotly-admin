"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type AdminButtonProps = {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit" | "reset";
  variant?: AdminButtonVariant;
  disabled?: boolean;
  onClick?: () => void;
};

const variantStyles: Record<AdminButtonVariant, CSSProperties> = {
  primary: { background: "#2563eb", color: "#ffffff", borderColor: "#2563eb" },
  secondary: { background: "#ffffff", color: "#0f172a", borderColor: "#dbe7f6" },
  ghost: { background: "transparent", color: "#334155", borderColor: "transparent" },
  danger: { background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" },
};

export function AdminButton({ children, href, type = "button", variant = "primary", disabled = false, onClick }: AdminButtonProps) {
  const buttonStyle = { ...styles.button, ...variantStyles[variant], ...(disabled ? styles.disabled : {}) };

  if (href) {
    return (
      <Link href={href} style={buttonStyle} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={buttonStyle}>
      {children}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  button: {
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid",
    borderRadius: 12,
    padding: "0 14px",
    fontSize: 14,
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
    transition: "background 160ms ease, border-color 160ms ease, opacity 160ms ease",
    whiteSpace: "nowrap",
  },
  disabled: {
    opacity: 0.55,
    pointerEvents: "none",
    cursor: "not-allowed",
  },
};
