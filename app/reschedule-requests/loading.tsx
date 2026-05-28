export default function RescheduleRequestsLoading() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", padding: "24px clamp(16px, 3vw, 32px)", color: "#0f172a" }}>
      <section style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ height: 28, width: 260, borderRadius: 12, background: "#dbeafe", marginBottom: 14 }} />
        <div style={{ height: 42, width: "min(100%, 500px)", borderRadius: 16, background: "#eff6ff", marginBottom: 22 }} />
        <div style={{ border: "1px solid #dbeafe", background: "#ffffff", borderRadius: 20, overflow: "hidden", boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)" }}>
          {Array.from({ length: 8 }).map((_, index) => <div key={index} style={{ height: 54, borderBottom: "1px solid #eef2f7", background: index % 2 ? "#ffffff" : "#f8fbff" }} />)}
        </div>
      </section>
    </main>
  );
}
