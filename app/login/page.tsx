"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, setToken } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ops/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Login failed");
      setToken(data.token);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.11), transparent 32%), linear-gradient(135deg, #f8fbff 0%, #eef6ff 50%, #ffffff 100%)",
        color: "#0f172a",
        padding: 24,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1080,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 420px)",
          gap: 32,
          alignItems: "center",
        }}
      >
        <section
          style={{
            borderRadius: 28,
            padding: "38px 42px",
            background: "rgba(255,255,255,0.82)",
            border: "1px solid rgba(37,99,235,0.13)",
            boxShadow: "0 24px 80px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 13px",
              borderRadius: 999,
              background: "#eff6ff",
              border: "1px solid #dbeafe",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Slotly Workspace Admin
          </div>

          <h1
            style={{
              maxWidth: 560,
              margin: "22px 0 14px",
              fontSize: "clamp(32px, 3.4vw, 46px)",
              lineHeight: 1.08,
              letterSpacing: "-0.045em",
              color: "#0b1930",
              fontWeight: 700,
            }}
          >
            Manage meetings, teams, and scheduling operations in one place.
          </h1>

          <p
            style={{
              maxWidth: 560,
              margin: 0,
              fontSize: 16,
              lineHeight: 1.7,
              color: "#5f718d",
            }}
          >
            Access the Slotly admin panel to manage booking workflows, team
            scheduling, meeting operations, and workspace controls securely.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginTop: 30,
            }}
          >
            {["Meeting Control", "Team Scheduling", "Workspace Access"].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    padding: "14px 12px",
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
                    fontSize: 13,
                    fontWeight: 750,
                    color: "#1e3a8a",
                    textAlign: "center",
                  }}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </section>

        <form
          onSubmit={onSubmit}
          style={{
            width: "100%",
            padding: 30,
            borderRadius: 28,
            background: "#ffffff",
            border: "1px solid #dbeafe",
            boxShadow: "0 30px 90px rgba(37,99,235,0.16)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #2563eb, #60a5fa)",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 20,
              marginBottom: 20,
              boxShadow: "0 14px 28px rgba(37,99,235,0.28)",
            }}
          >
            S
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 850,
              marginBottom: 6,
              color: "#0b1930",
            }}
          >
            Sign in to Slotly Admin
          </div>

          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
            Secure access for authorized workspace users.
          </div>

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 750,
              color: "#334155",
              marginBottom: 8,
            }}
          >
            Email address
          </label>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="admin@slotly.com"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              outline: "none",
              marginBottom: 14,
              fontSize: 14,
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 750,
              color: "#334155",
              marginBottom: 8,
            }}
          >
            Password
          </label>

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="Enter your password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              outline: "none",
              marginBottom: 14,
              fontSize: 14,
            }}
          />

          {error ? (
            <div
              style={{
                color: "#1d4ed8",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontSize: 13,
                fontWeight: 650,
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 12,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px 14px",
              borderRadius: 16,
              border: "1px solid #2563eb",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#ffffff",
              fontWeight: 850,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 16px 34px rgba(37,99,235,0.28)",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}