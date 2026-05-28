import type { CSSProperties, ReactNode } from "react";
import { AdminEmptyState, AdminPageHeader } from "./ui";

type PlaceholderPageProps = {
  title: string;
  description: string;
  moduleName: string;
  children?: ReactNode;
};

export function PlaceholderPage({ title, description, moduleName, children }: PlaceholderPageProps) {
  return (
    <section className="admin-page-stack" style={styles.pageWrap}>
      <AdminPageHeader title={title} description={description} />

      <AdminEmptyState
        label={moduleName}
        title="Coming soon"
        description={`This section is reserved for the upcoming ${moduleName.toLowerCase()} workflow. The route, protected layout, sidebar, topbar, and reusable empty state are ready.`}
      />

      {children ? <div style={styles.extraContent}>{children}</div> : null}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  pageWrap: {
    width: "100%",
    maxWidth: 1120,
    display: "grid",
    gap: 18,
  },
  extraContent: {
    minWidth: 0,
  },
};
