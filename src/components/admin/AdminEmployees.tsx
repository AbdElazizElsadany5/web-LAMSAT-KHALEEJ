import { useState } from "react";
import { Barber, AttendanceRecord, AdvanceRecord } from "../../types";
import { Icon } from "../Icons";

export function AdminEmployees({
  barbers,
  attendanceRecords = [],
  advances = [],
  onSaveEmployee,
  onShowToast,
}: {
  barbers: Barber[];
  attendanceRecords?: AttendanceRecord[];
  advances?: AdvanceRecord[];
  onSaveEmployee: (emp: Barber) => void;
  onShowToast: (msg: string) => void;
}) {
  // Add Employee Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("حلاق أول");
  const [newPhone, setNewPhone] = useState("");
  const [newBasicSalary, setNewBasicSalary] = useState(6000);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("123456");
  const [newPin, setNewPin] = useState("1234");
  const [newIban, setNewIban] = useState("");

  // Detailed Employee Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Barber | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<"info" | "attendance" | "advances" | "security">("info");

  // Admin Security Password Gate State
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [isSecurityUnlocked, setIsSecurityUnlocked] = useState(false);

  // Security Credentials Editing State for Selected Employee
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editIban, setEditIban] = useState("");
  const [editBasicSalary, setEditBasicSalary] = useState<number>(0);
  const [showEditPass, setShowEditPass] = useState(false);

  // Open Full Profile Modal
  const handleOpenProfile = (b: Barber) => {
    setSelectedEmp(b);
    setProfileActiveTab("info");
    setEditUsername(b.username || b.name.split(" ")[0].toLowerCase());
    setEditPassword(b.password || "123456");
    setEditPin(b.pin || "1234");
    setEditIban(b.iban || "EG380002000100000000012345678");
    setEditBasicSalary(b.basicSalary || 6000);
    setProfileModalOpen(true);
  };

  // Open Security Edit Modal Directly
  const handleOpenSecurity = (b: Barber) => {
    setSelectedEmp(b);
    setEditUsername(b.username || b.name.split(" ")[0].toLowerCase());
    setEditPassword(b.password || "123456");
    setEditPin(b.pin || "1234");
    setEditIban(b.iban || "EG380002000100000000012345678");
    setEditBasicSalary(b.basicSalary || 6000);
    setAdminPasswordInput("");
    setAdminAuthError("");

    if (isSecurityUnlocked) {
      setProfileActiveTab("security");
      setProfileModalOpen(true);
    } else {
      setSecurityModalOpen(true);
    }
  };

  // Verify Admin Password
  const handleVerifyAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === "admin123" || adminPasswordInput === "1234" || adminPasswordInput.trim() === "admin") {
      setIsSecurityUnlocked(true);
      setSecurityModalOpen(false);
      setProfileActiveTab("security");
      setProfileModalOpen(true);
      onShowToast("🔓 تم التحقق بنجاح وتأكيد صلاحيات المدير العام");
    } else {
      setAdminAuthError("كلمة مرور المدير العام غير صحيحة! يرجى المحاولة مرة أخرى.");
    }
  };

  // Save Security Changes
  const handleSaveSecurityCredentials = () => {
    if (!selectedEmp) return;
    if (!editPassword.trim() || !editPin.trim()) {
      alert("الرجاء عدم ترك كلمة المرور أو رمز PIN فارغين");
      return;
    }

    const updated: Barber = {
      ...selectedEmp,
      username: editUsername.trim().toLowerCase(),
      password: editPassword.trim(),
      pin: editPin.trim(),
      iban: editIban.trim(),
      basicSalary: Number(editBasicSalary) || selectedEmp.basicSalary,
      salaryType: "ثابت",
    };

    onSaveEmployee(updated);
    setSelectedEmp(updated);
    onShowToast(`✅ تم تحديث بيانات الأمان، الآيبان، والراتب للموظف «${updated.name}»`);
  };

  // Add New Employee
  const handleCreateEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const finalUsername = newUsername.trim().toLowerCase() || `emp_${Date.now().toString().slice(-4)}`;
    const finalPassword = newPassword.trim() || "123456";

    const newEmp: Barber = {
      id: `b-${Date.now()}`,
      name: newName.trim(),
      username: finalUsername,
      password: finalPassword,
      title: newTitle,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      phone: newPhone.trim() || "01000000000",
      status: "غير حاضر",
      checkInTime: "—",
      checkOutTime: "—",
      pin: newPin.trim() || "1234",
      iban: newIban.trim() || "EG380002000100000000012345678",
      salaryType: "ثابت",
      basicSalary: Number(newBasicSalary) || 6000,
      completedToday: 0,
      revenueToday: 0,
      rating: 5.0,
    };

    onSaveEmployee(newEmp);
    setAddModalOpen(false);
    setNewName("");
    setNewUsername("");
    setNewPassword("123456");
    setNewPhone("");
    setNewIban("");
    onShowToast(`تمت إضافة الموظف «${newEmp.name}» براتب ثابت وبدون عمولات بنجاح`);
  };

  // Filter records for selected employee
  const empAttendance = selectedEmp
    ? attendanceRecords.filter((r) => r.barberId === selectedEmp.id || r.barberName === selectedEmp.name)
    : [];

  const empAdvances = selectedEmp
    ? advances.filter((a) => a.barberId === selectedEmp.id || a.barberName === selectedEmp.name)
    : [];

  const empTotalAdvances = empAdvances.reduce((sum, a) => sum + a.amount, 0);
  const empPaidAdvances = empAdvances.reduce((sum, a) => sum + (a.paidAmount || 0), 0);
  const empRemainingAdvances = empTotalAdvances - empPaidAdvances;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            إدارة فريق العمل والموظفين
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            إدارة ملفات الموظفين، الرواتب الشهرية الثابتة، وتعديل كلمات المرور والآيبان المشفرة
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setAddModalOpen(true)}
          style={{ height: 38, padding: "0 16px", fontSize: 13 }}
        >
          <Icon name="plus" size={16} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Staff Grid Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 16 }}>
        {barbers.map((b) => (
          <div
            key={b.id}
            style={{
              background: "#141414",
              border: "1px solid #2A2418",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
              boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            }}
          >
            {/* Top row: Avatar & basic info */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={b.avatar}
                  alt={b.name}
                  style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", border: "2px solid #D4AF37" }}
                />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF" }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: "#D4AF37", fontWeight: 600 }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: "#AAA", fontFamily: "Inter", marginTop: 2 }}>📱 {b.phone}</div>
                </div>
              </div>

              <span
                style={{
                  background:
                    b.status === "متاح" || b.status === "مشغول"
                      ? "rgba(63,185,80,0.15)"
                      : b.status === "في استراحة"
                        ? "rgba(245,194,66,0.15)"
                        : "rgba(100,100,100,0.15)",
                  color:
                    b.status === "متاح" || b.status === "مشغول"
                      ? "#56D364"
                      : b.status === "في استراحة"
                        ? "#F5C242"
                        : "#AAA",
                  border: `1px solid ${
                    b.status === "متاح" || b.status === "مشغول"
                      ? "#3FB950"
                      : b.status === "في استراحة"
                        ? "#D4AF37"
                        : "#333"
                  }`,
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {b.status}
              </span>
            </div>

            {/* Quick Data Grid (Commissions completely removed) */}
            <div
              style={{
                background: "#191919",
                border: "1px solid #262117",
                padding: "12px 14px",
                borderRadius: 10,
                fontSize: 12,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <span style={{ color: "#777", display: "block" }}>الراتب الشهري:</span>
                <strong style={{ color: "#56D364", fontSize: 14, fontFamily: "Inter" }}>
                  {b.basicSalary.toLocaleString("ar-EG")} ج.م
                </strong>
                <span style={{ fontSize: 10, color: "#888", display: "block" }}>راتب ثابت (بدون عمولات)</span>
              </div>

              <div>
                <span style={{ color: "#777", display: "block" }}>اسم المستخدم:</span>
                <strong style={{ color: "#FFF", fontFamily: "Inter" }}>
                  {b.username || b.name.split(" ")[0].toLowerCase()}
                </strong>
              </div>

              <div>
                <span style={{ color: "#777", display: "block" }}>كلمة المرور / PIN:</span>
                <strong style={{ color: "#888", fontFamily: "Inter", letterSpacing: 2 }}>
                  {isSecurityUnlocked ? `${b.password || "123"} / ${b.pin}` : "••••••••"}
                </strong>
              </div>

              <div>
                <span style={{ color: "#777", display: "block" }}>الآيبان / الحساب:</span>
                <strong style={{ color: "#888", fontFamily: "Inter", fontSize: 10 }}>
                  {b.iban
                    ? isSecurityUnlocked
                      ? b.iban
                      : `${b.iban.slice(0, 4)}••••${b.iban.slice(-4)}`
                    : "EG••••••••••••"}
                </strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, height: 36, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => handleOpenProfile(b)}
              >
                <Icon name="users" size={14} />
                <span>ملف الموظف الشامل</span>
              </button>

              <button
                type="button"
                className="primary-btn"
                style={{
                  height: 36,
                  padding: "0 12px",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: isSecurityUnlocked ? "rgba(63,185,80,0.18)" : "rgba(212,175,55,0.18)",
                  border: `1px solid ${isSecurityUnlocked ? "#3FB950" : "#D4AF37"}`,
                  color: isSecurityUnlocked ? "#56D364" : "#F5C242",
                }}
                onClick={() => handleOpenSecurity(b)}
                title="تعديل وتغيير كلمات المرور والآيبان (محمي بكلمة مرور المدير)"
              >
                <Icon name={isSecurityUnlocked ? "unlock" : "lock"} size={14} />
                <span>{isSecurityUnlocked ? "تعديل الأمان" : "تعديل الباسورد والآيبان"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: Admin Security Password Prompt Gate */}
      {securityModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-box" style={{ maxWidth: 420, textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(212,175,55,0.15)",
                border: "2px solid #D4AF37",
                color: "#F5C242",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Icon name="lock" size={26} />
            </div>

            <h3 style={{ fontSize: 19, fontWeight: 900, color: "#FFF", margin: "0 0 8px" }}>
              تأكيد هوية المدير العام (السوبر أدمن)
            </h3>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
              لعرض وتعديل البيانات الحساسة (كلمات المرور، الرمز السري PIN، ورقم الآيبان البنكي)، يرجى إدخال كلمة مرور المدير العام للمتابعة.
            </p>

            {adminAuthError && (
              <div
                style={{
                  background: "rgba(229,72,77,0.15)",
                  border: "1px solid #E5484D",
                  color: "#FF8E92",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  marginBottom: 14,
                }}
              >
                {adminAuthError}
              </div>
            )}

            <form onSubmit={handleVerifyAdminPassword}>
              <input
                type="password"
                className="form-input"
                placeholder="أدخل كلمة مرور الأدمن (تجريبي: admin123)"
                value={adminPasswordInput}
                onChange={(e) => {
                  setAdminPasswordInput(e.target.value);
                  setAdminAuthError("");
                }}
                autoFocus
                style={{ textAlign: "center", fontSize: 16, marginBottom: 16 }}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, height: 42 }}>
                  <Icon name="check" size={16} />
                  <span>تأكيد وفك القفل</span>
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSecurityModalOpen(false)}
                  style={{ height: 42, padding: "0 18px" }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Comprehensive Employee Profile Modal */}
      {profileModalOpen && selectedEmp && (
        <div className="modal-overlay" style={{ zIndex: 900 }}>
          <div className="modal-box" style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Modal Header */}
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={selectedEmp.avatar}
                  alt={selectedEmp.name}
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1.5px solid #D4AF37" }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>ملف الموظف: {selectedEmp.name}</h2>
                  <span style={{ fontSize: 12, color: "#888" }}>{selectedEmp.title} • هاتف: {selectedEmp.phone}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Internal Tabs Strip */}
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 24px",
                background: "#111",
                borderBottom: "1px solid #231E15",
                overflowX: "auto",
              }}
            >
              {[
                { id: "info" as const, label: "البيانات والراتب", icon: "users" },
                { id: "attendance" as const, label: `أيام وساعات الحضور (${empAttendance.length})`, icon: "clock" },
                { id: "advances" as const, label: `السلف والخصومات (${empAdvances.length})`, icon: "dollarSign" },
                { id: "security" as const, label: "🔒 الأمان، الباسورد والآيبان", icon: "key" },
              ].map((tab) => {
                const active = profileActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === "security" && !isSecurityUnlocked) {
                        setSecurityModalOpen(true);
                      } else {
                        setProfileActiveTab(tab.id);
                      }
                    }}
                    style={{
                      height: 34,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: active ? "1px solid #D4AF37" : "1px solid transparent",
                      background: active ? "rgba(212,175,55,0.2)" : "transparent",
                      color: active ? "#F5C242" : "#999",
                      fontWeight: active ? 800 : 600,
                      fontSize: 13,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {/* TAB 1: General Info & Fixed Salary */}
              {profileActiveTab === "info" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      background: "#181818",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid #262117",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 12, color: "#888" }}>الاسم الكامل:</span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#FFF" }}>{selectedEmp.name}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#888" }}>المسمى الوظيفي:</span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#D4AF37" }}>{selectedEmp.title}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#888" }}>رقم الهاتف المحمول:</span>
                      <div style={{ fontSize: 14, color: "#FFF", fontFamily: "Inter" }}>{selectedEmp.phone}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#888" }}>تقييم العملاء:</span>
                      <div style={{ fontSize: 14, color: "#F5C242", fontWeight: 700 }}>★ {selectedEmp.rating} / 5.0</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#888" }}>حالة الدوام الحالية:</span>
                      <div style={{ fontSize: 14, color: "#56D364", fontWeight: 700 }}>{selectedEmp.status}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "#888" }}>وقت تسجيل الحضور اليوم:</span>
                      <div style={{ fontSize: 14, color: "#FFF", fontFamily: "Inter" }}>{selectedEmp.checkInTime}</div>
                    </div>
                  </div>

                  {/* Salary Box (Pure Fixed Salary, No Commission) */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 100%)",
                      border: "1.5px solid #D4AF37",
                      borderRadius: 12,
                      padding: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: "#C5B392", fontWeight: 700 }}>الراتب الشهري الثابت:</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                        نظام الصالون يعتمد على الراتب الثابت فقط لجميع الموظفين (بدون نسب عمولات)
                      </div>
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#F5C242", fontFamily: "Inter" }}>
                      {selectedEmp.basicSalary.toLocaleString("ar-EG")} <small style={{ fontSize: 14 }}>ج.م</small>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Attendance Days & Hours History */}
              {profileActiveTab === "attendance" && (
                <div>
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
                    سجل أيام الحضور والانصراف الموثق لشهر فبراير 2026 للموظف «{selectedEmp.name}»:
                  </div>
                  {empAttendance.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>
                      لا توجد سجلات حضور مسجلة لهذا الموظف في هذا الشهر بعد.
                    </div>
                  ) : (
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>التاريخ</th>
                            <th>وقت الحضور</th>
                            <th>وقت الانصراف</th>
                            <th>ساعات العمل</th>
                            <th>التأخير</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empAttendance.map((r) => (
                            <tr key={r.id}>
                              <td style={{ fontWeight: 700, color: "#FFF" }}>{r.date}</td>
                              <td style={{ color: "#56D364", fontFamily: "Inter", fontWeight: 700 }}>{r.checkIn}</td>
                              <td style={{ color: "#FFAE42", fontFamily: "Inter", fontWeight: 700 }}>{r.checkOut}</td>
                              <td style={{ fontFamily: "Inter", fontWeight: 700 }}>{r.workingHours} س</td>
                              <td style={{ fontFamily: "Inter", color: (r.lateMinutes || 0) > 0 ? "#FF8E92" : "#888" }}>
                                {(r.lateMinutes || 0) > 0 ? `${r.lateMinutes} دقيقة` : "0 (ملتزم)"}
                              </td>
                              <td>
                                <span className={`badge ${r.status === "حاضر" ? "success" : r.status === "في استراحة" ? "warning" : "neutral"}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: "#888" }}>{r.correctionNote || "دوام اعتيادي"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Advances & Loans */}
              {profileActiveTab === "advances" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                    <div style={{ background: "#181818", padding: 12, borderRadius: 10, border: "1px solid #2B2519" }}>
                      <div style={{ fontSize: 11, color: "#888" }}>إجمالي السلف:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#FF8E92" }}>{empTotalAdvances.toLocaleString()} ج.م</div>
                    </div>
                    <div style={{ background: "#181818", padding: 12, borderRadius: 10, border: "1px solid #2B2519" }}>
                      <div style={{ fontSize: 11, color: "#888" }}>المسدد منها:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#56D364" }}>{empPaidAdvances.toLocaleString()} ج.م</div>
                    </div>
                    <div style={{ background: "#181818", padding: 12, borderRadius: 10, border: "1px solid #2B2519" }}>
                      <div style={{ fontSize: 11, color: "#888" }}>المتبقي للخصم:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#F5C242" }}>{empRemainingAdvances.toLocaleString()} ج.م</div>
                    </div>
                  </div>

                  {empAdvances.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#666" }}>
                      لا توجد أي سلف أو خصومات مسجلة على هذا الموظف.
                    </div>
                  ) : (
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>رقم السلفة</th>
                            <th>المبلغ</th>
                            <th>السبب</th>
                            <th>التاريخ والوقت</th>
                            <th>المسجل</th>
                            <th>الحالة</th>
                            <th>ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empAdvances.map((adv) => (
                            <tr key={adv.id}>
                              <td style={{ fontFamily: "Inter", color: "#F5C242", fontWeight: 700 }}>{adv.id}</td>
                              <td style={{ fontWeight: 800, color: "#FF8E92" }}>{adv.amount.toLocaleString()} ج.م</td>
                              <td style={{ color: "#DDD" }}>{adv.reason}</td>
                              <td style={{ color: "#888", fontSize: 12 }}>{adv.date} • {adv.time}</td>
                              <td style={{ fontSize: 12 }}>{adv.registeredBy} ({adv.registeredByRole === "admin" ? "أدمن" : "كاشير"})</td>
                              <td>
                                <span className={`badge ${adv.status === "مسدد" ? "success" : adv.status === "جزئي" ? "warning" : "danger"}`}>
                                  {adv.status}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: "#888" }}>{adv.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Protected Security, Passwords & IBAN */}
              {profileActiveTab === "security" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {!isSecurityUnlocked ? (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ color: "#F5C242", marginBottom: 12 }}>
                        <Icon name="lock" size={36} />
                      </div>
                      <h4 style={{ color: "#FFF", margin: "0 0 8px" }}>بيانات الأمان والآيبان محمية بكلمة مرور المدير</h4>
                      <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
                        الرجاء إدخال كلمة مرور المدير العام لفك القفل واستعراض أو تعديل كلمة المرور والرمز السري والآيبان.
                      </p>
                      <button type="button" className="primary-btn" onClick={() => setSecurityModalOpen(true)}>
                        <Icon name="unlock" size={16} />
                        <span>فك قفل الأمان وإدخال الباسورد</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div
                        style={{
                          background: "rgba(63,185,80,0.1)",
                          border: "1px solid rgba(63,185,80,0.3)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          fontSize: 12,
                          color: "#56D364",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Icon name="check" size={16} />
                        <span>تم تأكيد هوية المدير العام بنجاح. يمكنك الآن تعديل بيانات الدخول والآيبان والراتب وحفظها فوراً.</span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">اسم المستخدم للدخول (Username):</label>
                          <input
                            type="text"
                            className="form-input"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">كلمة المرور (Password):</label>
                          <div style={{ position: "relative" }}>
                            <input
                              type={showEditPass ? "text" : "password"}
                              className="form-input"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              style={{ paddingRight: 40 }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditPass(!showEditPass)}
                              style={{
                                position: "absolute",
                                right: 10,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "transparent",
                                border: 0,
                                color: "#888",
                                cursor: "pointer",
                              }}
                            >
                              <Icon name={showEditPass ? "eyeOff" : "eye"} size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">الرمز السري للحضور (PIN):</label>
                          <input
                            type="text"
                            maxLength={4}
                            className="form-input"
                            value={editPin}
                            onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                            style={{ textAlign: "center", letterSpacing: 4 }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">الراتب الشهري الثابت (ج.م):</label>
                          <input
                            type="number"
                            className="form-input"
                            value={editBasicSalary}
                            onChange={(e) => setEditBasicSalary(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">رقم الحساب البنكي / الآيبان (IBAN):</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="EG380002000100000000012345678"
                          value={editIban}
                          onChange={(e) => setEditIban(e.target.value)}
                          style={{ fontFamily: "Inter", letterSpacing: 1 }}
                        />
                        <span style={{ fontSize: 11, color: "#888", marginTop: 4, display: "block" }}>
                          يُستخدم هذا الرقم لتحويل الراتب الشهري عبر الحسابات البنكية أو إنستاباي.
                        </span>
                      </div>

                      <button
                        type="button"
                        className="primary-btn"
                        style={{ height: 44, marginTop: 10 }}
                        onClick={handleSaveSecurityCredentials}
                      >
                        <Icon name="check" size={17} />
                        <span>حفظ وتحديث بيانات الأمان والآيبان للموظف</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-foot">
              <button type="button" className="secondary-btn" onClick={() => setProfileModalOpen(false)}>
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add New Employee Modal */}
      {addModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h2>إضافة موظف / حلاق جديد</h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateEmp}>
              <div className="form-group">
                <label className="form-label">الاسم بالكامل *:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: يوسف حسني"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">المسمى الوظيفي:</label>
                  <select className="form-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}>
                    <option value="حلاق أول">حلاق أول (Senior Barber)</option>
                    <option value="سنيور باربر">سنيور باربر (Master)</option>
                    <option value="أخصائي عناية وتصفيف">أخصائي عناية وتصفيف</option>
                    <option value="مساعد حلاق">مساعد حلاق</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الجوال *:</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="010xxxxxxxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">الراتب الشهري الثابت (ج.م) *:</label>
                <input
                  type="number"
                  className="form-input"
                  value={newBasicSalary}
                  onChange={(e) => setNewBasicSalary(Number(e.target.value))}
                  required
                />
                <span style={{ fontSize: 11, color: "#888", marginTop: 4, display: "block" }}>
                  نظام الراتب ثابت فقط (بدون أي نسب عمولات على الخدمات).
                </span>
              </div>

              {/* Login Credentials Section */}
              <div
                style={{
                  background: "#181818",
                  border: "1px solid #2B2519",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#F5C242", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="key" size={15} />
                  <span>بيانات الدخول والرمز السري:</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">اسم المستخدم:</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="مثال: youssef"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">كلمة المرور:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">رمز PIN للحضور (4 أرقام):</label>
                  <input
                    type="text"
                    className="form-input"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    required
                    style={{ textAlign: "center", letterSpacing: 4 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الآيبان (IBAN):</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="EG380002..."
                    value={newIban}
                    onChange={(e) => setNewIban(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, height: 42 }}>
                  <span>إضافة الموظف</span>
                  <Icon name="check" size={16} />
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setAddModalOpen(false)}
                  style={{ height: 42 }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
