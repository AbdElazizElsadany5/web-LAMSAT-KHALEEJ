import { useState, useEffect } from "react";
import { Barber, AttendanceRecord, AdvanceRecord } from "../../types";
import { Icon } from "../Icons";
import {
  getPayrollSettings,
  PayrollCycleType,
  convertSalaryBetweenCycles,
} from "../../utils/payrollSettings";

export function AdminEmployees({
  barbers,
  attendanceRecords = [],
  advances = [],
  onSaveEmployee,
  onDeleteEmployee,
  onShowToast,
}: {
  barbers: Barber[];
  attendanceRecords?: AttendanceRecord[];
  advances?: AdvanceRecord[];
  onSaveEmployee: (emp: Barber) => void;
  onDeleteEmployee?: (id: string) => void;
  onShowToast: (msg: string) => void;
}) {
  const salonPayroll = getPayrollSettings();

  // Add Employee Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("حلاق أول");
  const [newPhone, setNewPhone] = useState("");
  const [newSalaryCycle, setNewSalaryCycle] = useState<PayrollCycleType>(() => salonPayroll.cycleType);
  const [newBasicSalary, setNewBasicSalary] = useState(
    salonPayroll.cycleType === "daily" ? 200 : salonPayroll.cycleType === "weekly" ? 1500 : 6000
  );
  const [newCanStartShift, setNewCanStartShift] = useState(true);

  // Detailed Employee Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Barber | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<"info" | "attendance" | "advances">("info");

  // Direct Employee Editing State inside Profile
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSalaryCycle, setEditSalaryCycle] = useState<PayrollCycleType>("monthly");
  const [editBasicSalary, setEditBasicSalary] = useState<number>(0);

  // Sync default cycle if changed globally
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.cycleType) {
        setNewSalaryCycle(detail.cycleType);
      }
    };
    window.addEventListener("payroll-settings-changed", handleSync);
    return () => window.removeEventListener("payroll-settings-changed", handleSync);
  }, []);

  // Open Full Profile Modal
  const handleOpenProfile = (b: Barber) => {
    setSelectedEmp(b);
    setProfileActiveTab("info");
    setEditName(b.name);
    setEditTitle(b.title);
    setEditPhone(b.phone);
    const empCycle = b.salaryCycle || salonPayroll.cycleType;
    setEditSalaryCycle(empCycle);
    setEditBasicSalary(b.basicSalary || (empCycle === "daily" ? 200 : empCycle === "weekly" ? 1500 : 6000));
    setProfileModalOpen(true);
  };

  // Save Employee Basic Info & Salary Changes Directly
  const handleSaveEmployeeChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    if (!editName.trim()) {
      onShowToast("يرجى إدخال اسم الموظف");
      return;
    }

    const updated: Barber = {
      ...selectedEmp,
      name: editName.trim(),
      title: editTitle.trim() || selectedEmp.title,
      phone: editPhone.trim() || selectedEmp.phone,
      basicSalary: Number(editBasicSalary) || selectedEmp.basicSalary,
      salaryCycle: editSalaryCycle,
      salaryType: "ثابت",
    };

    onSaveEmployee(updated);
    setSelectedEmp(updated);
    onShowToast(`تم تحديث بيانات وراتب الموظف «${updated.name}» بنجاح`);
  };

  // Add New Employee
  const handleCreateEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newEmp: Barber = {
      id: `b-${Date.now()}`,
      name: newName.trim(),
      username: `emp_${Date.now().toString().slice(-4)}`,
      password: "",
      title: newTitle,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      phone: newPhone.trim() || "01000000000",
      status: "غير حاضر",
      checkInTime: "—",
      checkOutTime: "—",
      pin: "0000",
      salaryType: "ثابت",
      salaryCycle: newSalaryCycle,
      basicSalary: Number(newBasicSalary) || (newSalaryCycle === "daily" ? 200 : newSalaryCycle === "weekly" ? 1500 : 6000),
      completedToday: 0,
      revenueToday: 0,
      canStartShift: newCanStartShift,
      rating: 5.0,
    };

    onSaveEmployee(newEmp);
    setAddModalOpen(false);
    setNewName("");
    setNewPhone("");
    setNewCanStartShift(true);
    onShowToast(`تمت إضافة الموظف «${newEmp.name}» براتب ثابت بنجاح`);
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
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            إدارة فريق العمل والموظفين
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            إدارة ملفات الموظفين، الرواتب الشهرية الثابتة، وصلاحيات بدء الوردية
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
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
              boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            }}
          >
            {/* Top row: Basic info */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{b.name}</div>
                <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>{b.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "Inter", marginTop: 2 }}>{b.phone}</div>
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
                      ? "var(--success-text)"
                      : b.status === "في استراحة"
                        ? "var(--light-gold)"
                        : "var(--text-secondary)",
                  border: `1px solid ${
                    b.status === "متاح" || b.status === "مشغول"
                      ? "var(--success-text)"
                      : b.status === "في استراحة"
                        ? "var(--gold)"
                        : "var(--subtle)"
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

            {/* Quick Data Grid */}
            <div
              style={{
                background: "var(--surface-soft)",
                border: "1px solid var(--border-subtle)",
                padding: "12px 14px",
                borderRadius: 10,
                fontSize: 12,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>
                  {b.salaryCycle === "daily"
                    ? "القبض اليومي:"
                    : b.salaryCycle === "weekly"
                      ? "الراتب الأسبوعي:"
                      : "الراتب الشهري:"}
                </span>
                <strong style={{ color: "var(--success-text)", fontSize: 14, fontFamily: "Inter" }}>
                  {b.basicSalary.toLocaleString("ar-EG")} ج.م
                </strong>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--gold)",
                    display: "block",
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  {b.salaryCycle === "daily"
                    ? "يومية (صرف يومي)"
                    : b.salaryCycle === "weekly"
                      ? "أسبوعي (صرف أسبوعي)"
                      : "شهري (صرف شهري)"}
                </span>
              </div>

              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>الحضور اليوم:</span>
                <strong style={{ color: "var(--text)", fontFamily: "Inter" }}>
                  {b.checkInTime && b.checkInTime !== "—" ? b.checkInTime : "لم يسجل بعد"}
                </strong>
                <span style={{ fontSize: 10, color: "var(--muted)", display: "block" }}>
                  تقييم: {b.rating} من 5
                </span>
              </div>
            </div>

            {/* Shift Start Permission Toggle Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                background: "var(--surface-soft)",
                border: "1px solid var(--border-subtle)",
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>
                صلاحية بدء الوردية:
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextAllowed = b.canStartShift === false;
                  onSaveEmployee({ ...b, canStartShift: nextAllowed });
                  onShowToast(
                    nextAllowed
                      ? `تم السماح للموظف «${b.name}» ببدء الوردية`
                      : `تم إيقاف صلاحية بدء الوردية عن «${b.name}»`
                  );
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 20,
                  cursor: "pointer",
                  fontSize: 11.5,
                  fontWeight: 800,
                  background: b.canStartShift === false ? "var(--danger-soft)" : "var(--success-soft)",
                  border: `1px solid ${b.canStartShift === false ? "var(--danger-border)" : "var(--success-border)"}`,
                  color: b.canStartShift === false ? "var(--danger-text)" : "var(--success-text)",
                }}
                title="اضغط لتبديل السماح أو المنع من فتح وردية كاشير"
              >
                <Icon name={b.canStartShift === false ? "lock" : "check"} size={12} />
                <span>{b.canStartShift === false ? "غير مسموح" : "مسموح له"}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, height: 38, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={() => handleOpenProfile(b)}
              >
                <Icon name="users" size={14} />
                <span>ملف الموظف وتعديل البيانات</span>
              </button>
              <button
                type="button"
                className="danger-btn"
                style={{
                  width: 38,
                  height: 38,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                }}
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف الموظف «${b.name}» نهائياً من قاعدة البيانات؟`)) {
                    if (onDeleteEmployee) onDeleteEmployee(b.id);
                  }
                }}
                title={`حذف الموظف «${b.name}»`}
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: Comprehensive Employee Profile Modal */}
      {profileModalOpen && selectedEmp && (
        <div className="modal-overlay" style={{ zIndex: 900 }}>
          <div className="modal-box" style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Modal Header */}
            <div className="modal-head">
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>ملف الموظف: {selectedEmp.name}</h2>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{selectedEmp.title} • هاتف: {selectedEmp.phone}</span>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
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
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border-subtle)",
                overflowX: "auto",
              }}
            >
              {[
                { id: "info" as const, label: "البيانات والراتب", icon: "users" },
                { id: "attendance" as const, label: `أيام وساعات الحضور (${empAttendance.length})`, icon: "clock" },
                { id: "advances" as const, label: `السلف والخصومات (${empAdvances.length})`, icon: "dollarSign" },
              ].map((tab) => {
                const active = profileActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProfileActiveTab(tab.id)}
                    style={{
                      height: 34,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: active ? "1px solid var(--gold)" : "1px solid transparent",
                      background: active ? "rgba(212,175,55,0.2)" : "transparent",
                      color: active ? "var(--light-gold)" : "var(--muted)",
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
                <form onSubmit={handleSaveEmployeeChanges} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      background: "var(--surface-soft)",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">الاسم الكامل:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">المسمى الوظيفي:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">رقم الهاتف المحمول:</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        style={{ fontFamily: "Inter" }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ marginBottom: 6 }}>
                        نظام ودورة صرف الراتب:
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                        {[
                          { id: "monthly" as const, label: "شهري" },
                          { id: "weekly" as const, label: "أسبوعي" },
                          { id: "daily" as const, label: "يومي" },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              const converted = convertSalaryBetweenCycles(editBasicSalary, editSalaryCycle, opt.id);
                              setEditSalaryCycle(opt.id);
                              setEditBasicSalary(converted);
                            }}
                            style={{
                              padding: "7px 6px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              border: `1.5px solid ${editSalaryCycle === opt.id ? "var(--gold)" : "var(--border)"}`,
                              background: editSalaryCycle === opt.id ? "var(--gold-soft)" : "var(--surface-soft)",
                              color: editSalaryCycle === opt.id ? "var(--light-gold)" : "var(--text)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        {editSalaryCycle === "daily"
                          ? "القبض والراتب اليومي (اليومية) (ج.م):"
                          : editSalaryCycle === "weekly"
                            ? "الراتب الأسبوعي (ج.م):"
                            : "الراتب الشهري الثابت (ج.م):"}
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={editBasicSalary}
                        onChange={(e) => setEditBasicSalary(Number(e.target.value))}
                        style={{ fontFamily: "Inter", fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>حالة الدوام الحالية:</span>
                      <div style={{ fontSize: 14, color: "var(--success-text)", fontWeight: 700 }}>{selectedEmp.status}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>وقت تسجيل الحضور اليوم:</span>
                      <div style={{ fontSize: 14, color: "var(--text)", fontFamily: "Inter" }}>{selectedEmp.checkInTime}</div>
                    </div>
                  </div>

                  {/* Salary Box (Pure Fixed Salary, No Commission) */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 100%)",
                      border: "1.5px solid var(--gold)",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>
                        {editSalaryCycle === "daily"
                          ? "القبض اليومي (اليومية):"
                          : editSalaryCycle === "weekly"
                            ? "الراتب الأسبوعي الثابت:"
                            : "الراتب الشهري الثابت:"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {editSalaryCycle === "daily"
                          ? "يتم احتساب الراتب بنظام اليومية ويُصرف بنهاية كل وردية"
                          : editSalaryCycle === "weekly"
                            ? "يتم صرف الراتب أسبوعياً في الموعد المحدد"
                            : "نظام الصالون يعتمد على الراتب الثابت فقط (بدون نسب عمولات)"}
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "var(--light-gold)", fontFamily: "Inter" }}>
                      {Number(editBasicSalary || 0).toLocaleString("ar-EG")} <small style={{ fontSize: 13 }}>ج.م</small>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="submit" className="primary-btn" style={{ flex: 1, height: 42 }}>
                      <Icon name="check" size={16} />
                      <span>حفظ التعديلات</span>
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      style={{ height: 42, padding: "0 18px", display: "flex", alignItems: "center", gap: 6 }}
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف الموظف «${selectedEmp.name}» نهائياً من قاعدة البيانات؟`)) {
                          if (onDeleteEmployee) onDeleteEmployee(selectedEmp.id);
                          setProfileModalOpen(false);
                        }
                      }}
                    >
                      <Icon name="trash" size={16} />
                      <span>حذف الموظف</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: Attendance Days & Hours History */}
              {profileActiveTab === "attendance" && (
                <div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                    سجل أيام الحضور والانصراف الموثق لشهر فبراير 2026 للموظف «{selectedEmp.name}»:
                  </div>
                  {empAttendance.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--subtle)" }}>
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
                              <td style={{ fontWeight: 700, color: "var(--text)" }}>{r.date}</td>
                              <td style={{ color: "var(--success-text)", fontFamily: "Inter", fontWeight: 700 }}>{r.checkIn}</td>
                              <td style={{ color: "var(--warning-text)", fontFamily: "Inter", fontWeight: 700 }}>{r.checkOut}</td>
                              <td style={{ fontFamily: "Inter", fontWeight: 700 }}>{r.workingHours} س</td>
                              <td style={{ fontFamily: "Inter", color: (r.lateMinutes || 0) > 0 ? "var(--danger-text)" : "var(--muted)" }}>
                                {(r.lateMinutes || 0) > 0 ? `${r.lateMinutes} دقيقة` : "0 (ملتزم)"}
                              </td>
                              <td>
                                <span className={`badge ${r.status === "حاضر" ? "success" : r.status === "في استراحة" ? "warning" : "neutral"}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: "var(--muted)" }}>{r.correctionNote || "دوام اعتيادي"}</td>
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
                    <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>إجمالي السلف:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--danger-text)" }}>{empTotalAdvances.toLocaleString()} ج.م</div>
                    </div>
                    <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>المسدد منها:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--success-text)" }}>{empPaidAdvances.toLocaleString()} ج.م</div>
                    </div>
                    <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>المتبقي للخصم:</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--light-gold)" }}>{empRemainingAdvances.toLocaleString()} ج.م</div>
                    </div>
                  </div>

                  {empAdvances.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--subtle)" }}>
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
                              <td style={{ fontFamily: "Inter", color: "var(--light-gold)", fontWeight: 700 }}>{adv.id}</td>
                              <td style={{ fontWeight: 800, color: "var(--danger-text)" }}>{adv.amount.toLocaleString()} ج.م</td>
                              <td style={{ color: "var(--text)" }}>{adv.reason}</td>
                              <td style={{ color: "var(--muted)", fontSize: 12 }}>{adv.date} • {adv.time}</td>
                              <td style={{ fontSize: 12 }}>{adv.registeredBy} ({adv.registeredByRole === "admin" ? "أدمن" : "كاشير"})</td>
                              <td>
                                <span className={`badge ${adv.status === "مسدد" ? "success" : adv.status === "جزئي" ? "warning" : "danger"}`}>
                                  {adv.status}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, color: "var(--muted)" }}>{adv.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

      {/* MODAL 2: Add New Employee Modal */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "var(--gold-soft)",
                    color: "var(--light-gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="users" size={18} />
                </span>
                <div>
                  <h2 style={{ fontSize: 17, margin: 0 }}>إضافة موظف / حلاق جديد</h2>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
                    تسجيل بيانات الموظف والراتب وصلاحيات الوردية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 4 }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEmp} style={{ display: "flex", flexDirection: "column", flex: 1, margin: 0 }}>
              <div className="modal-body" style={{ gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
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
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">المسمى الوظيفي:</label>
                    <select className="form-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}>
                      <option value="حلاق أول">حلاق أول (Senior Barber)</option>
                      <option value="سنيور باربر">سنيور باربر (Master)</option>
                      <option value="أخصائي عناية وتصفيف">أخصائي عناية وتصفيف</option>
                      <option value="مساعد حلاق">مساعد حلاق</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">رقم الجوال *:</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="010xxxxxxxx"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      style={{ direction: "ltr", textAlign: "right", fontFamily: "Inter, Cairo" }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: 6 }}>
                    نظام ودورة صرف الراتب للموظف:
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {[
                      { id: "monthly" as const, label: "شهري", sub: "راتب شهري" },
                      { id: "weekly" as const, label: "أسبوعي", sub: "راتب كل أسبوع" },
                      { id: "daily" as const, label: "يومي", sub: "يومية بعد الوردية" },
                    ].map((opt) => {
                      const active = newSalaryCycle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const converted = convertSalaryBetweenCycles(newBasicSalary, newSalaryCycle, opt.id);
                            setNewSalaryCycle(opt.id);
                            setNewBasicSalary(converted);
                          }}
                          style={{
                            padding: "10px 8px",
                            borderRadius: 10,
                            border: `1.5px solid ${active ? "var(--gold)" : "var(--border)"}`,
                            background: active ? "var(--gold-soft)" : "var(--surface-soft)",
                            color: active ? "var(--light-gold)" : "var(--text)",
                            fontWeight: 700,
                            fontSize: 12.5,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span>{opt.label}</span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>{opt.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    {newSalaryCycle === "daily"
                      ? "القبض والراتب اليومي (اليومية) *:"
                      : newSalaryCycle === "weekly"
                      ? "الراتب الأسبوعي *:"
                      : "الراتب الشهري الثابت *:"}
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type="number"
                      className="form-input"
                      value={newBasicSalary || ""}
                      onChange={(e) => setNewBasicSalary(Number(e.target.value))}
                      placeholder={newSalaryCycle === "daily" ? "مثال: 250" : newSalaryCycle === "weekly" ? "مثال: 1500" : "مثال: 6000"}
                      style={{ paddingLeft: 46, fontFamily: "Inter, Cairo", fontSize: 15, fontWeight: 700 }}
                      required
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: 14,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--light-gold)",
                        pointerEvents: "none",
                      }}
                    >
                      ج.م
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                    {newSalaryCycle === "daily"
                      ? "يتم احتساب هذا المبلغ كيومية مستحقة بنهاية كل وردية."
                      : newSalaryCycle === "weekly"
                      ? "يتم احتساب هذا المبلغ كراتب أسبوعي منتظم."
                      : "نظام الراتب ثابت فقط لجميع الموظفين (بدون عمولات)."}
                  </span>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: newCanStartShift ? "var(--gold-soft)" : "var(--surface-soft)",
                    border: `1.5px solid ${newCanStartShift ? "var(--border-gold)" : "var(--border)"}`,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newCanStartShift}
                    onChange={(e) => setNewCanStartShift(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "var(--gold)" }}
                  />
                  <div>
                    <div>يحق لهذا الموظف بدء وردية كاشير</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginTop: 1 }}>
                      يسمح له باختيار اسمه وبدء وردية عمل على شاشة نقطة البيع
                    </div>
                  </div>
                </label>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setAddModalOpen(false)}
                  style={{ height: 42, padding: "0 20px" }}
                >
                  إلغاء
                </button>
                <button type="submit" className="primary-btn" style={{ height: 42, padding: "0 24px", gap: 6 }}>
                  <span>إضافة الموظف</span>
                  <Icon name="check" size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
