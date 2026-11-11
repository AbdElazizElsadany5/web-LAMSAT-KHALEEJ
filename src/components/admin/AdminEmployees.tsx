import { useState } from "react";
import { Barber } from "../../types";
import { Icon } from "../Icons";

export function AdminEmployees({
  barbers,
  onSaveEmployee,
  onShowToast,
}: {
  barbers: Barber[];
  onSaveEmployee: (emp: Barber) => void;
  onShowToast: (msg: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Barber | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("123456");
  const [title, setTitle] = useState("حلاق أول");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("1234");
  const [salaryType, setSalaryType] = useState<Barber["salaryType"]>("ثابت + عمولة");
  const [basicSalary, setBasicSalary] = useState(5500);
  const [commissionRate, setCommissionRate] = useState(30);

  const handleCreateEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Generate fallback username if not typed
    const finalUsername = username.trim().toLowerCase() || `emp_${Date.now().toString().slice(-4)}`;
    const finalPassword = password.trim() || "123456";

    const newEmp: Barber = {
      id: `b-${Date.now()}`,
      name: name.trim(),
      username: finalUsername,
      password: finalPassword,
      title,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      phone: phone.trim() || "01000000000",
      status: "غير حاضر",
      checkInTime: "—",
      checkOutTime: "—",
      pin: pin.trim() || "1234",
      salaryType,
      basicSalary,
      commissionRate,
      completedToday: 0,
      revenueToday: 0,
      commissionEarned: 0,
      rating: 5.0,
    };
    onSaveEmployee(newEmp);
    setModalOpen(false);
    setName("");
    setUsername("");
    setPassword("123456");
    setPhone("");
    onShowToast(`تمت إضافة الموظف «${newEmp.name}» مع حساب الدخول بنجاح`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            إدارة فريق العمل والحلاقين
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            إدارة بيانات الموظفين، الرواتب، ونسب العمولات والرمز السري (PIN)
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setModalOpen(true)}
          style={{ height: 38, padding: "0 16px", fontSize: 13 }}
        >
          <Icon name="plus" size={16} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Staff Grid Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {barbers.map((b) => (
          <div
            key={b.id}
            style={{
              background: "#141414",
              border: "1px solid #2A2418",
              borderRadius: 12,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={b.avatar} alt={b.name} style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", border: "1.5px solid #D4AF37" }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#FFF" }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{b.title}</div>
                <div style={{ fontSize: 11, color: "#AAA", fontFamily: "Inter", marginTop: 2 }}>📱 {b.phone}</div>
              </div>
            </div>

            <div style={{ background: "#181818", padding: "10px 12px", borderRadius: 8, fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <span style={{ color: "#777", display: "block" }}>نظام الراتب:</span>
                <strong style={{ color: "#DDD" }}>{b.salaryType}</strong>
              </div>
              <div>
                <span style={{ color: "#777", display: "block" }}>الأساسي / العمولة:</span>
                <strong style={{ color: "#F5C242", fontFamily: "Inter" }}>
                  {b.basicSalary > 0 ? `${b.basicSalary} ج.م` : "—"} ({b.commissionRate}%)
                </strong>
              </div>
              <div>
                <span style={{ color: "#777", display: "block" }}>اسم المستخدم للدخول:</span>
                <strong style={{ color: "#56D364", fontFamily: "Inter" }}>{b.username || b.name.split(" ")[0].toLowerCase()}</strong>
              </div>
              <div>
                <span style={{ color: "#777", display: "block" }}>كلمة المرور / PIN:</span>
                <strong style={{ color: "#F5C242", fontFamily: "Inter" }}>{b.password || b.pin || "123456"}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, height: 32, fontSize: 12 }}
                onClick={() => {
                  setSelectedEmp(b);
                  setStatementModalOpen(true);
                }}
              >
                كشف الحساب
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h2>إضافة موظف / حلاق جديد</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateEmp}>
              <div className="form-group">
                <label className="form-label">الاسم بالكامل:</label>
                <input type="text" className="form-input" placeholder="مثال: يوسف حسني" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">المسمى الوظيفي:</label>
                  <select className="form-input" value={title} onChange={(e) => setTitle(e.target.value)}>
                    <option value="حلاق أول">حلاق أول (Senior Barber)</option>
                    <option value="سنيور باربر">سنيور باربر (Master)</option>
                    <option value="أخصائي عناية وتصفيف">أخصائي عناية وتصفيف</option>
                    <option value="مساعد حلاق">مساعد حلاق</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الجوال:</label>
                  <input type="tel" className="form-input" placeholder="010xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>

              {/* Login Credentials for Employee Section */}
              <div
                style={{
                  background: "#1A1711",
                  border: "1px solid #3D321A",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#F5C242", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="key" size={15} />
                  <span>بيانات تسجيل دخول الموظف للنظام (صفحة الموظفين):</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">اسم المستخدم (Username):</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="مثال: youssef"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">كلمة المرور (Password):</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="كلمة مرور الدخول"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">رمز PIN للحضور (4 أرقام):</label>
                  <input type="text" className="form-input" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} required style={{ textAlign: "center", letterSpacing: 4 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">نظام المحاسبة:</label>
                  <select className="form-input" value={salaryType} onChange={(e) => setSalaryType(e.target.value as any)}>
                    <option value="ثابت + عمولة">راتب ثابت + عمولة</option>
                    <option value="عمولة">عمولة فقط</option>
                    <option value="ثابت">راتب ثابت فقط</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">الراتب الأساسي (ج.م):</label>
                  <input type="number" className="form-input" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">نسبة العمولة (%):</label>
                  <input type="number" className="form-input" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, height: 42 }}>
                  <span>حفظ بيانات الموظف</span>
                  <Icon name="check" size={16} />
                </button>
                <button type="button" className="secondary-btn" onClick={() => setModalOpen(false)} style={{ height: 42 }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {statementModalOpen && selectedEmp && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div className="modal-head">
              <h2>كشف الحساب المالي: {selectedEmp.name}</h2>
              <button type="button" onClick={() => setStatementModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div style={{ background: "#181818", padding: 14, borderRadius: 10, marginBottom: 14, fontSize: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>الراتب الأساسي: <strong style={{ color: "#FFF", fontFamily: "Inter" }}>{selectedEmp.basicSalary} ج.م</strong></div>
              <div>نسبة العمولة: <strong style={{ color: "#F5C242", fontFamily: "Inter" }}>{selectedEmp.commissionRate}%</strong></div>
              <div>عمولات الشهر الحالية: <strong style={{ color: "#56D364", fontFamily: "Inter" }}>4,850 ج.م</strong></div>
              <div>إجمالي المستحق المتوقع: <strong style={{ color: "#F5C242", fontFamily: "Inter" }}>{selectedEmp.basicSalary + 4850} ج.م</strong></div>
            </div>
            <button type="button" className="primary-btn" style={{ width: "100%", height: 38 }} onClick={() => setStatementModalOpen(false)}>
              إغلاق كشف الحساب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

