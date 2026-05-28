

"use client";

import Image from "next/image";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { API_BASE, setToken } from "../../lib/api";
import { useAdminAuth } from "../../components/admin/AdminAuthProvider";

const LOGIN_SLIDES = [
  {
    key: "dashboard",
    title: "Smarter scheduling for modern teams",
    description:
      "Create booking links, manage availability, and schedule meetings without back-and-forth.",
    image: "/login-carousel/dashboard.png",
    features: [
      { label: "Booking link", value: "Ready to share", detail: "slotly.com/admin" },
      { label: "Availability", value: "9:00 AM – 5:00 PM", detail: "Mon – Fri" },
      { label: "Admin control", value: "View operations", detail: "Users & bookings" },
    ],
  },
  {
    key: "event-types-one",
    title: "Build booking workflows faster",
    description:
      "Create reusable event types, share professional links, and manage scheduling from one workspace.",
    image: "/login-carousel/event-types-one.png",
    features: [
      { label: "Templates", value: "4 event types", detail: "Demo, Review" },
      { label: "Bookings", value: "1,284", detail: "Tracked automatically" },
      { label: "Live links", value: "12 active", detail: "Ready to share" },
    ],
  },
  {
    key: "event-types-two",
    title: "Control every scheduling link",
    description:
      "Manage links, availability, public booking pages, and event type settings with a clean dashboard.",
    image: "/login-carousel/event-types-two.png",
    features: [
      { label: "Link status", value: "Active controls", detail: "Enable or pause" },
      { label: "Public pages", value: "Shareable links", detail: "Copy instantly" },
      { label: "Team flow", value: "Organized events", detail: "Workspace control" },
    ],
  },
];

function getSlidePosition(index: number, activeIndex: number) {
  const total = LOGIN_SLIDES.length;
  const diff = (index - activeIndex + total) % total;

  if (diff === 0) return "active";
  if (diff === 1) return "next";
  if (diff === total - 1) return "prev";

  return "hidden";
}

function getSlideStyle(position: "active" | "next" | "prev" | "hidden"): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 24,
    overflow: "hidden",
    transition:
      "transform 800ms cubic-bezier(0.22,1,0.36,1), opacity 600ms ease, filter 600ms ease",
  };

  if (position === "active") {
    return {
      ...base,
      transform: "translateX(0) scale(1) rotateY(0deg)",
      opacity: 1,
      filter: "blur(0px) brightness(1)",
      zIndex: 20,
    };
  }

  if (position === "next") {
    return {
      ...base,
      transform: "translateX(64%) scale(0.78) rotateY(-18deg)",
      opacity: 0.52,
      filter: "blur(3px) brightness(0.92)",
      zIndex: 10,
    };
  }

  if (position === "prev") {
    return {
      ...base,
      transform: "translateX(-64%) scale(0.78) rotateY(18deg)",
      opacity: 0.52,
      filter: "blur(3px) brightness(0.92)",
      zIndex: 10,
    };
  }

  return {
    ...base,
    opacity: 0,
    transform: "scale(0.62)",
    zIndex: 0,
    pointerEvents: "none",
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { refreshSession, status } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % LOGIN_SLIDES.length);
    }, 5600);

    return () => window.clearInterval(timer);
  }, []);

  const goNext = () => {
    setActiveSlide((prev) => (prev + 1) % LOGIN_SLIDES.length);
  };

  const goPrev = () => {
    setActiveSlide(
      (prev) => (prev - 1 + LOGIN_SLIDES.length) % LOGIN_SLIDES.length
    );
  };

  const goToSlide = (index: number) => {
    if (index === activeSlide) return;
    setActiveSlide(index);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ops/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Login failed");
      }

      setToken(data.token);
      await refreshSession();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const slide = LOGIN_SLIDES[activeSlide];

  return (
    <main className="slotly-login-page">
      <section className="slotly-login-card">
        <div className="slotly-login-left">
          <form onSubmit={onSubmit} className="slotly-login-form">
            <div className="slotly-brand">
              <div className="slotly-brand-icon">
                <CalendarDays size={20} />
              </div>

              <div>
                <div className="slotly-brand-title">Slotly Admin</div>
                <div className="slotly-brand-subtitle">Internal operations panel</div>
              </div>
            </div>

            <div className="slotly-heading-block">
          
              <h1>Welcome back</h1>

          
            </div>

            <div className="slotly-field">
              <label>Email address</label>
              <div className="slotly-input-wrap">
                <Mail size={18} />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@slotly.io"
                />
              </div>
            </div>

            <div className="slotly-field">
              <label>Password</label>
              <div className="slotly-input-wrap">
                <Lock size={18} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                />

                <button
                  type="button"
                  className="slotly-eye-btn"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="slotly-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            ) : null}

            <button type="submit" disabled={loading} className="slotly-submit">
              {loading ? "Signing in..." : "Continue"}
            </button>

            <p className="slotly-safe-note">
              Protected admin access for authorized Slotly staff only.
            </p>
          </form>
        </div>

        <div className="slotly-login-right">
          <div className="slotly-carousel-panel">
            <div className="slotly-dot-bg" />
            <div className="slotly-glow-one" />
            <div className="slotly-glow-two" />

            <div className="slotly-stage">
              {LOGIN_SLIDES.map((item, index) => {
                const position = getSlidePosition(index, activeSlide);

                return (
                  <div key={item.key} style={getSlideStyle(position)}>
                    <div className="slotly-image-float">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        priority={index === activeSlide}
                        sizes="620px"
                        className="slotly-slide-image"
                      />
                    </div>

                    <div className="slotly-image-overlay" />

                    {position === "active" ? (
                      <div className="slotly-active-shadow" />
                    ) : null}

                    <div className="slotly-image-border" />
                  </div>
                );
              })}
            </div>

            <div className="slotly-feature-row">
              {slide.features.map((feature, index) => (
                <div key={feature.label} className="slotly-feature-card">
                  <div className="slotly-feature-content">
                    <span className={`slotly-feature-icon icon-${index}`}>
                      {index === 0 ? "↗" : index === 1 ? "✓" : "▣"}
                    </span>

                    <div>
                      <p>{feature.label}</p>
                      <strong>{feature.value}</strong>
                      <span>{feature.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className="slotly-arrow slotly-arrow-left"
            >
              <ChevronLeft size={26} />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className="slotly-arrow slotly-arrow-right"
            >
              <ChevronRight size={26} />
            </button>

            <div className="slotly-panel-copy">
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>

              <div className="slotly-dots">
                {LOGIN_SLIDES.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    className={activeSlide === index ? "active" : ""}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .slotly-login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 20px;
          overflow-x: hidden;
          background: #f5f7fb;
          color: #0f172a;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .slotly-login-card {
          width: min(1080px, 100%);
          min-height: min(610px, calc(100dvh - 32px));
          display: grid;
          grid-template-columns: minmax(340px, 0.82fr) minmax(520px, 1.18fr);
          overflow: hidden;
          border-radius: 28px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.1);
        }

        .slotly-login-left {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 38px 34px;
          background: #ffffff;
        }

        .slotly-login-form {
          width: 100%;
          max-width: 365px;
        }

        .slotly-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
        }

        .slotly-brand-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: #ffffff;
          background: #2563eb;
          box-shadow: 0 12px 30px rgba(37, 99, 235, 0.22);
        }

        .slotly-brand-title {
          font-size: 22px;
          line-height: 1;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: #0f172a;
        }

        .slotly-brand-subtitle {
          margin-top: 6px;
          font-size: 12px;
          font-weight: 400;
          color: #64748b;
        }

        .slotly-heading-block {
          margin-bottom: 28px;
          font-size:12px;
        }

        .slotly-pill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: #eff6ff;
          color: #2563eb;
          font-size: 12px;
          font-weight: 500;
        }

        .slotly-heading-block h1 {
          margin: 0;
          font-size: clamp(22px, 3.2vw, 28px);
          line-height: 1.05;
          font-weight: 600;
          letter-spacing: -0.045em;
          color: #020617;
        }

        .slotly-heading-block p {
          margin: 12px 0 0;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 400;
          color: #64748b;
        }

        .slotly-field {
          margin-bottom: 16px;
        }

        .slotly-field label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #334155;
        }

        .slotly-input-wrap {
          height: 48px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border-radius: 16px;
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          color: #64748b;
          transition: border-color 180ms ease, background 180ms ease,
            box-shadow 180ms ease;
        }

        .slotly-input-wrap:focus-within {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .slotly-input-wrap input {
          min-width: 0;
          width: 100%;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font-size: 14px;
          font-weight: 400;
        }

        .slotly-input-wrap input::placeholder {
          color: #94a3b8;
        }

        .slotly-eye-btn {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
        }

        .slotly-eye-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .slotly-error {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 4px;
          margin-bottom: 16px;
          padding: 12px 13px;
          border-radius: 14px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.45;
        }

        .slotly-submit {
          width: 100%;
          height: 48px;
          border: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.22);
          transition: background 180ms ease, transform 160ms ease,
            box-shadow 160ms ease, opacity 160ms ease;
        }

        .slotly-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 38px rgba(37, 99, 235, 0.3);
        }

        .slotly-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .slotly-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          box-shadow: none;
        }

        .slotly-safe-note {
          margin: 18px 0 0;
          text-align: center;
          color: #64748b;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 400;
        }

        .slotly-login-right {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: #ffffff;
        }

        .slotly-carousel-panel {
          position: relative;
          width: 100%;
          height: 560px;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(255, 255, 255, 0.25),
              transparent 40%
            ),
            linear-gradient(135deg, #5b8cff 0%, #315cf6 50%, #a78bfa 100%);
          box-shadow: 0 32px 80px rgba(49, 92, 246, 0.22);
        }

        .slotly-dot-bg {
          position: absolute;
          inset: 0;
          opacity: 0.35;
          background-image: radial-gradient(
            rgba(255, 255, 255, 0.68) 1px,
            transparent 1px
          );
          background-size: 11px 11px;
        }

        .slotly-glow-one,
        .slotly-glow-two {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
          filter: blur(48px);
        }

        .slotly-glow-one {
          left: -80px;
          top: 40px;
          width: 260px;
          height: 260px;
          background: rgba(255, 255, 255, 0.2);
        }

        .slotly-glow-two {
          right: -64px;
          bottom: 32px;
          width: 288px;
          height: 288px;
          background: rgba(199, 210, 254, 0.35);
        }

        .slotly-stage {
          position: absolute;
          left: 50%;
          top: 26px;
          z-index: 20;
          width: 70%;
          height: 230px;
          transform: translateX(-50%);
          perspective: 1200px;
        }

        .slotly-image-float {
          width: 100%;
          height: 100%;
          animation: slotlyFloat 4s ease-in-out infinite;
        }

        .slotly-slide-image {
          object-fit: cover;
          object-position: top;
        }

        .slotly-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.1),
            transparent,
            rgba(255, 255, 255, 0.1)
          );
        }

        .slotly-active-shadow {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          pointer-events: none;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
        }

        .slotly-image-border {
          position: absolute;
          inset: 0;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          pointer-events: none;
        }

        .slotly-feature-row {
          position: absolute;
          left: 50%;
          top: 292px;
          z-index: 30;
          width: 78%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          transform: translateX(-50%);
        }

        .slotly-feature-card {
          min-height: 82px;
          padding: 12px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.13);
          backdrop-filter: blur(16px);
          overflow: hidden;
        }

        .slotly-feature-content {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          min-width: 0;
        }

        .slotly-feature-icon {
          width: 28px;
          height: 28px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
        }

        .slotly-feature-icon.icon-0 {
          color: #2563eb;
          background: #eef4ff;
        }

        .slotly-feature-icon.icon-1 {
          color: #059669;
          background: #ecfdf5;
        }

        .slotly-feature-icon.icon-2 {
          color: #4f46e5;
          background: #f5f3ff;
        }

        .slotly-feature-card p,
        .slotly-feature-card strong,
        .slotly-feature-card span {
          display: block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .slotly-feature-card p {
          margin: 0;
          color: #111827;
          font-size: 12px;
          font-weight: 600;
        }

        .slotly-feature-card strong {
          margin-top: 5px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 500;
        }

        .slotly-feature-card span {
          margin-top: 5px;
          color: #64748b;
          font-size: 10.5px;
          font-weight: 400;
        }

        .slotly-arrow {
          position: absolute;
          top: 30%;
          z-index: 40;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          background: rgba(255, 255, 255, 0.95);
          color: #315cf6;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
          transform: translateY(-50%);
          transition: transform 180ms ease, background 180ms ease;
        }

        .slotly-arrow:hover {
          background: #ffffff;
          transform: translateY(-50%) scale(1.05);
        }

        .slotly-arrow-left {
          left: 20px;
        }

        .slotly-arrow-right {
          right: 20px;
        }

        .slotly-panel-copy {
          position: absolute;
          left: 32px;
          right: 32px;
          bottom: 22px;
          z-index: 30;
          text-align: center;
          color: #ffffff;
        }

        .slotly-panel-copy h2 {
          margin: 0;
          color: #ffffff;
          font-size: 22px;
          line-height: 1.18;
          font-weight: 600;
          letter-spacing: -0.03em;
        }

        .slotly-panel-copy p {
          max-width: 520px;
          margin: 10px auto 0;
          color: rgba(255, 255, 255, 0.86);
          font-size: 13px;
          line-height: 1.5;
          font-weight: 400;
        }

        .slotly-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 12px;
        }

        .slotly-dots button {
          width: 8px;
          height: 8px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          transition: width 180ms ease, background 180ms ease;
        }

        .slotly-dots button.active {
          width: 30px;
          background: #ffffff;
          box-shadow: 0 0 14px rgba(255, 255, 255, 0.65);
        }

        @keyframes slotlyFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-6px);
          }
        }

        @media (max-width: 1080px) {
          .slotly-login-card {
            grid-template-columns: 1fr;
            width: min(520px, 100%);
            min-height: auto;
          }

          .slotly-login-right {
            display: none;
          }

          .slotly-login-left {
            min-height: calc(100dvh - 32px);
          }
        }

        @media (max-width: 520px) {
          .slotly-login-page {
            padding: 0;
            background: #ffffff;
          }

          .slotly-login-card {
            width: 100%;
            min-height: 100dvh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .slotly-login-left {
            align-items: flex-start;
            min-height: 100dvh;
            padding: 34px 20px;
          }

          .slotly-brand {
            margin-bottom: 30px;
          }

          .slotly-heading-block h1 {
            font-size: 34px;
          }
        }
      `}</style>
    </main>
  );
}