"use client";

export default function OrganizationDetailError({ error, reset }: { error: Error; reset: () => void }) {
  const message = error.message || "Organization detail could not load.";
  const isUnauthorized = /unauthorized|401/i.test(message);
  const isNotFound = /not found|404/i.test(message);

  return (
    <main style={{ minHeight: "100vh", background: "#f8fbff", padding: "24px", display: "grid", placeItems: "center" }}>
      <section style={{ width: "min(100%, 640px)", border: isNotFound ? "1px solid #dbeafe" : "1px solid #fecaca", background: isNotFound ? "#ffffff" : "#fff7f7", borderRadius: 20, padding: 24, color: isNotFound ? "#0f172a" : "#991b1b", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
        <p style={{ margin: 0, color: isNotFound ? "#2563eb" : "#991b1b", fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{isUnauthorized ? "Session expired" : isNotFound ? "Not found" : "Organization error"}</p>
        <h1 style={{ margin: "8px 0 0", fontSize: 24 }}>{isUnauthorized ? "Please login again" : isNotFound ? "Organization not found" : "Organization detail could not load"}</h1>
        <p style={{ margin: "10px 0 0", color: isNotFound ? "#64748b" : "#b91c1c", fontSize: 14, lineHeight: 1.6 }}>{isUnauthorized ? "Your admin session is no longer valid." : isNotFound ? "This organization does not exist or is not available." : message}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button type="button" onClick={reset} style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}>Retry</button>
          <a href={isUnauthorized ? "/login" : "/organizations"} style={{ border: "1px solid #e2e8f0", background: "#ffffff", color: "#475569", borderRadius: 999, padding: "10px 14px", fontWeight: 800, textDecoration: "none" }}>{isUnauthorized ? "Go to login" : "Back to organizations"}</a>
        </div>
      </section>
    </main>
  );
}
