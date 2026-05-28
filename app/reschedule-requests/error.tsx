"use client";

export default function RescheduleRequestsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 45%, #ffffff 100%)", color: "#0f172a" }}>
      <section style={{ width: "100%", maxWidth: 560, border: "1px solid #fecaca", background: "#fff7f7", borderRadius: 22, padding: 24, boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)" }}>
        <p style={{ margin: "0 0 8px", color: "#dc2626", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Reschedule Requests Error</p>
        <h1 style={{ margin: 0, color: "#0f172a", fontSize: 24, letterSpacing: "-0.03em" }}>Requests page could not render</h1>
        <p style={{ margin: "10px 0 0", color: "#7f1d1d", fontSize: 14, lineHeight: 1.55 }}>{error?.message || "Something went wrong while opening reschedule requests."}</p>
        <button type="button" onClick={reset} style={{ marginTop: 18, border: "1px solid #dc2626", background: "#dc2626", color: "#ffffff", borderRadius: 12, padding: "10px 14px", fontWeight: 900, cursor: "pointer" }}>Try again</button>
      </section>
    </main>
  );
}
