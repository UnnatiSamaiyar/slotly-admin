import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, LockKeyhole, Loader2, SearchX } from "lucide-react";
import { AdminEmptyState, AdminErrorState } from "./ui";

type StateCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
};

function StateCard({ eyebrow, title, description, icon, action }: StateCardProps) {
  return (
    <section style={styles.screenWrap}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>{icon}</div>
        {eyebrow ? <p style={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.description}>{description}</p>
        {action ? <div style={styles.actionWrap}>{action}</div> : null}
      </div>
    </section>
  );
}

export function LoadingScreen({ message = "Checking admin session..." }: { message?: string }) {
  return (
    <section style={styles.loadingScreen} aria-live="polite" aria-busy="true">
      <div style={styles.loadingCard}>
        <Loader2 className="admin-spin" size={22} strokeWidth={2.2} />
        <span>{message}</span>
      </div>
    </section>
  );
}

export function PageLoader({ message = "Loading page..." }: { message?: string }) {
  return (
    <div style={styles.pageLoader} aria-live="polite" aria-busy="true">
      <Loader2 className="admin-spin" size={20} strokeWidth={2.2} />
      <span>{message}</span>
    </div>
  );
}

export function EmptyStateCard({ title, description, label = "Empty state" }: { title: string; description: string; label?: string }) {
  return <AdminEmptyState label={label} title={title} description={description} />;
}

export function ErrorStateCard({ title = "Something went wrong", description = "The admin panel could not load this section. Please refresh and try again." }: { title?: string; description?: string }) {
  return <AdminErrorState title={title} description={description} />;
}

export function UnauthorizedFallback() {
  return (
    <StateCard
      eyebrow="Unauthorized"
      title="Session expired"
      description="Your admin session is no longer valid. Redirecting you to login."
      icon={<LockKeyhole size={28} strokeWidth={2.2} />}
      action={
        <Link href="/login" style={styles.primaryLink}>
          Go to login
        </Link>
      }
    />
  );
}

export function NotFoundState() {
  return (
    <StateCard
      eyebrow="404"
      title="Page not found"
      description="The admin route you opened does not exist. Check the URL or return to the dashboard."
      icon={<SearchX size={28} strokeWidth={2.2} />}
      action={
        <Link href="/dashboard" style={styles.primaryLink}>
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      }
    />
  );
}

const styles: Record<string, CSSProperties> = {
  screenWrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "#f6f9ff",
    color: "#0f172a",
    textAlign: "center",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    border: "1px solid #dbe7f6",
    borderRadius: 24,
    background: "#ffffff",
    padding: "clamp(24px, 5vw, 34px)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.06)",
  },
  iconWrap: {
    width: 58,
    height: 58,
    margin: "0 auto 16px",
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "#eff6ff",
    color: "#2563eb",
  },
  eyebrow: {
    margin: "0 0 10px",
    color: "#2563eb",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "clamp(30px, 5vw, 38px)",
    lineHeight: 1.08,
    letterSpacing: "-0.05em",
  },
  description: {
    margin: "12px auto 0",
    maxWidth: 390,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.7,
  },
  actionWrap: {
    marginTop: 22,
    display: "flex",
    justifyContent: "center",
  },
  primaryLink: {
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 16px",
    borderRadius: 999,
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 800,
    textDecoration: "none",
  },
  loadingScreen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f6f9ff",
    color: "#0f172a",
    padding: 24,
    boxSizing: "border-box",
  },
  loadingCard: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    border: "1px solid #dbe7f6",
    borderRadius: 18,
    background: "#ffffff",
    padding: "18px 20px",
    boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
    color: "#0f172a",
    fontWeight: 800,
  },
  pageLoader: {
    minHeight: 280,
    display: "grid",
    placeItems: "center",
    gap: 10,
    border: "1px solid #dbe7f6",
    borderRadius: 22,
    background: "#ffffff",
    color: "#2563eb",
    fontWeight: 800,
    boxShadow: "0 14px 42px rgba(15,23,42,0.045)",
  },
};
