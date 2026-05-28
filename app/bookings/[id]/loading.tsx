export default function BookingDetailLoading() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", padding: "24px clamp(16px, 3vw, 32px)", color: "#0f172a" }}>
      <section style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ height: 24, width: 180, borderRadius: 12, background: "#dbeafe", marginBottom: 12 }} />
        <div style={{ height: 44, width: "min(100%, 520px)", borderRadius: 16, background: "#eff6ff", marginBottom: 22 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, index) => <div key={index} style={{ minHeight: 170, border: "1px solid #dbeafe", borderRadius: 20, background: "#ffffff", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }} />)}
        </div>
      </section>
    </main>
  );
}
