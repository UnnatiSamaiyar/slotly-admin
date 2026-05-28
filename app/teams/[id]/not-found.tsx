export default function TeamNotFound() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8fbff", padding: 24, display: "grid", placeItems: "center" }}>
      <section style={{ width: "min(100%, 560px)", border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, padding: 24, textAlign: "center", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
        <p style={{ margin: 0, color: "#2563eb", fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Not found</p>
        <h1 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: 26 }}>Team not found</h1>
        <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>The team may have been removed or the ID is invalid.</p>
        <a href="/teams" style={{ display: "inline-flex", marginTop: 18, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: 999, padding: "10px 14px", fontWeight: 800, textDecoration: "none" }}>Back to teams</a>
      </section>
    </main>
  );
}
