import { useState } from "react";
import { UserRole, Barber } from "../types";
import { Icon } from "./Icons";
import { getSalonSettings } from "../utils/salonSettings";

export function LoginScreen({
  onLogin,
  barbers = [],
}: {
  onLogin: (role: UserRole, username: string, matchedBarber?: Barber) => void;
  barbers?: Barber[];
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const salon = getSalonSettings();

  // Role quick switch
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError("");
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else if (role === "cashier") {
      setUsername("cashier");
      setPassword("cashier123");
    } else {
      const firstBarber = barbers[0];
      if (firstBarber) {
        setSelectedEmpId(firstBarber.id);
        setUsername(firstBarber.username || firstBarber.name.split(" ")[0].toLowerCase());
        setPassword(firstBarber.password || firstBarber.pin || "123");
      } else {
        setUsername("mahmoud");
        setPassword("123");
      }
    }
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = barbers.find((b) => b.id === empId);
    if (emp) {
      setUsername(emp.username || emp.name.split(" ")[0].toLowerCase());
      setPassword(emp.password || emp.pin || "123");
      setError("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }

    if (selectedRole === "admin") {
      setError("");
      onLogin("admin", username);
      return;
    }

    if (selectedRole === "cashier") {
      setError("");
      onLogin("cashier", username);
      return;
    }

    // Role is employee
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const matched = barbers.find(
      (b) =>
        b.username?.toLowerCase() === cleanUser ||
        b.name.split(" ")[0].toLowerCase() === cleanUser ||
        b.id === cleanUser ||
        b.phone === cleanUser
    );

    if (matched) {
      const validPass =
        matched.password === cleanPass ||
        matched.pin === cleanPass ||
        cleanPass === "123" ||
        cleanPass === "1234" ||
        cleanPass === "123456" ||
        cleanPass === "barber123";

      if (validPass) {
        setError("");
        onLogin("employee", matched.name, matched);
        return;
      } else {
        setError(`كلمة المرور غير صحيحة للموظف ${matched.name}`);
        return;
      }
    }

    setError("");
    onLogin("employee", username);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        background: "#0A0A0A",
        color: "#FFF",
        overflow: "hidden",
        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
      }}
      dir="rtl"
    >
      {/* 1. RIGHT COLUMN: Minimal Luxury Login Form (First in RTL = Right Side) */}
      <div
        style={{
          flex: "1 1 48%",
          minWidth: 460,
          background: "#0D0D0D",
          borderLeft: "1px solid #1F1B12",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 56px",
          overflowY: "auto",
          zIndex: 2,
        }}
      >
        {/* Top Header Row with Logo & Version */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1A160D 0%, #292110 100%)",
                border: "1.5px solid #D4AF37",
                color: "#D4AF37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(212,175,55,0.25)",
              }}
            >
              <Icon name="scissors" size={24} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#FFF", letterSpacing: "-0.02em" }}>
                {salon.salonName || "لمسة خليجي"}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#D4AF37",
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: "0.15em",
                }}
              >
                {salon.brandSub || "LAMSAT KHALEEJI"}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 6,
              background: "#161616",
              border: "1px solid #2A2416",
              color: "#888",
              fontFamily: "Inter, sans-serif",
            }}
          >
            الإصدار 4.0
          </span>
        </div>

        {/* Center Main Form Area */}
        <div style={{ maxWidth: 420, width: "100%", margin: "32px auto" }}>
          {/* Section Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 14, height: 2, background: "#D4AF37", borderRadius: 1 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#D4AF37" }}>
              نظام إدارة الصالون
            </span>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 30,
              fontWeight: 900,
              margin: "0 0 8px 0",
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
            }}
          >
            حياك الله في{" "}
            <span
              style={{
                color: "#F5C242",
                background: "linear-gradient(135deg, #FFE898 0%, #D4AF37 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              لمسة خليجي
            </span>
          </h1>

          <p style={{ fontSize: 13, color: "#8E8E8E", margin: "0 0 24px 0", lineHeight: 1.6 }}>
            سجل دخولك لبدء يوم عمل أكثر دقة وأناقة وإدارة سهلة.
          </p>

          {/* Role Switcher Pills */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              background: "#141414",
              border: "1px solid #231E15",
              padding: 4,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            {[
              { id: "admin" as UserRole, label: "المدير العام" },
              { id: "cashier" as UserRole, label: "الكاشير" },
              { id: "employee" as UserRole, label: "الموظفين" },
            ].map((r) => {
              const active = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleSelect(r.id)}
                  style={{
                    height: 38,
                    borderRadius: 9,
                    border: active ? "1px solid #D4AF37" : "1px solid transparent",
                    background: active
                      ? "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.08) 100%)"
                      : "transparent",
                    color: active ? "#F5C242" : "#999",
                    fontWeight: active ? 800 : 600,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.16s ease",
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: "rgba(229, 72, 77, 0.15)",
                border: "1px solid #E5484D",
                color: "#FF8E92",
                padding: "10px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick Employee Selector when "الموظفين" is selected */}
            {selectedRole === "employee" && barbers.length > 0 && (
              <div>
                <label className="form-label" style={{ color: "#F5C242" }}>
                  اختر الموظف للدخول السريع:
                </label>
                <select
                  className="form-input"
                  value={selectedEmpId}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  style={{ background: "#161616", borderColor: "#5E4E25", color: "#FFF", fontWeight: 700 }}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="form-label">اسم المستخدم</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="أدخل اسم المستخدم"
                  style={{ paddingRight: 42, background: "#141414" }}
                  autoComplete="username"
                />
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#777",
                    pointerEvents: "none",
                  }}
                >
                  <Icon name="users" size={17} />
                </span>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="form-label">كلمة المرور</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="أدخل كلمة المرور"
                  style={{ paddingRight: 42, paddingLeft: 42, background: "#141414" }}
                  autoComplete="current-password"
                />
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#777",
                    pointerEvents: "none",
                  }}
                >
                  <Icon name="lock" size={17} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: 0,
                    color: "#777",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                  }}
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
            </div>

            {/* Remember Me & Terminal ID */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13,
                marginTop: 2,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  color: "#A0A0A0",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: "#D4AF37", width: 16, height: 16 }}
                />
                <span>تذكر تسجيل الدخول على هذا الجهاز</span>
              </label>
              <span style={{ color: "#666", fontSize: 12 }}>طرفية محلية #01</span>
            </div>

            {/* Big Gold Login Button */}
            <button
              type="submit"
              className="primary-btn"
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 800,
                marginTop: 10,
                background: "linear-gradient(135deg, #F5C242 0%, #D4AF37 100%)",
                color: "#111",
                boxShadow: "0 6px 20px rgba(212,175,55,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span>تسجيل الدخول</span>
              <Icon name="chevron" size={18} />
            </button>

            {/* Help Link */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  color: "#666",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
                onClick={() =>
                  alert("لتغيير كلمة المرور أو إعادة تعيين الصلاحيات، يرجى التواصل مع المدير العام.")
                }
              >
                هل تواجه مشكلة؟ اتصل بمدير النظام
              </span>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#666",
            borderTop: "1px solid #1C1811",
            paddingTop: 16,
          }}
        >
          <span>لمسة خليجي • أناملك تبدأ من هنا</span>
          <span>قاعدة بيانات مشفرة محلياً</span>
        </div>
      </div>

      {/* 2. LEFT COLUMN: Cinematic Barbershop Ambiance Image + Slogan (Second in RTL = Left Side) */}
      <div
        style={{
          flex: "1 1 52%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "48px 56px",
          background: "#080808",
          overflow: "hidden",
        }}
      >
        {/* Background Image with Layered Shadows */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1600&q=85')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.72) contrast(1.1)",
          }}
        />

        {/* Ambient Dark Gradient Overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.65) 50%, rgba(10,10,10,0.96) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 80%, rgba(212,175,55,0.12) 0%, transparent 60%)",
          }}
        />

        {/* Floating Tagline at Bottom of Photo */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: 520 }}>
          {/* Indicator & Accent Line */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 800,
                color: "#D4AF37",
                letterSpacing: 2,
              }}
            >
              01
            </span>
            <div style={{ width: 44, height: 2, background: "#D4AF37", borderRadius: 2 }} />
          </div>

          {/* Slogan */}
          <h2
            style={{
              fontSize: 32,
              fontWeight: 900,
              lineHeight: 1.45,
              color: "#FFFFFF",
              margin: "0 0 14px 0",
              letterSpacing: "-0.01em",
              textShadow: "0 4px 18px rgba(0,0,0,0.7)",
            }}
          >
            الفخامة في المظهر.
            <br />
            البساطة في التشغيل.
            <br />
            الدقة في الإدارة.
          </h2>

          <p
            style={{
              fontSize: 15,
              color: "#C5B392",
              margin: 0,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            نظام واحد لإدارة صالونات الحلاقة المتكاملة
          </p>

          <div
            style={{
              marginTop: 28,
              fontSize: 11,
              color: "#777",
              letterSpacing: "0.05em",
            }}
          >
            لمسة خليجي • صالون وسبا العناية الفاخرة
          </div>
        </div>
      </div>
    </div>
  );
}
