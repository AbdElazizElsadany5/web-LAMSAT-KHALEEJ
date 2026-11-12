import { useState, useEffect } from "react";
import { Barber, AttendanceRecord, UserRole, AdvanceRecord } from "../types";
import { Icon } from "./Icons";
import {
  AttendancePolicy,
  getAttendancePolicy,
  saveAttendancePolicy,
  formatTime24ToArabic12,
  getRecordLateMinutes,
  getRecordLateDeduction,
} from "../utils/attendancePolicy";

export function AttendancePage({
  barbers,
  attendanceRecords,
  advances = [],
  userRole,
  activeEmployeeName,
  onUpdateBarberStatus,
  onAdminCorrectAttendance,
  onUpdateBarberSchedule,
}: {
  barbers: Barber[];
  attendanceRecords: AttendanceRecord[];
  advances?: AdvanceRecord[];
  userRole: UserRole;
  activeEmployeeName?: string;
  onUpdateBarberStatus: (barberId: string, newStatus: Barber["status"], timeStr: string) => void;
  onAdminCorrectAttendance: (recordId: string, newCheckIn: string, newCheckOut: string, reason: string) => void;
  onUpdateBarberSchedule?: (barberId: string, scheduledTime: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"cards" | "table">("cards");
  const [employeeTab, setEmployeeTab] = useState<"clockin" | "attendance_history" | "advances" | "salary">("clockin");
  const [statusFilter, setStatusFilter] = useState<string>("الكل");
  const [toastMsg, setToastMsg] = useState("");
  const [policy, setPolicy] = useState<AttendancePolicy>(getAttendancePolicy);

  // Admin Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);
  const [correctedCheckIn, setCorrectedCheckIn] = useState("");
  const [correctedCheckOut, setCorrectedCheckOut] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    const syncPolicy = (e: any) => {
      if (e.detail) setPolicy(e.detail);
    };
    window.addEventListener("attendance-policy-changed", syncPolicy);
    return () => window.removeEventListener("attendance-policy-changed", syncPolicy);
  }, []);

  const getBarberSummary = (b: Barber) => {
    const recs = attendanceRecords.filter(
      (r) => r.barberId === b.id || r.barberName === b.name
    );
    const presentDays = recs.filter((r) => r.status !== "لم يحضر").length;
    const absentDays = recs.filter((r) => r.status === "لم يحضر").length;
    const totalLateMinutes = recs.reduce((sum, r) => sum + getRecordLateMinutes(r), 0);
    const totalLateDeduction = recs.reduce(
      (sum, r) => sum + getRecordLateDeduction(r, policy),
      0
    );
    const remainingAdvances = (advances || [])
      .filter((a) => a.barberId === b.id || a.barberName === b.name)
      .reduce((sum, a) => sum + Math.max(0, a.amount - (a.paidAmount || 0)), 0);
    const basicSalary = b.basicSalary || 0;
    const netPay = Math.max(0, basicSalary - totalLateDeduction - remainingAdvances);
    return {
      presentDays,
      absentDays,
      totalLateMinutes,
      totalLateDeduction,
      remainingAdvances,
      basicSalary,
      netPay,
    };
  };

  // KPIs
  const presentCount = barbers.filter((b) => b.status === "متاح" || b.status === "مشغول").length;
  const breakCount = barbers.filter((b) => b.status === "في استراحة").length;
  const leftCount = barbers.filter((b) => b.status === "منصرف").length;
  const absentCount = barbers.filter((b) => b.status === "غير حاضر").length;
  const totalBarbers = barbers.length;

  // Matched Employee Data for Employee-specific Dashboard
  const currentEmployee = barbers.find((b) => {
    if (!activeEmployeeName) return false;
    const cleanActive = activeEmployeeName.toLowerCase();
    const bFirst = b.name.split(" ")[0].toLowerCase();
    return (
      b.name.includes(activeEmployeeName) ||
      cleanActive.includes(bFirst) ||
      (b.username && cleanActive.includes(b.username.toLowerCase()))
    );
  }) || barbers[0];

  const empAttendance = attendanceRecords.filter(
    (r) => r.barberId === currentEmployee?.id || r.barberName === currentEmployee?.name
  );
  const empAdvances = (advances || []).filter(
    (a) => a.barberId === currentEmployee?.id || a.barberName === currentEmployee?.name
  );
  const empTotalAdvances = empAdvances.reduce((sum, a) => sum + a.amount, 0);
  const empPaidAdvances = empAdvances.reduce((sum, a) => sum + (a.paidAmount || 0), 0);
  const empRemainingAdvances = empTotalAdvances - empPaidAdvances;
  const empNetSalary = (currentEmployee?.basicSalary || 0) - empRemainingAdvances;

  const filteredBarbers = barbers.filter((b) => {
    if (userRole === "employee" && activeEmployeeName) {
      return b.name.includes(activeEmployeeName) || activeEmployeeName.includes(b.name.split(" ")[0]);
    }
    if (statusFilter === "الكل") return true;
    if (statusFilter === "حاضر") return b.status === "متاح" || b.status === "مشغول";
    return b.status === statusFilter;
  });

  // Direct Status Update (no PIN needed since cashier is verified on shift start)
  const handleDirectStatusUpdate = (barber: Barber, action: "checkin" | "break" | "checkout") => {
    const nowStr = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    let newStatus: Barber["status"] = "متاح";
    let actionDesc = "";

    if (action === "checkin") {
      newStatus = "متاح";
      actionDesc = "تسجيل حضور وبدء الوردية";
    } else if (action === "break") {
      newStatus = barber.status === "في استراحة" ? "متاح" : "في استراحة";
      actionDesc = newStatus === "في استراحة" ? "بدء استراحة" : "انتهاء الاستراحة والعودة للعمل";
    } else {
      newStatus = "منصرف";
      actionDesc = "تسجيل انصراف وإغلاق يوم العمل";
    }

    onUpdateBarberStatus(barber.id, newStatus, nowStr);
    showToast(`تم ${actionDesc} للموظف «${barber.name}» بنجاح`);
  };

  // Submit Admin Correction
  const handleSaveCorrection = () => {
    if (!selectedRecordForCorrection) return;
    if (!correctionReason.trim()) {
      alert("يجب كتابة سبب التعديل لتوثيقه في سجل العمليات والتدقيق!");
      return;
    }
    onAdminCorrectAttendance(
      selectedRecordForCorrection.id,
      correctedCheckIn,
      correctedCheckOut,
      correctionReason,
    );
    setCorrectionModalOpen(false);
    showToast(`تم تصحيح سجل الحضور وتوثيق العملية في سجل العمليات`);
  };

  return (
    <div>
      {/* Top Header KPIs */}
      {userRole === "employee" ? (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div>
              <div className="kpi-label">حالة الدوام الحالية</div>
              <div className="kpi-value gold">{currentEmployee.status}</div>
              <div className="kpi-hint positive">
                <Icon name="clock" size={13} />
                <span>حضور: {currentEmployee.checkInTime}</span>
              </div>
            </div>
            <div className="kpi-icon-wrap">
              <Icon name="scissors" size={20} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-label">الراتب الأساسي الشهري</div>
              <div className="kpi-value">
                {currentEmployee.basicSalary.toLocaleString("ar-EG")} <small style={{ fontSize: 13 }}>ج.م</small>
              </div>
              <div className="kpi-hint">
                <span>نظام راتب ثابت (بدون عمولات)</span>
              </div>
            </div>
            <div className="kpi-icon-wrap" style={{ color: "var(--gold)", borderColor: "var(--border-gold)" }}>
              <Icon name="wallet" size={20} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-label">إجمالي السلف المستحقة</div>
              <div className="kpi-value" style={{ color: empRemainingAdvances > 0 ? "var(--danger-text)" : "var(--success-text)" }}>
                {empRemainingAdvances.toLocaleString("ar-EG")} <small style={{ fontSize: 13 }}>ج.م</small>
              </div>
              <div className="kpi-hint">
                <span>{empAdvances.length} سلف مسجلة</span>
              </div>
            </div>
            <div className="kpi-icon-wrap" style={{ color: "var(--danger-text)", borderColor: "var(--danger-border)" }}>
              <Icon name="dollarSign" size={20} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-label">صافي المستحق التقديري</div>
              <div className="kpi-value positive" style={{ color: "var(--success-text)" }}>
                {Math.max(0, empNetSalary).toLocaleString("ar-EG")} <small style={{ fontSize: 13 }}>ج.م</small>
              </div>
              <div className="kpi-hint positive">
                <span>الراتب الأساسي مخصوماً منه السلف</span>
              </div>
            </div>
            <div className="kpi-icon-wrap" style={{ color: "var(--success-text)", borderColor: "var(--success-border)" }}>
              <Icon name="chart" size={20} />
            </div>
          </div>
        </div>
      ) : (
        <div className="kpi-grid">
          <div className="kpi-card">
            <div>
              <div className="kpi-label">الحاضرون على الكراسي</div>
              <div className="kpi-value gold">{presentCount} <small style={{ fontSize: 14 }}>حلاق</small></div>
              <div className="kpi-hint positive">
                <Icon name="check" size={13} />
                <span>جاهزون لخدمة العملاء</span>
              </div>
            </div>
            <div className="kpi-icon-wrap">
              <Icon name="scissors" size={20} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-label">في استراحة حالياً</div>
              <div className="kpi-value">{breakCount} <small style={{ fontSize: 14 }}>حلاق</small></div>
              <div className="kpi-hint" style={{ color: "var(--warning-text)" }}>
                <Icon name="clock" size={13} />
                <span>فترة راحة مصرحة</span>
              </div>
            </div>
            <div className="kpi-icon-wrap" style={{ color: "var(--warning-text)", borderColor: "var(--warning-border)" }}>
              <Icon name="pause" size={20} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-label">تم انصرافهم اليوم</div>
              <div className="kpi-value">{leftCount}</div>
              <div className="kpi-hint">
                <span>انتهت ورديتهم</span>
              </div>
            </div>
            <div className="kpi-icon-wrap" style={{ color: "var(--text-secondary)", borderColor: "var(--subtle)" }}>
              <Icon name="logout" size={20} />
            </div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-label">نسبة الالتزام بالدوام</div>
              <div className="kpi-value positive" style={{ color: "var(--success-text)" }}>
                {Math.round(((presentCount + breakCount) / Math.max(1, totalBarbers)) * 100)}%
              </div>
              <div className="kpi-hint positive">
                <span>{presentCount + breakCount} من أصل {totalBarbers} موظفين</span>
              </div>
            </div>
            <div className="kpi-icon-wrap" style={{ color: "var(--success-text)", borderColor: "var(--success-border)" }}>
              <Icon name="chart" size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              {userRole === "employee"
                ? `صفحة الموظف: ${currentEmployee.name}`
                : userRole === "admin"
                  ? "متابعة وتقارير الحضور والانصراف (إدارة)"
                  : "تسجيل حضور وانصراف فريق العمل"}
            </h2>
            <p>
              {userRole === "employee"
                ? "متابعة سجل أيام الحضور، أوقات العمل، السلف والخصومات، وكشف الراتب الشهري"
                : userRole === "admin"
                  ? "متابعة الموظفين فقط بدون تحضير، تحديد ميعاد حضور الغد، وحساب خصم التأخير وصافي القبض"
                  : "تسجيل الحضور والاستراحة والانصراف للموظفين بالرمز السري (PIN)"}
            </p>
          </div>

          {userRole === "employee" ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "clockin" as const, label: "تسجيل الدوام (PIN)" },
                { id: "attendance_history" as const, label: `سجل أيام الحضور (${empAttendance.length})` },
                { id: "advances" as const, label: `السلف والخصومات (${empAdvances.length})` },
                { id: "salary" as const, label: "كشف الراتب والمستحقات" },
              ].map((tab) => {
                const isActive = employeeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEmployeeTab(tab.id)}
                    style={{
                      height: 36,
                      padding: "0 14px",
                      borderRadius: 8,
                      background: isActive
                        ? "linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.1) 100%)"
                        : "var(--surface-2)",
                      border: `1px solid ${isActive ? "var(--gold)" : "var(--border)"}`,
                      color: isActive ? "var(--light-gold)" : "var(--text-secondary)",
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 4,
                  display: "flex",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("cards")}
                  style={{
                    height: 34,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: activeTab === "cards" ? "var(--gold)" : "transparent",
                    color: activeTab === "cards" ? "#111" : "var(--text-secondary)",
                    border: 0,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {userRole === "admin" ? "متابعة الموظفين ومواعيد الغد" : "بطاقات الموظفين"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("table")}
                  style={{
                    height: 34,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: activeTab === "table" ? "var(--gold)" : "transparent",
                    color: activeTab === "table" ? "#111" : "var(--text-secondary)",
                    border: 0,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {userRole === "admin" ? "تقارير الحضور والغياب وصافي القبض" : "جدول الحضور اليومي"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* EMPLOYEE VIEW - TAB 1: Clock In Card */}
        {userRole === "employee" && employeeTab === "clockin" && (
          <div style={{ maxWidth: 580, margin: "20px auto" }}>
            <div
              style={{
                background: "var(--surface-2)",
                border: "1.5px solid var(--border)",
                borderRadius: 16,
                padding: 28,
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>{currentEmployee.name}</div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{currentEmployee.title}</div>
                  <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 4 }}>
                    تقييم: {currentEmployee.rating} من 5 • هاتف: {currentEmployee.phone}
                  </div>
                </div>

                <span
                  className={`badge ${
                    currentEmployee.status === "متاح" || currentEmployee.status === "مشغول"
                      ? "success"
                      : currentEmployee.status === "في استراحة"
                        ? "warning"
                        : "neutral"
                  }`}
                  style={{ fontSize: 14, padding: "6px 14px" }}
                >
                  <i />
                  {currentEmployee.status}
                </span>
              </div>

              {/* Attendance Timestamps */}
              <div
                style={{
                  background: "var(--surface-deep)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  marginBottom: 24,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>وقت تسجيل الحضور:</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--success-text)", marginTop: 4 }}>
                    {currentEmployee.checkInTime}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>وقت الانصراف اليوم:</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--warning-text)", marginTop: 4 }}>
                    {currentEmployee.checkOutTime}
                  </div>
                </div>
              </div>

              {/* Direct Action Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                {currentEmployee.status === "غير حاضر" || currentEmployee.status === "منصرف" ? (
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ width: "100%", height: 46, fontSize: 15 }}
                    onClick={() => handleDirectStatusUpdate(currentEmployee, "checkin")}
                  >
                    <Icon name="check" size={17} />
                    <span>تسجيل حضور وبدء الوردية</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ flex: 1, height: 46, fontSize: 14 }}
                      onClick={() => handleDirectStatusUpdate(currentEmployee, "break")}
                    >
                      <Icon name="pause" size={16} />
                      <span>{currentEmployee.status === "في استراحة" ? "إنهاء الاستراحة والعودة" : "بدء استراحة"}</span>
                    </button>

                    <button
                      type="button"
                      className="danger-ghost"
                      style={{ flex: 1, height: 46, fontSize: 14 }}
                      onClick={() => handleDirectStatusUpdate(currentEmployee, "checkout")}
                    >
                      <Icon name="logout" size={16} />
                      <span>تسجيل انصراف الوردية</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EMPLOYEE VIEW - TAB 2: Attendance History */}
        {userRole === "employee" && employeeTab === "attendance_history" && (
          <div>
            <div style={{ marginBottom: 14, fontSize: 13, color: "var(--muted)" }}>
              سجل الحضور والانصراف الموثق الخاص بك لشهر فبراير 2026:
            </div>
            {empAttendance.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 0", color: "var(--subtle)" }}>
                لا توجد سجلات حضور مسجلة لهذا الشهر بعد.
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
                      <th>دقائق التأخير</th>
                      <th>الحالة</th>
                      <th>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empAttendance.map((rec) => (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: 700, color: "var(--text)" }}>{rec.date}</td>
                        <td style={{ fontFamily: "Inter", color: "var(--success-text)", fontWeight: 700 }}>{rec.checkIn}</td>
                        <td style={{ fontFamily: "Inter", color: "var(--warning-text)", fontWeight: 700 }}>{rec.checkOut}</td>
                        <td style={{ fontFamily: "Inter", fontWeight: 700 }}>{rec.workingHours} س</td>
                        <td style={{ fontFamily: "Inter", color: (rec.lateMinutes || 0) > 0 ? "var(--danger-text)" : "var(--muted)" }}>
                          {(rec.lateMinutes || 0) > 0 ? `${rec.lateMinutes} دقيقة` : "0 (ملتزم)"}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              rec.status === "حاضر" ? "success" : rec.status === "في استراحة" ? "warning" : "neutral"
                            }`}
                          >
                            <i />
                            {rec.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--muted)" }}>
                          {rec.correctionNote || "دوام اعتيادي"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* EMPLOYEE VIEW - TAB 3: Advances & Loans */}
        {userRole === "employee" && employeeTab === "advances" && (
          <div>
            {/* KPI Summary for Advances */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>إجمالي مبالغ السلف</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--danger-text)" }}>
                  {empTotalAdvances.toLocaleString("ar-EG")} ج.م
                </div>
              </div>

              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>المُسدَّد منها</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success-text)" }}>
                  {empPaidAdvances.toLocaleString("ar-EG")} ج.م
                </div>
              </div>

              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>المتبقي للخصم من الراتب</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--light-gold)" }}>
                  {empRemainingAdvances.toLocaleString("ar-EG")} ج.م
                </div>
              </div>
            </div>

            {/* Advances Table */}
            {empAdvances.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 0",
                  color: "var(--subtle)",
                  background: "var(--surface-2)",
                  borderRadius: 12,
                  border: "1px dashed var(--border-strong)",
                }}
              >
                <Icon name="check" size={32} style={{ color: "var(--success-text)" } as any} />
                <p style={{ marginTop: 10, color: "var(--text-secondary)" }}>لا توجد أي سلف أو خصومات مسجلة عليك حالياً. حسابك نظيف تماماً.</p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>رقم السلفة</th>
                      <th>المبلغ</th>
                      <th>السبب</th>
                      <th>تاريخ ووقت الصرف</th>
                      <th>سجلت بواسطة</th>
                      <th>الحالة</th>
                      <th>ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empAdvances.map((adv) => (
                      <tr key={adv.id}>
                        <td style={{ fontFamily: "Inter", fontWeight: 700, color: "var(--light-gold)" }}>{adv.id}</td>
                        <td style={{ fontWeight: 800, color: "var(--danger-text)", fontSize: 15 }}>
                          {adv.amount.toLocaleString("ar-EG")} ج.م
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{adv.reason}</td>
                        <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                          {adv.date} • {adv.time}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <span style={{ color: adv.registeredByRole === "admin" ? "var(--gold)" : "var(--info-text)" }}>
                            {adv.registeredBy}
                          </span>
                          <span style={{ color: "var(--subtle)", marginRight: 4 }}>
                            ({adv.registeredByRole === "admin" ? "أدمن" : "كاشير"})
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              background: adv.status === "مسدد" ? "rgba(63,185,80,0.15)" : adv.status === "جزئي" ? "rgba(245,194,66,0.15)" : "rgba(229,72,77,0.15)",
                              color: adv.status === "مسدد" ? "var(--success-text)" : adv.status === "جزئي" ? "var(--light-gold)" : "var(--danger-text)",
                              border: `1px solid ${adv.status === "مسدد" ? "var(--success-text)" : adv.status === "جزئي" ? "var(--gold)" : "var(--danger-text)"}`,
                              borderRadius: 20,
                              padding: "2px 10px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
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

            <div
              style={{
                marginTop: 18,
                padding: "12px 16px",
                borderRadius: 10,
                background: "var(--card)",
                border: "1px solid var(--border-subtle)",
                fontSize: 12,
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              ℹ️ <strong>ملاحظة هامة:</strong> السلف المسجلة عبر الكاشير أو الإدارة يتم خصمها تلقائياً عند تسليم كشف الراتب الشهري، ويمكن سدادها نقداً عبر الإدارة لإعادتها إلى الخزينة وتسجيلها كمسددة.
            </div>
          </div>
        )}

        {/* EMPLOYEE VIEW - TAB 4: Monthly Salary & Deductions */}
        {userRole === "employee" && employeeTab === "salary" && (
          <div>
            <div
              style={{
                background: "var(--surface-2)",
                border: "1.5px solid var(--gold)",
                borderRadius: 16,
                padding: 28,
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                maxWidth: 680,
                margin: "0 auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18, fontWeight: 900 }}>
                    كشف الحساب والراتب الشهري
                  </h3>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>شهر فبراير 2026 • الموظف: {currentEmployee.name}</span>
                </div>
                <span
                  style={{
                    background: "rgba(212,175,55,0.15)",
                    border: "1px solid var(--gold)",
                    color: "var(--light-gold)",
                    borderRadius: 8,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  نظام الراتب: ثابت فقط
                </span>
              </div>

              {/* Breakdown Grid (Pure Fixed Salary, Zero Commissions) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: "var(--surface-2)",
                    borderRadius: 10,
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>الراتب الشهري الأساسي الثابت:</span>
                  <strong style={{ color: "var(--text)", fontSize: 17, fontFamily: "Inter" }}>
                    {currentEmployee.basicSalary.toLocaleString("ar-EG")} ج.م
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: "var(--surface-2)",
                    borderRadius: 10,
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                      إجمالي الخصومات والسلف المستحقة:
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 2 }}>
                      ({empAdvances.length} سلف مسجلة عبر الكاشير / الإدارة)
                    </span>
                  </div>
                  <strong style={{ color: "var(--danger-text)", fontSize: 17, fontFamily: "Inter" }}>
                    -{empRemainingAdvances.toLocaleString("ar-EG")} ج.م
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    padding: "18px 22px",
                    background: "linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.06) 100%)",
                    border: "1.5px solid var(--gold)",
                    borderRadius: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 800 }}>
                      صافي الراتب المستحق التقديري للصرف:
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                      (الراتب الأساسي الثابت - إجمالي السلف المتبقية)
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "var(--light-gold)", fontFamily: "Inter, Cairo" }}>
                    {Math.max(0, empNetSalary).toLocaleString("ar-EG")}{" "}
                    <small style={{ fontSize: 16, fontFamily: "Cairo" }}>ج.م</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN & CASHIER VIEW - Tab 1: Cards View */}
        {userRole !== "employee" && activeTab === "cards" && (
          <div>
            {/* Admin Delay Deduction Policy Bar & Status Filters */}
            {userRole === "admin" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div
                  style={{
                    background: "var(--surface-deep)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name="clock" size={18} style={{ color: "var(--gold)" } as any} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--light-gold)" }}>
                        سياسة خصم التأخير عن الموعد المحدد
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        أي تأخير عن الموعد المحدد لكل موظف يتم خصمه تلقائياً وحساب صافي القبض في التقارير
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
                      <span>خصم الدقيقة (ج.م):</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className="form-input"
                        style={{ width: 84, height: 34, fontFamily: "Inter", textAlign: "center" }}
                        value={policy.deductionPerMinute}
                        onChange={(e) => {
                          const updated = saveAttendancePolicy({
                            deductionPerMinute: Math.max(0, Number(e.target.value) || 0),
                          });
                          setPolicy(updated);
                        }}
                      />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
                      <span>فترة السماح (دقائق):</span>
                      <input
                        type="number"
                        min={0}
                        className="form-input"
                        style={{ width: 80, height: 34, fontFamily: "Inter", textAlign: "center" }}
                        value={policy.graceMinutes}
                        onChange={(e) => {
                          const updated = saveAttendancePolicy({
                            graceMinutes: Math.max(0, Number(e.target.value) || 0),
                          });
                          setPolicy(updated);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["الكل", "حاضر", "في استراحة", "منصرف", "غير حاضر"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      style={{
                        height: 36,
                        padding: "0 14px",
                        borderRadius: 8,
                        background: statusFilter === st ? "rgba(212, 175, 55, 0.15)" : "var(--surface-2)",
                        border: `1px solid ${statusFilter === st ? "var(--gold)" : "var(--border)"}`,
                        color: statusFilter === st ? "var(--light-gold)" : "var(--text-secondary)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
              {filteredBarbers.map((b) => {
                const isOnline = b.status === "متاح" || b.status === "مشغول";
                const isBreak = b.status === "في استراحة";
                const scheduled = b.scheduledStartTime || policy.defaultScheduledTime;
                const summary = getBarberSummary(b);

                return (
                  <div
                    key={b.id}
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div>
                      {/* Top row: Name & status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{b.name}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{b.title}</div>
                        </div>

                        <span
                          className={`badge ${
                            isOnline ? "success" : isBreak ? "warning" : "neutral"
                          }`}
                        >
                          <i />
                          {b.status}
                        </span>
                      </div>

                      {/* Timestamps */}
                      <div
                        style={{
                          background: "var(--surface-deep)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          marginBottom: 14,
                          fontSize: 13,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)" }}>وقت الحضور:</span>
                          <strong style={{ color: b.checkInTime !== "—" ? "var(--success-text)" : "var(--subtle)", fontFamily: "Inter" }}>
                            {b.checkInTime}
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)" }}>وقت الانصراف:</span>
                          <strong style={{ color: b.checkOutTime !== "—" ? "var(--warning-text)" : "var(--subtle)", fontFamily: "Inter" }}>
                            {b.checkOutTime}
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--muted)" }}>الميعاد المحدد للحضور:</span>
                          <strong style={{ color: "var(--gold)", fontFamily: "Inter" }}>
                            {formatTime24ToArabic12(scheduled)}
                          </strong>
                        </div>

                        {userRole === "admin" ? (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-strong)", paddingTop: 6 }}>
                              <span style={{ color: "var(--muted)" }}>التأخير وخصم التأخير:</span>
                              <strong style={{ color: summary.totalLateDeduction > 0 ? "var(--danger-text)" : "var(--success-text)", fontFamily: "Inter" }}>
                                {summary.totalLateMinutes > 0
                                  ? `${summary.totalLateMinutes} د (-${summary.totalLateDeduction.toLocaleString("ar-EG")} ج.م)`
                                  : "0 د (ملتزم)"}
                              </strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "var(--muted)" }}>صافي القبض المستحق:</span>
                              <strong style={{ color: "var(--light-gold)", fontFamily: "Inter", fontSize: 14 }}>
                                {summary.netPay.toLocaleString("ar-EG")} ج.م
                              </strong>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-strong)", paddingTop: 4 }}>
                            <span style={{ color: "var(--muted)" }}>الخدمات المنجزة اليوم:</span>
                            <strong style={{ color: "var(--light-gold)", fontFamily: "Inter" }}>{b.completedToday} خدمة</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ADMIN VIEW: Next-Day Schedule Input ONLY (NO Check-in / Check-out Buttons) */}
                    {userRole === "admin" ? (
                      <div
                        style={{
                          background: "rgba(212, 175, 55, 0.08)",
                          border: "1px solid rgba(212, 175, 55, 0.28)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <label
                            htmlFor={`sched-${b.id}`}
                            style={{ fontSize: 12.5, fontWeight: 700, color: "var(--light-gold)" }}
                          >
                            ميعاد حضور تاني يوم:
                          </label>
                          <input
                            id={`sched-${b.id}`}
                            type="time"
                            className="form-input"
                            style={{
                              width: 130,
                              height: 34,
                              fontFamily: "Inter",
                              fontWeight: 700,
                              padding: "0 10px",
                              colorScheme: "dark",
                            }}
                            value={scheduled}
                            onChange={(e) => {
                              const newTime = e.target.value;
                              if (!newTime) return;
                              onUpdateBarberSchedule?.(b.id, newTime);
                              showToast(
                                `تم تحديد ميعاد حضور «${b.name}» تاني يوم الساعة ${formatTime24ToArabic12(newTime)}`
                              );
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
                          شاشة الإدارة للمتابعة وتحديد المواعيد فقط (التحضير عبر الكاشير)
                        </div>
                      </div>
                    ) : (
                      /* CASHIER VIEW: Direct Action Buttons (No PIN) */
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        {b.status === "غير حاضر" || b.status === "منصرف" ? (
                          <button
                            type="button"
                            className="primary-btn"
                            style={{ flex: 1, height: 38, fontSize: 13 }}
                            onClick={() => handleDirectStatusUpdate(b, "checkin")}
                          >
                            <Icon name="check" size={15} />
                            <span>تسجيل حضور</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="secondary-btn"
                              style={{ flex: 1, height: 38, fontSize: 12 }}
                              onClick={() => handleDirectStatusUpdate(b, "break")}
                            >
                              <Icon name="pause" size={14} />
                              <span>{b.status === "في استراحة" ? "إنهاء الاستراحة" : "استراحة"}</span>
                            </button>

                            <button
                              type="button"
                              className="danger-ghost"
                              style={{ flex: 1, height: 38, fontSize: 12 }}
                              onClick={() => handleDirectStatusUpdate(b, "checkout")}
                            >
                              <Icon name="logout" size={14} />
                              <span>انصراف</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Attendance & Absence Reports + Net Pay Summary */}
        {activeTab === "table" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {userRole === "admin" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: "var(--light-gold)" }}>
                      تقرير الحضور والغياب، خصومات التأخير، وصافي القبض
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
                      ملخص لكل موظف: ميعاد حضور الغد، دقائق التأخير، الخصم المحسوب ({policy.deductionPerMinute} ج.م/دقيقة)، السلف، وصافي القبض
                    </p>
                  </div>
                </div>

                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الموظف</th>
                        <th>ميعاد حضور تاني يوم</th>
                        <th>أيام الحضور</th>
                        <th>أيام الغياب</th>
                        <th>إجمالي التأخير</th>
                        <th>خصم التأخير</th>
                        <th>السلف</th>
                        <th>الراتب الأساسي</th>
                        <th>صافي القبض</th>
                      </tr>
                    </thead>
                    <tbody>
                      {barbers.map((b) => {
                        const scheduled = b.scheduledStartTime || policy.defaultScheduledTime;
                        const summary = getBarberSummary(b);
                        return (
                          <tr key={b.id}>
                            <td>
                              <div style={{ fontWeight: 800, color: "var(--text)" }}>{b.name}</div>
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{b.status}</div>
                            </td>
                            <td>
                              <input
                                type="time"
                                className="form-input"
                                style={{
                                  width: 122,
                                  height: 32,
                                  fontFamily: "Inter",
                                  fontSize: 12.5,
                                  padding: "0 8px",
                                  colorScheme: "dark",
                                }}
                                value={scheduled}
                                onChange={(e) => {
                                  const newTime = e.target.value;
                                  if (!newTime) return;
                                  onUpdateBarberSchedule?.(b.id, newTime);
                                  showToast(
                                    `تم تحديث ميعاد حضور «${b.name}» تاني يوم إلى ${formatTime24ToArabic12(newTime)}`
                                  );
                                }}
                              />
                            </td>
                            <td style={{ fontFamily: "Inter", fontWeight: 700, color: "var(--success-text)" }}>
                              {summary.presentDays}
                            </td>
                            <td style={{ fontFamily: "Inter", fontWeight: 700, color: summary.absentDays > 0 ? "var(--danger-text)" : "var(--muted)" }}>
                              {summary.absentDays}
                            </td>
                            <td style={{ fontFamily: "Inter", fontWeight: 700, color: summary.totalLateMinutes > 0 ? "var(--danger-text)" : "var(--success-text)" }}>
                              {summary.totalLateMinutes > 0 ? `${summary.totalLateMinutes} دقيقة` : "0 (ملتزم)"}
                            </td>
                            <td style={{ fontFamily: "Inter", fontWeight: 800, color: summary.totalLateDeduction > 0 ? "var(--danger-text)" : "var(--muted)" }}>
                              {summary.totalLateDeduction > 0
                                ? `-${summary.totalLateDeduction.toLocaleString("ar-EG")} ج.م`
                                : "0 ج.م"}
                            </td>
                            <td style={{ fontFamily: "Inter", color: summary.remainingAdvances > 0 ? "var(--warning-text)" : "var(--muted)" }}>
                              {summary.remainingAdvances > 0
                                ? `-${summary.remainingAdvances.toLocaleString("ar-EG")} ج.م`
                                : "0 ج.م"}
                            </td>
                            <td style={{ fontFamily: "Inter", color: "var(--text)" }}>
                              {summary.basicSalary.toLocaleString("ar-EG")} ج.م
                            </td>
                            <td style={{ fontFamily: "Inter", fontWeight: 900, fontSize: 15.5, color: "var(--light-gold)" }}>
                              {summary.netPay.toLocaleString("ar-EG")} ج.م
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              {userRole === "admin" && (
                <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800, color: "var(--text)" }}>
                  السجل التفصيلي للحضور والانصراف والتأخير
                </h3>
              )}
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th>التاريخ</th>
                      <th>الميعاد المحدد</th>
                      <th>وقت الحضور</th>
                      <th>وقت الانصراف</th>
                      <th>إجمالي الساعات</th>
                      <th>مدة التأخير</th>
                      {userRole === "admin" && <th>قيمة الخصم</th>}
                      <th>الحالة</th>
                      {userRole === "admin" && <th>الإجراءات (أدمن)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((rec) => {
                      const recLateMins = getRecordLateMinutes(rec);
                      const recDeduction = getRecordLateDeduction(rec, policy);
                      const recSched = rec.scheduledTime || policy.defaultScheduledTime;
                      return (
                        <tr key={rec.id}>
                          <td style={{ fontWeight: 700 }}>{rec.barberName}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{rec.date}</td>
                          <td style={{ fontFamily: "Inter", color: "var(--gold)", fontWeight: 600 }}>
                            {formatTime24ToArabic12(recSched)}
                          </td>
                          <td style={{ fontFamily: "Inter", color: "var(--success-text)" }}>{rec.checkIn}</td>
                          <td style={{ fontFamily: "Inter", color: "var(--warning-text)" }}>{rec.checkOut}</td>
                          <td style={{ fontFamily: "Inter", fontWeight: 700 }}>
                            {rec.workingHours ?? rec.hoursWorked ?? 0} س
                          </td>
                          <td style={{ fontFamily: "Inter", color: recLateMins > 0 ? "var(--danger-text)" : "var(--success-text)", fontWeight: recLateMins > 0 ? 700 : 400 }}>
                            {recLateMins > 0 ? `${recLateMins} دقيقة` : "0 (ملتزم)"}
                          </td>
                          {userRole === "admin" && (
                            <td style={{ fontFamily: "Inter", color: recDeduction > 0 ? "var(--danger-text)" : "var(--muted)", fontWeight: recDeduction > 0 ? 700 : 400 }}>
                              {recDeduction > 0 ? `-${recDeduction.toLocaleString("ar-EG")} ج.م` : "0 ج.م"}
                            </td>
                          )}
                          <td>
                            <span
                              className={`badge ${
                                rec.status === "حاضر"
                                  ? "success"
                                  : rec.status === "في استراحة"
                                    ? "warning"
                                    : rec.status === "لم يحضر"
                                      ? "danger"
                                      : "neutral"
                              }`}
                            >
                              <i />
                              {rec.status}
                            </span>
                          </td>
                          {userRole === "admin" && (
                            <td>
                              <button
                                type="button"
                                className="secondary-btn"
                                style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                                onClick={() => {
                                  setSelectedRecordForCorrection(rec);
                                  setCorrectedCheckIn(rec.checkIn);
                                  setCorrectedCheckOut(rec.checkOut);
                                  setCorrectionReason("");
                                  setCorrectionModalOpen(true);
                                }}
                              >
                                <Icon name="edit" size={13} />
                                <span>تصحيح السجل</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MODAL 2: Admin Attendance Correction Modal */}
      {correctionModalOpen && selectedRecordForCorrection && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div className="modal-head">
              <h2>تصحيح سجل الحضور (صلاحية أدمن)</h2>
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: "var(--surface-soft)",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                <div>الموظف: <strong style={{ color: "var(--text)" }}>{selectedRecordForCorrection.barberName}</strong></div>
                <div>التاريخ: <strong>{selectedRecordForCorrection.date}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">وقت الحضور المصحح:</label>
                <input
                  type="text"
                  className="form-input"
                  value={correctedCheckIn}
                  onChange={(e) => setCorrectedCheckIn(e.target.value)}
                  placeholder="مثال: 09:00 ص"
                />
              </div>

              <div className="form-group">
                <label className="form-label">وقت الانصراف المصحح:</label>
                <input
                  type="text"
                  className="form-input"
                  value={correctedCheckOut}
                  onChange={(e) => setCorrectedCheckOut(e.target.value)}
                  placeholder="مثال: 06:00 م"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "var(--warning-text)" }}>
                  سبب التصحيح (إلزامي للتوثيق في سجل العمليات):
                </label>
                <textarea
                  className="form-textarea"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="اكتب سبب التعديل (مثلاً: عطل فني في جهاز البصمة، تأكيد الحضور عبر كاميرات المراقبة...)"
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCorrectionModalOpen(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveCorrection}
              >
                حفظ التصحيح وتوثيقه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="toast-bar">
          <span style={{ color: "var(--success-text)", display: "inline-flex" }}>
            <Icon name="check" size={18} />
          </span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

