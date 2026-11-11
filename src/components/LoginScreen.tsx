import { useState, useEffect } from "react";
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

  // When switching quick demo role
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
      // Employees role
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

  // When changing employee from dropdown
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

    // Role is "employee" (الموظفين)
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Find matched barber in barbers list
    const matched = barbers.find(
      (b) =>
        (b.username?.toLowerCase() === cleanUser ||
          b.name.split(" ")[0].toLowerCase() === cleanUser ||
          b.id === cleanUser ||
          b.phone === cleanUser)
    );

    if (matched) {
      // Validate password (matches password or pin, or demo fallback)
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

    // Fallback if not matched but password entered
    setError("");
    onLogin("employee", username);
  };

  return (
    <div className="login-screen-wrap">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-top-logo">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg, #1C180E 0%, #2E2511 100%)",
              border: "2px solid #D4AF37",
              color: "#D4AF37",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 6px 20px rgba(212, 175, 55, 0.25)",
            }}
          >
            <Icon name="scissors" size={32} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#FFFFFF", margin: 0 }}>
            {salon.salonName}
          </h1>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#D4AF37",
              fontFamily: "Inter",
              marginTop: 2,
            }}
          >
            {salon.brandSub}
          </span>
          <p style={{ fontSize: 13, color: "#B8B8B8", margin: "6px 0 0 0" }}>
            {salon.address}
          </p>
        </div>

        {/* Welcome Message */}
        <div
          style={{
            background: "#191919",
            border: "1px solid #2B2519",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>
            مرحباً بك في نظام إدارة صالون لمسة
          </div>
          <div style={{ fontSize: 12, color: "#9E9E9E", marginTop: 2 }}>
            نظام الكاشير ونقاط البيع وإدارة الموظفين والحسابات
          </div>
        </div>

        {/* Quick Demo Accounts Selector */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#8E8E8E", display: "block", marginBottom: 8 }}>
            اختر حساب التجربة السريعة:
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => handleRoleSelect("admin")}
              style={{
                height: 48,
                borderRadius: 10,
                background: selectedRole === "admin" ? "rgba(212, 175, 55, 0.2)" : "#181818",
                border: `1.5px solid ${selectedRole === "admin" ? "#D4AF37" : "#2A2418"}`,
                color: selectedRole === "admin" ? "#F5C242" : "#BBB",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.16s",
                cursor: "pointer",
              }}
            >
              <span>المدير العام</span>
              <span style={{ fontSize: 10, color: "#888", fontWeight: 400 }}>سوبر أدمن</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("cashier")}
              style={{
                height: 48,
                borderRadius: 10,
                background: selectedRole === "cashier" ? "rgba(212, 175, 55, 0.2)" : "#181818",
                border: `1.5px solid ${selectedRole === "cashier" ? "#D4AF37" : "#2A2418"}`,
                color: selectedRole === "cashier" ? "#F5C242" : "#BBB",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.16s",
                cursor: "pointer",
              }}
            >
              <span>الكاشير</span>
              <span style={{ fontSize: 10, color: "#888", fontWeight: 400 }}>مبيعات وورديات</span>
            </button>

            {/* Changed from 'الحلاق' to 'الموظفين' as requested */}
            <button
              type="button"
              onClick={() => handleRoleSelect("employee")}
              style={{
                height: 48,
                borderRadius: 10,
                background: selectedRole === "employee" ? "rgba(212, 175, 55, 0.2)" : "#181818",
                border: `1.5px solid ${selectedRole === "employee" ? "#D4AF37" : "#2A2418"}`,
                color: selectedRole === "employee" ? "#F5C242" : "#BBB",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.16s",
                cursor: "pointer",
              }}
            >
              <span>الموظفين</span>
              <span style={{ fontSize: 10, color: "#888", fontWeight: 400 }}>حضور وسجل شخصي</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div
              style={{
                background: "rgba(229, 72, 77, 0.15)",
                border: "1px solid #E5484D",
                color: "#FF8E92",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
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

          {/* Quick Employee Selector when "الموظفين" is selected */}
          {selectedRole === "employee" && barbers.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ color: "#F5C242" }}>
                اختر الموظف للدخول السريع:
              </label>
              <select
                className="form-input"
                value={selectedEmpId}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                style={{ background: "#1C180E", borderColor: "#5E4E25", color: "#FFF", fontWeight: 700 }}
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.title})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">اسم المستخدم</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="أدخل اسم المستخدم"
                style={{ paddingRight: 40 }}
                autoComplete="username"
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#666",
                  pointerEvents: "none",
                }}
              >
                <Icon name="users" size={17} />
              </span>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">كلمة المرور</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="أدخل كلمة المرور"
                style={{ paddingRight: 40, paddingLeft: 40 }}
                autoComplete="current-password"
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#666",
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
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: 0,
                  color: "#888",
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#B8B8B8" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#D4AF37", width: 16, height: 16 }}
              />
              <span>تذكر تسجيل الدخول على هذا الجهاز</span>
            </label>
            <span style={{ color: "#777", fontSize: 12 }}>طرفية محلية #01</span>
          </div>

          <button
            type="submit"
            className="primary-btn"
            style={{ height: 48, fontSize: 16, marginTop: 8 }}
          >
            <span>تسجيل الدخول إلى النظام</span>
            <Icon name="check" size={18} />
          </button>
        </form>

        {/* Footer Metadata */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid #201B12",
            textAlign: "center",
            fontSize: 11,
            color: "#666",
            lineHeight: 1.6,
          }}
        >
          <div>إصدار سطح المكتب v4.0 • قاعدة بيانات مشفرة SQLite محلياً</div>
          <div>يعمل بدون إنترنت بالكامل • تصميم احترافي لنظام Windows</div>
        </div>
      </div>
    </div>
  );
}
