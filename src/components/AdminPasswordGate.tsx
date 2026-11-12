
import { useState, useEffect } from "react";
import { Icon } from "./Icons";
import { getThemeMode, ThemeMode } from "../utils/themeSettings";

export function AdminPasswordGate({
  onUnlock,
  expectedPassword = "admin123",
}: {
  onUnlock: () => void;
  expectedPassword?: string;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(getThemeMode);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      if (detail) setTheme(detail);
      else setTheme(getThemeMode());
    };
    window.addEventListener("app-theme-changed", handleThemeChange);
    return () => window.removeEventListener("app-theme-changed", handleThemeChange);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("من فضلك أدخل كلمة مرور شاشة الإدارة");
      return;
    }
    if (password.trim() === expectedPassword) {
      setError("");
      setPassword("");
      onUnlock();
    } else {
      setError("كلمة المرور غير صحيحة");
    }
  };

  const isLight = theme === "light";

  return (
    <div
      style={{
        minHeight: "calc(100vh - 140px)",
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--border-gold)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Luxury Executive Lounge Background Image (Adapts to Light / Dark Mode) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: isLight ? "url('./admin-bg-light.jpg')" : "url('./admin-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: isLight ? "brightness(0.96) contrast(1.02)" : "brightness(0.75) contrast(1.06)",
          transform: "scale(1.02)",
          transition: "background-image 0.4s ease, filter 0.4s ease",
          pointerEvents: "none",
        }}
      />
      {/* Atmospheric Ambient Overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: isLight
            ? "radial-gradient(circle at center, rgba(255, 255, 255, 0.45) 0%, rgba(248, 244, 235, 0.72) 75%, rgba(238, 232, 220, 0.88) 100%)"
            : "radial-gradient(circle at center, rgba(16, 12, 6, 0.25) 0%, rgba(10, 8, 5, 0.68) 78%, rgba(8, 6, 4, 0.84) 100%)",
          transition: "background 0.4s ease",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          background: isLight ? "rgba(255, 255, 255, 0.92)" : "var(--card)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: isLight ? "1.5px solid var(--gold)" : "1.5px solid var(--border-gold)",
          borderRadius: 18,
          padding: "34px 30px",
          boxShadow: isLight
            ? "0 24px 60px rgba(180, 140, 50, 0.22), 0 0 25px rgba(212, 175, 55, 0.15)"
            : "0 24px 60px rgba(0, 0, 0, 0.55)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            margin: "0 auto 16px",
            borderRadius: "50%",
            background: "var(--gold-soft)",
            border: "1.5px solid var(--gold)",
            color: "var(--gold)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="shield" size={28} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 6px" }}>
          صفحة الإدارة
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 22px" }}>
          أدخل كلمة المرور فقط للدخول إلى لوحة الإدارة والتقارير
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "right" }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              className="form-input"
              placeholder="كلمة مرور الإدارة..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              style={{
                height: 46,
                fontSize: 15,
                paddingLeft: 42,
                textAlign: "center",
                letterSpacing: showPassword ? 1 : 4,
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: 0,
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: 4,
              }}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
            </button>
          </div>

          {error && (
            <div
              style={{
                background: "var(--danger-soft)",
                border: "1px solid var(--danger-border)",
                color: "var(--danger-text)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="alert" size={15} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="primary-btn" style={{ width: "100%", height: 46, fontSize: 15 }}>
            <Icon name="unlock" size={17} />
            <span>دخول شاشة الإدارة</span>
          </button>
        </form>
      </div>
    </div>
  );
}

