import { useState, useEffect } from "react";
import { Barber, AdvanceRecord, AttendanceRecord } from "../../types";
import { Icon } from "../Icons";
import {
  getAttendancePolicy,
  getRecordLateMinutes,
  getRecordLateDeduction,
} from "../../utils/attendancePolicy";
import { executeReceiptPrint } from "../../utils/printHelper";
import {
  getPayrollSettings,
  calculatePayrollCountdown,
  getDisbursedEmployeeIds,
  setDisbursedEmployee,
  resetDisbursedEmployees,
  PayrollSettings,
  convertSalaryBetweenCycles,
} from "../../utils/payrollSettings";

export function AdminPayroll({
  barbers,
  advances = [],
  attendanceRecords = [],
  onShowToast,
}: {
  barbers: Barber[];
  advances?: AdvanceRecord[];
  attendanceRecords?: AttendanceRecord[];
  onShowToast: (msg: string) => void;
}) {
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>(getPayrollSettings);
  const [disbursedIds, setDisbursedIds] = useState<string[]>(() =>
    getDisbursedEmployeeIds(getPayrollSettings())
  );

  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedBarberForVoucher, setSelectedBarberForVoucher] = useState<{
    barber: Barber;
    basic: number;
    monthlyBasic: number;
    tips: number;
    bonus: number;
    advance: number;
    lateMinutes: number;
    lateDeduction: number;
    net: number;
  } | null>(null);

  const [policy, setPolicy] = useState(getAttendancePolicy);

  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const detail = (e as CustomEvent<PayrollSettings>).detail || getPayrollSettings();
      setPayrollSettings(detail);
      setDisbursedIds(getDisbursedEmployeeIds(detail));
    };

    const handleDisbursementChanged = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (detail) setDisbursedIds(detail);
      else setDisbursedIds(getDisbursedEmployeeIds(getPayrollSettings()));
    };

    const handlePolicyChanged = (e: Event) => {
      const detail = (e as CustomEvent<any>).detail || getAttendancePolicy();
      setPolicy(detail);
    };

    window.addEventListener("payroll-settings-changed", handleSettingsChanged);
    window.addEventListener("payroll-disbursement-changed", handleDisbursementChanged);
    window.addEventListener("attendance-policy-changed", handlePolicyChanged);
    return () => {
      window.removeEventListener("payroll-settings-changed", handleSettingsChanged);
      window.removeEventListener("payroll-disbursement-changed", handleDisbursementChanged);
      window.removeEventListener("attendance-policy-changed", handlePolicyChanged);
    };
  }, []);
  const countdown = calculatePayrollCountdown(payrollSettings);

  const cycleTitle =
    payrollSettings.cycleType === "monthly"
      ? "الشهرية"
      : payrollSettings.cycleType === "weekly"
        ? "الأسبوعية"
        : "اليومية";

  const cycleLabelArabic =
    payrollSettings.cycleType === "monthly"
      ? "شهري"
      : payrollSettings.cycleType === "weekly"
        ? "أسبوعي"
        : "يومي";

  // Pure Fixed Salary Payroll (No Commissions) + Automatic Late Deductions
  const payrollData = barbers.map((b) => {
    const empCycle = b.salaryCycle || "monthly";
    const basic = convertSalaryBetweenCycles(b.basicSalary || 6000, empCycle, payrollSettings.cycleType);
    const monthlyBasic = convertSalaryBetweenCycles(b.basicSalary || 6000, empCycle, "monthly");

    const tips = payrollSettings.cycleType === "daily" ? 50 : payrollSettings.cycleType === "weekly" ? 150 : 450;
    const bonus = b.rating >= 4.9 ? (payrollSettings.cycleType === "daily" ? 0 : payrollSettings.cycleType === "weekly" ? 125 : 500) : 0;

    // Calculate actual active advances for this barber
    const barberAdvances = advances.filter((a) => a.barberId === b.id || a.barberName === b.name);
    const activeAdvanceTotal = barberAdvances.reduce(
      (sum, a) => sum + (a.amount - (a.paidAmount || 0)),
      0
    );
    const advanceDeduction = activeAdvanceTotal > 0 ? activeAdvanceTotal : 0;

    // Calculate late minutes & deduction from attendance records
    const barberAttendance = attendanceRecords.filter(
      (r) => r.barberId === b.id || r.barberName === b.name
    );
    const lateMinutes = barberAttendance.reduce((sum, r) => sum + getRecordLateMinutes(r), 0);
    const lateDeduction = barberAttendance.reduce(
      (sum, r) => sum + getRecordLateDeduction(r, policy),
      0
    );

    const net = Math.max(0, basic + tips + bonus - advanceDeduction - lateDeduction);

    return {
      barber: b,
      basic,
      monthlyBasic,
      tips,
      bonus,
      advance: advanceDeduction,
      lateMinutes,
      lateDeduction,
      net,
    };
  });

  const paidCount = barbers.filter((b) => disbursedIds.includes(b.id)).length;
  const totalCount = barbers.length;
  const unpaidCount = Math.max(0, totalCount - paidCount);
  const paidPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  const toggleEmployeePaid = (barber: Barber) => {
    const currentlyPaid = disbursedIds.includes(barber.id);
    const updated = setDisbursedEmployee(barber.id, !currentlyPaid, payrollSettings);
    setDisbursedIds(updated);
    onShowToast(
      !currentlyPaid
        ? `تم تسجيل صرف الراتب للموظف «${barber.name}»`
        : `تم إلغاء حالة الصرف للموظف «${barber.name}»`
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            الرواتب والمستحقات {cycleTitle} (نظام الراتب الثابت)
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            معادلة صافي القبض: الراتب الأساسي + الإكراميات والمكافآت - السلف وخصم التأخير
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ height: 38, padding: "0 14px", fontSize: 12.5, color: "var(--text-secondary)" }}
            onClick={() => {
              if (window.confirm(`هل أنت متأكد من تصفير حالة القبض لجميع الموظفين وبدء دورة قبض جديدة (${cycleLabelArabic})؟`)) {
                const empty = resetDisbursedEmployees(payrollSettings);
                setDisbursedIds(empty);
                onShowToast("تم تصفير دورة القبض وبدء دورة جديدة بنجاح");
              }
            }}
            title="إعادة تعيين حالة القبض وبدء دورة صرف جديدة للموظفين"
          >
            <Icon name="refresh" size={15} />
            <span>بدء دورة قبض جديدة</span>
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ height: 38, padding: "0 16px", fontSize: 13 }}
            onClick={() => onShowToast("تم تصدير مسير الرواتب بصيغة Excel")}
          >
            <Icon name="download" size={16} />
            <span>تصدير مسير الرواتب</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards Requested by User */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {/* Card 1: How many employees got paid */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
              كام عامل قبض (حالة الصرف)
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: paidCount === totalCount && totalCount > 0 ? "var(--success-soft)" : "var(--gold-soft)",
                color: paidCount === totalCount && totalCount > 0 ? "var(--success-text)" : "var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="users" size={16} />
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "Cairo" }}>
            {paidCount} <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 700 }}>من أصل {totalCount} عامل</span>
          </div>

          <div
            style={{
              height: 6,
              width: "100%",
              background: "var(--surface-soft)",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${paidPercent}%`,
                background: paidCount === totalCount && totalCount > 0 ? "var(--success-text)" : "var(--gold)",
                borderRadius: 99,
                transition: "width 0.3s ease",
              }}
            />
          </div>

          <div style={{ fontSize: 11.5, color: unpaidCount === 0 ? "var(--success-text)" : "var(--text-secondary)", fontWeight: 700 }}>
            {unpaidCount === 0 ? "تم صرف جميع المستحقات بنجاح" : `متبقي ${unpaidCount} لم يتم الصرف لهم بعد`}
          </div>
        </div>

        {/* Card 2: Today in the Month */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
              النهاردة كام في الشهر
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "var(--gold-soft)",
                color: "var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="calendar" size={16} />
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>
            يوم {countdown.todayDayOfMonth}{" "}
            <span style={{ fontSize: 15, color: "var(--gold)", fontWeight: 800 }}>
              {countdown.monthName}
            </span>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginTop: "auto" }}>
            {countdown.todayDateStr}
          </div>
        </div>

        {/* Card 3: Remaining Days Until Payday */}
        <div
          style={{
            background: countdown.isTodayPayDay
              ? "linear-gradient(135deg, rgba(63,185,80,0.12) 0%, var(--card) 100%)"
              : "var(--card)",
            border: countdown.isTodayPayDay ? "1.5px solid var(--success-border)" : "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
              باقي كام يوم على القبض
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: countdown.isTodayPayDay ? "var(--success-soft)" : "rgba(212,175,55,0.15)",
                color: countdown.isTodayPayDay ? "var(--success-text)" : "var(--light-gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="clock" size={16} />
            </div>
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: countdown.isTodayPayDay ? "var(--success-text)" : "var(--light-gold)",
            }}
          >
            {countdown.isTodayPayDay
              ? "اليوم موعد القبض!"
              : `${countdown.daysRemaining} ${countdown.daysRemaining === 1 ? "يوم" : countdown.daysRemaining === 2 ? "يومان" : countdown.daysRemaining <= 10 ? "أيام" : "يوم"}`}
          </div>

          <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginTop: "auto" }}>
            {countdown.statusLabel}
          </div>
        </div>

        {/* Card 4: Payroll Schedule Cycle (Admin Settings) */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
              نظام ودورة القبض المعتمدة
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "var(--surface-soft)",
                color: "var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="settings" size={16} />
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>
            صرف {cycleLabelArabic}
          </div>

          <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, marginTop: "auto" }}>
            {countdown.targetDayStr} • يُضبط من الإعدادات
          </div>
        </div>
      </div>

      {/* Payroll Data Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>الموظف / الحلاق</th>
              <th>{payrollSettings.cycleType === "monthly" ? "الراتب الأساسي الثابت" : payrollSettings.cycleType === "weekly" ? "الراتب الأسبوعي" : "الأجر اليومي"}</th>
              <th>الإكراميات</th>
              <th>المكافآت</th>
              <th>خصم التأخير</th>
              <th>السلف</th>
              <th>صافي القبض المستحق</th>
              <th>حالة القبض</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.map((row) => {
              const isPaid = disbursedIds.includes(row.barber.id);
              return (
                <tr key={row.barber.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>{row.barber.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{row.barber.title}</div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "Inter", fontWeight: 700, color: "var(--text)" }}>
                    <div>{row.basic.toLocaleString("ar-EG")} ج.م</div>
                    {payrollSettings.cycleType !== "monthly" && (
                      <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "Cairo" }}>
                        من شهري {row.monthlyBasic.toLocaleString("ar-EG")} ج.م
                      </div>
                    )}
                  </td>
                  <td style={{ fontFamily: "Inter", color: "var(--text-secondary)" }}>+{row.tips} ج.م</td>
                  <td style={{ fontFamily: "Inter", color: row.bonus > 0 ? "var(--success-text)" : "var(--subtle)" }}>
                    {row.bonus > 0 ? `+${row.bonus} ج.م` : "—"}
                  </td>
                  <td style={{ fontFamily: "Inter", color: row.lateDeduction > 0 ? "var(--danger-text)" : "var(--subtle)", fontWeight: row.lateDeduction > 0 ? 700 : 400 }}>
                    {row.lateDeduction > 0
                      ? `-${row.lateDeduction.toLocaleString("ar-EG")} ج.م (${row.lateMinutes} د)`
                      : "0 ج.م"}
                  </td>
                  <td style={{ fontFamily: "Inter", color: row.advance > 0 ? "var(--danger-text)" : "var(--subtle)", fontWeight: row.advance > 0 ? 700 : 400 }}>
                    {row.advance > 0 ? `-${row.advance.toLocaleString("ar-EG")} ج.م` : "0 ج.م"}
                  </td>
                  <td style={{ fontFamily: "Inter", fontWeight: 900, color: "var(--light-gold)", fontSize: 16 }}>
                    {row.net.toLocaleString("ar-EG")} ج.م
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleEmployeePaid(row.barber)}
                      title={isPaid ? "اضغط لإلغاء حالة القبض" : "اضغط لتسجيل أن الموظف قبض"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 800,
                        cursor: "pointer",
                        background: isPaid ? "var(--success-soft)" : "var(--surface-soft)",
                        border: `1px solid ${isPaid ? "var(--success-border)" : "var(--border)"}`,
                        color: isPaid ? "var(--success-text)" : "var(--muted)",
                      }}
                    >
                      <Icon name={isPaid ? "check" : "clock"} size={12} />
                      <span>{isPaid ? "تم القبض" : "لم يقبض"}</span>
                    </button>
                  </td>
                  <td>
                    {isPaid ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{
                            height: 30,
                            padding: "0 10px",
                            fontSize: 11.5,
                            gap: 5,
                            background: "var(--surface-2)",
                            borderColor: "var(--border)",
                            color: "var(--text-secondary)",
                          }}
                          onClick={() => {
                            setSelectedBarberForVoucher(row);
                            setVoucherModalOpen(true);
                          }}
                          title="عرض وإعادة طباعة السند المعتمد"
                        >
                          <Icon name="printer" size={13} />
                          <span>عرض السند</span>
                        </button>
                        <span
                          style={{
                            fontSize: 10.5,
                            color: "var(--muted)",
                            background: "var(--surface-soft)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--border-subtle)",
                            whiteSpace: "nowrap",
                          }}
                          title={`مقبوض لدورة الصرف الحالية (${cycleLabelArabic}) — الصرف القادم: ${countdown.targetDayStr}`}
                        >
                          ينتهي للصرف القادم
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ height: 32, padding: "0 12px", fontSize: 12, gap: 5 }}
                        onClick={() => {
                          setSelectedBarberForVoucher(row);
                          setVoucherModalOpen(true);
                        }}
                      >
                        <Icon name="dollarSign" size={13} />
                        <span>سند صرف</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Voucher Modal */}
      {voucherModalOpen && selectedBarberForVoucher && (() => {
        const isModalBarberPaid = disbursedIds.includes(selectedBarberForVoucher.barber.id);
        return (
          <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 540 }}>
              <div className="modal-head">
                <h2>{isModalBarberPaid ? `سند صرف معتمد ومصروف بالفعل (${cycleLabelArabic})` : `سند صرف معتمد (${cycleLabelArabic})`}</h2>
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              {isModalBarberPaid && (
                <div
                  style={{
                    background: "rgba(63, 185, 80, 0.12)",
                    border: "1px solid rgba(63, 185, 80, 0.35)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    margin: "10px 0 0",
                    fontSize: 12,
                    color: "var(--success-text)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                  }}
                >
                  <Icon name="check" size={16} />
                  <span>تم صرف هذا الراتب بالفعل لدورة {cycleLabelArabic}. الزرار ينتهي لحين دورة القبض القادمة ({countdown.targetDayStr}). يمكنك إعادة طباعة نسخة ورقية أو مراجعة التفاصيل أدناه.</span>
                </div>
              )}

              <div style={{ background: "#FFFFFF", color: "#111", padding: 24, borderRadius: 12, margin: "10px 0" }}>
                <div style={{ textAlign: "center", borderBottom: "2px solid #333", paddingBottom: 10, marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>لمسة خليجي — القاهرة</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    سند صرف رواتب معتمد ({cycleLabelArabic}) {isModalBarberPaid ? "— [تم الصرف]" : ""}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
                  <div>اسم الموظف: <strong>{selectedBarberForVoucher.barber.name}</strong></div>
                  <div>الوظيفة: <strong>{selectedBarberForVoucher.barber.title}</strong></div>
                  <div>رقم السند: <strong>#VCH-2026-904</strong></div>
                  <div>الراتب الأساسي: <strong>{selectedBarberForVoucher.basic.toLocaleString("ar-EG")} ج.م</strong></div>
                  <div>السلف: <strong style={{ color: "#D9534F" }}>-{selectedBarberForVoucher.advance.toLocaleString("ar-EG")} ج.م</strong></div>
                  <div>خصم التأخير ({selectedBarberForVoucher.lateMinutes} د): <strong style={{ color: "#D9534F" }}>-{selectedBarberForVoucher.lateDeduction.toLocaleString("ar-EG")} ج.م</strong></div>
                </div>
                <div style={{ background: "#F5F5F5", padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                  <span>صافي المبلغ المستلم نقداً / تحويل:</span>
                  <span style={{ fontSize: 18, color: "#B8860B" }}>
                    {selectedBarberForVoucher.net.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, paddingTop: 10, borderTop: "1px dashed #CCC", fontSize: 12 }}>
                  <div>توقيع المستلم (الموظف): _______________</div>
                  <div>اعتماد الإدارة: _______________</div>
                </div>
              </div>

              {isModalBarberPaid ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ flex: 1, height: 40 }}
                    onClick={async () => {
                      const res = await executeReceiptPrint({ allowDialogOnVirtualPrinter: true });
                      onShowToast(res.message);
                    }}
                  >
                    <Icon name="printer" size={16} />
                    <span>إعادة طباعة نسخة من السند</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ height: 40, padding: "0 14px", color: "var(--danger-text)", borderColor: "var(--danger-border)" }}
                    onClick={() => {
                      const updated = setDisbursedEmployee(selectedBarberForVoucher.barber.id, false, payrollSettings);
                      setDisbursedIds(updated);
                      onShowToast(`↩️ تم إلغاء حالة القبض وإعادة تفعيل زرار الصرف للموظف «${selectedBarberForVoucher.barber.name}»`);
                      setVoucherModalOpen(false);
                    }}
                  >
                    <Icon name="trash" size={14} />
                    <span>إلغاء القبض وإعادة التفعيل</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setVoucherModalOpen(false)}
                    style={{ height: 40 }}
                  >
                    إغلاق
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ flex: 1, height: 40 }}
                    onClick={async () => {
                      const res = await executeReceiptPrint({ allowDialogOnVirtualPrinter: true });
                      const updated = setDisbursedEmployee(selectedBarberForVoucher.barber.id, true, payrollSettings);
                      setDisbursedIds(updated);
                      onShowToast(res.message);
                      setVoucherModalOpen(false);
                    }}
                  >
                    <Icon name="printer" size={16} />
                    <span>تأكيد الصرف وطباعة السند</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ height: 40, padding: "0 14px" }}
                    onClick={() => {
                      const updated = setDisbursedEmployee(selectedBarberForVoucher.barber.id, true, payrollSettings);
                      setDisbursedIds(updated);
                      onShowToast(`تم تسجيل صرف الراتب للموظف «${selectedBarberForVoucher.barber.name}»`);
                      setVoucherModalOpen(false);
                    }}
                  >
                    <Icon name="check" size={16} />
                    <span>تأكيد الصرف فقط</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setVoucherModalOpen(false)}
                    style={{ height: 40 }}
                  >
                    إغلاق
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
