import { useState, useEffect } from "react";
import { Barber } from "../types";
import { Icon } from "./Icons";
import { DesktopTitlebar } from "./DesktopTitlebar";
import { getSalonSettings } from "../utils/salonSettings";
import { getThemeMode, ThemeMode, saveThemeMode } from "../utils/themeSettings";

function normalizeEmployeeName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

export function ShiftStartScreen({
  barbers = [],
  onStartShift,
}: {
  barbers?: Barber[];
  onStartShift: (cashierName: string, openingCash: number) => void;
}) {
  const [cashierName, setCashierName] = useState("");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<ThemeMode>(getThemeMode);
  const salon = getSalonSettings();

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      if (detail) setTheme(detail);
      else setTheme(getThemeMode());
    };
    window.addEventListener("app-theme-changed", handleThemeChange);
    return () => window.removeEventListener("app-theme-changed", handleThemeChange);
  }, []);

  const isLight = theme === "light";

  const handleToggleTheme = () => {
    const nextMode: ThemeMode = isLight ? "dark" : "light";
    saveThemeMode(nextMode);
    setTheme(nextMode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cashierName.trim();
    if (!trimmed) {
      setError("من فضلك اكتب اسم الموظف المسؤول عن الوردية أولاً");
      return;
    }

    const normalizedInput = normalizeEmployeeName(trimmed);
    const matchedEmployee =
      barbers.find((b) => normalizeEmployeeName(b.name) === normalizedInput) ||
      barbers.find((b) => normalizeEmployeeName(b.name).startsWith(normalizedInput)) ||
      barbers.find((b) => normalizeEmployeeName(b.name).includes(normalizedInput)) ||
      barbers.find((b) => b.username && b.username.toLowerCase() === trimmed.toLowerCase());

    if (!matchedEmployee) {
      setError("هذا الاسم غير مسجل في قائمة الموظفين بالإدارة — يُسمح فقط للموظفين المسجلين ببدء الوردية.");
      return;
    }

    if (matchedEmployee.canStartShift === false) {
      setError(`غير مصرح للموظف «${matchedEmployee.name}» ببدء الوردية — يرجى مراجعة الإدارة لتفعيل الصلاحية.`);
      return;
    }

    setError("");
    onStartShift(matchedEmployee.name, 0);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: 34,
        position: "relative",
        overflow: "hidden",
        background: isLight ? "#F7F4EE" : "#090909",
        color: isLight ? "#1A1612" : "#FFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 24,
        transition: "background 0.4s ease, color 0.4s ease",
      }}
      dir="rtl"
    >
      {/* Luxury Barbershop Background Image (Adapts dynamically to Light / Dark) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: isLight ? "url('./shift-bg-light.jpg')" : "url('./shift-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: isLight ? "brightness(0.96) contrast(1.02)" : "brightness(0.55) contrast(1.08)",
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
            ? "radial-gradient(circle at center, rgba(255, 255, 255, 0.45) 0%, rgba(248, 244, 235, 0.72) 75%, rgba(238, 232, 220, 0.90) 100%)"
            : "radial-gradient(circle at center, rgba(12, 10, 6, 0.35) 0%, rgba(8, 8, 8, 0.82) 75%, rgba(6, 6, 6, 0.94) 100%)",
          transition: "background 0.4s ease",
          pointerEvents: "none",
        }}
      />

      <DesktopTitlebar currentPage="pos" themeMode={theme} onThemeToggle={handleToggleTheme} />

      {/* Theme Switch Pill */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 24,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleToggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 999,
            background: isLight ? "rgba(255, 255, 255, 0.92)" : "rgba(20, 18, 14, 0.88)",
            border: isLight ? "1px solid var(--border-gold)" : "1px solid rgba(212, 175, 55, 0.4)",
            color: "var(--gold)",
            fontWeight: 800,
            fontSize: 12.5,
            cursor: "pointer",
            boxShadow: isLight ? "0 4px 14px rgba(0, 0, 0, 0.08)" : "0 4px 16px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            transition: "all 0.25s ease",
          }}
          title="تبديل المظهر نهاري / ليلي"
        >
          <Icon name={isLight ? "moon" : "sun"} size={16} />
          <span>{isLight ? "المظهر الليلي" : "المظهر النهاري"}</span>
        </button>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 480,
          background: isLight ? "rgba(255, 255, 255, 0.92)" : "rgba(15, 15, 15, 0.84)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: isLight ? "1.5px solid var(--gold)" : "1.5px solid rgba(212, 175, 55, 0.5)",
          borderRadius: 20,
          padding: "36px 34px",
          boxShadow: isLight
            ? "0 24px 60px rgba(180, 140, 60, 0.18), 0 4px 20px rgba(0, 0, 0, 0.06)"
            : "0 28px 70px rgba(0, 0, 0, 0.85), 0 0 45px rgba(212, 175, 55, 0.14)",
          transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 14px",
              borderRadius: 16,
              background: isLight
                ? "linear-gradient(135deg, #FFF9ED 0%, #F5E8C8 100%)"
                : "linear-gradient(135deg, #1E180B 0%, #2E240E 100%)",
              border: "1.5px solid var(--gold)",
              color: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isLight
                ? "0 6px 18px rgba(212, 175, 55, 0.28)"
                : "0 8px 24px rgba(212, 175, 55, 0.22)",
            }}
          >
            <Icon name="scissors" size={30} />
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              margin: "0 0 4px",
              color: isLight ? "#1F1A13" : "#FFF",
            }}
          >
            {salon.salonName || "لمسة خليجي"}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: isLight ? "#6B655B" : "#8E8E8E",
              margin: 0,
            }}
          >
            ابدأ الوردية الجديدة لتفعيل نظام الكاشير وبدء احتساب ساعات العمل
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label
              htmlFor="shift-cashier-name"
              className="form-label"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isLight ? "#2B2418" : "#E5E5E5",
                marginBottom: 8,
                display: "block",
              }}
            >
              اسم المسؤول عن الوردية
            </label>
            <input
              id="shift-cashier-name"
              type="text"
              className="form-input"
              placeholder="اكتب اسم المسؤول عن الوردية..."
              value={cashierName}
              onChange={(e) => {
                setCashierName(e.target.value);
                if (error) setError("");
              }}
              style={{
                height: 48,
                fontSize: 15,
                padding: "0 14px",
                background: isLight ? "#FFFFFF" : "#171717",
                color: isLight ? "#1F1A13" : "#FFF",
                borderColor: error ? "#E5484D" : isLight ? "#D8CFBE" : "#332B19",
              }}
              autoFocus
            />
          </div>

          {error && (
            <div
              style={{
                background: "rgba(229, 72, 77, 0.12)",
                border: "1px solid rgba(229, 72, 77, 0.4)",
                color: "#FF8A8E",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 12.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="primary-btn"
            style={{
              width: "100%",
              height: 52,
              fontSize: 16,
              fontWeight: 800,
              marginTop: 4,
              borderRadius: 12,
            }}
          >
            <Icon name="clock" size={19} />
            <span>بداية الوردية</span>
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            paddingTop: 14,
            borderTop: isLight ? "1px solid #EAE3D2" : "1px solid #221D13",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 12,
            color: isLight ? "#7A7366" : "#7C7C7C",
          }}
        >
          <Icon name="clock" size={14} />
          <span>سيبدأ مؤقت الوردية تلقائياً فور البدء حتى الضغط على «قفل الوردية»</span>
        </div>
      </div>
    </div>
  );
}

