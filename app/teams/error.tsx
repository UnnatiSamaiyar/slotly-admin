"use client";

export default function TeamsError({ error, reset }: { error: Error; reset: () => void }) {
  const isUnauthorized = /unauthorized|401/i.test(error.message || "");

  return (
    <main style={{ minHeight: "100vh", background: "#f8fbff", padding: "24px", display: "grid", placeItems: "center" }}>
      <section style={{ width: "min(100%, 620px)", border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 20, padding: 24, color: "#991b1b", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{isUnauthorized ? "Session expired" : "Teams error"}</p>
        <h1 style={{ margin: "8px 0 0", fontSize: 24, color: "#7f1d1d" }}>{isUnauthorized ? "Please login again" : "Teams could not load"}</h1>
        <p style={{ margin: "10px 0 0", color: "#b91c1c", fontSize: 14, lineHeight: 1.6 }}>{isUnauthorized ? "Your admin session is no longer valid." : error.message || "Server is unavailable or returned an unexpected error."}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button type="button" onClick={reset} style={{ border: "1px solid #fecaca", background: "#ffffff", color: "#991b1b", borderRadius: 999, padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}>Retry</button>
          {isUnauthorized ? <a href="/login" style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "10px 14px", fontWeight: 800, textDecoration: "none" }}>Go to login</a> : null}
        </div>
      </section>
    </main>
  );
}
