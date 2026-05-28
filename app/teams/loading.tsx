export default function TeamsLoading() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8fbff", padding: "24px" }}>
      <section style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, padding: 24, boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
        <p style={{ margin: 0, color: "#2563eb", fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Teams</p>
        <h1 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: 26 }}>Loading teams...</h1>
        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} style={{ height: 52, borderRadius: 14, background: "linear-gradient(90deg, #f1f5f9 0%, #eaf2ff 50%, #f1f5f9 100%)" }} />
          ))}
        </div>
      </section>
    </main>
  );
}
