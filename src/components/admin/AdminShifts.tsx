import { useState } from "react";
import { ShiftRecord, Invoice } from "../../types";
import { Icon } from "../Icons";
import { getSalonSettings } from "../../utils/salonSettings";
import { sfx } from "../../utils/audio";

export function AdminShifts({
  shifts,
  onCloseShift,
  onShowToast,
  invoices = [],
}: {
  shifts: ShiftRecord[];
  onCloseShift: (shiftId: number, actualCash: number, notes: string) => void;
  onShowToast: (msg: string) => void;
  invoices?: Invoice[];
}) {
  const activeShift = shifts.find((s) => s.status === "نشطة") || shifts[0];
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  // Egyptian Pound Denominations: 200, 100, 50, 20, 10, 5
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({
    200: 12,
    100: 10,
    50: 6,
    20: 5,
    10: 2,
    5: 0,
  });
  const [closeNotes, setCloseNotes] = useState("");

  const actualCashCalculated = Object.entries(denomCounts).reduce(
    (acc, [val, count]) => acc + Number(val) * count,
    0
  );

  const variance = actualCashCalculated - (activeShift?.expectedDrawerCash || 0);

  const handleConfirmClose = () => {
    onCloseShift(activeShift.id, actualCashCalculated, closeNotes);
    setCloseModalOpen(false);
    onShowToast(`تم إغلاق الوردية #${activeShift.id} وتسوية الخزينة بنجاح`);
  };

  // Helper to extract full date, timing, day, and hours breakdown for any shift
  const getShiftTimingDetails = (shift: ShiftRecord) => {
    const isLive = shift.status === "نشطة";
    const now = new Date();

    const shiftInvs = invoices.filter((i) => i.shiftId === shift.id);
    const firstInvDate = shiftInvs[0]?.date;

    // 1. Determine Start Date (تاريخ البداية)
    let startDateText = shift.startDate;
    if (!startDateText && shift.startTimestamp) {
      startDateText = new Date(shift.startTimestamp).toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    if (!startDateText && firstInvDate) {
      startDateText = firstInvDate;
    }
    if (!startDateText) {
      startDateText = now.toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    // 2. Day name & Day of Month (كام في اليوم واليوم إيه)
    const dayName = startDateText.includes("،")
      ? startDateText.split("،")[0]
      : now.toLocaleDateString("ar-EG", { weekday: "long" });

    const dayNumber = now.getDate();
    const dayOfMonthStr = `اليوم ${dayNumber} من الشهر`;

    // 3. Start & Close Time (ساعة البداية وساعة النهاية)
    const startTimeText = shift.startTime || shift.openTime || "09:00 ص";
    const closeTimeText = isLive ? "جارية الآن" : shift.closeTime || "—";
    const closeDateText = isLive ? "مستمرة حتى اللحظة" : shift.closeDate || startDateText;

    // 4. Duration & Hours Calculation (كام ساعة ودقيقة)
    let durationArabic = "";
    let durationFormatted = shift.durationText || "—";
    let hoursCount = 0;

    if (isLive && shift.startTimestamp) {
      const diffSecs = Math.max(0, Math.floor((Date.now() - shift.startTimestamp) / 1000));
      const h = Math.floor(diffSecs / 3600);
      const m = Math.floor((diffSecs % 3600) / 60);
      const s = diffSecs % 60;
      hoursCount = Number((diffSecs / 3600).toFixed(1));
      durationFormatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      const parts = [];
      if (h > 0) parts.push(h === 1 ? "ساعة واحدة" : h === 2 ? "ساعتان" : `${h} ساعات`);
      if (m > 0) parts.push(m === 1 ? "دقيقة واحدة" : m === 2 ? "دقيقتان" : `${m} دقائق`);
      parts.push(`${s} ثانية`);
      durationArabic = `${parts.join(" و ")} (جارية الآن)`;
    } else if (shift.durationText && shift.durationText.includes(":")) {
      const parts = shift.durationText.split(":").map((p) => parseInt(p.trim(), 10));
      if (parts.length === 3 && !parts.some(isNaN)) {
        const [h, m, s] = parts;
        const totalMins = h * 60 + m;
        hoursCount = Number((totalMins / 60).toFixed(1));
        const textParts = [];
        if (h > 0) textParts.push(h === 1 ? "ساعة واحدة" : h === 2 ? "ساعتان" : `${h} ساعات`);
        if (m > 0) textParts.push(m === 1 ? "دقيقة واحدة" : m === 2 ? "دقيقتان" : `${m} دقائق`);
        if (s > 0) textParts.push(s === 1 ? "ثانية واحدة" : `${s} ثانية`);
        durationArabic = textParts.length > 0 ? textParts.join(" و ") : "أقل من دقيقة";
      } else {
        durationArabic = shift.durationText;
      }
    } else {
      durationArabic = isLive ? "جارية الآن" : shift.durationText || "ساعات غير محددة";
    }

    return {
      startDateText,
      dayName,
      dayNumber,
      dayOfMonthStr,
      startTimeText,
      closeDateText,
      closeTimeText,
      durationFormatted,
      durationArabic,
      hoursCount,
      isLive,
      shiftInvoices: shiftInvs,
    };
  };

  // Thermal Slip Print Helper for Shift Report
  const handlePrintShiftReport = (shift: ShiftRecord) => {
    try {
      sfx.playThermalPrint();
    } catch {}

    const salon = getSalonSettings();
    const timing = getShiftTimingDetails(shift);
    const totalSales = (shift.cashSales || 0) + (shift.cardSales || 0) + (shift.instaPaySales || shift.instapaySales || 0);
    const expected = shift.expectedDrawerCash ?? shift.expectedCash ?? 0;
    const actual = shift.actualCash ?? expected;
    const diff = shift.difference ?? 0;

    const printWindow = window.open("", "_blank", "width=420,height=680");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>تقرير وردية #${shift.id}</title>
        <style>
          @page { margin: 4mm; size: 80mm auto; }
          body { font-family: 'Cairo', 'Segoe UI', sans-serif; font-size: 13px; margin: 0; padding: 12px; color: #000; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .bold { font-weight: 800; }
          .title { font-size: 16px; font-weight: 900; }
          .badge { display: inline-block; padding: 2px 6px; border: 1px solid #000; border-radius: 4px; font-size: 11px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
          th, td { border-bottom: 1px solid #ccc; padding: 4px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="center title">${salon.salonName}</div>
        <div class="center" style="font-size: 10.5px; color: #333; margin-top: 2px;">${salon.address} • هاتف: ${salon.phone}</div>
        <div class="center" style="font-size: 11px; margin-top: 3px; font-weight: 700;">سند تقرير وإغلاق الوردية وجرد الخزينة</div>
        <div class="divider"></div>
        <div class="row"><span class="bold">رقم الوردية:</span><span class="bold">#${shift.id}</span></div>
        <div class="row"><span class="bold">مسؤول الوردية:</span><span>${shift.cashierName}</span></div>
        <div class="row"><span class="bold">حالة الوردية:</span><span class="badge">${shift.status}</span></div>
        <div class="divider"></div>
        <div class="row"><span class="bold">تاريخ الوردية:</span><span>${timing.startDateText}</span></div>
        <div class="row"><span class="bold">ساعة البداية:</span><span>${timing.startTimeText}</span></div>
        <div class="row"><span class="bold">ساعة النهاية:</span><span>${timing.closeTimeText}</span></div>
        <div class="row"><span class="bold">مدة العمل:</span><span>${timing.durationArabic}</span></div>
        <div class="divider"></div>
        <div class="row"><span>الافتتاحية بالدرج:</span><span>${(shift.openingCash || shift.initialCash || 0).toLocaleString()} ج.م</span></div>
        <div class="row"><span>مبيعات كاش:</span><span>${(shift.cashSales || 0).toLocaleString()} ج.م</span></div>
        <div class="row"><span>مبيعات إلكتروني (إنستا/فيزا):</span><span>${((shift.cardSales || 0) + (shift.instaPaySales || shift.instapaySales || 0)).toLocaleString()} ج.م</span></div>
        <div class="row"><span>مصروفات من الدرج:</span><span>-${(shift.drawerExpenses || shift.cashExpenses || 0).toLocaleString()} ج.م</span></div>
        <div class="row bold"><span>إجمالي مبيعات الوردية:</span><span>${totalSales.toLocaleString()} ج.م</span></div>
        <div class="divider"></div>
        <div class="row"><span>المتوقع بالدرج:</span><span>${expected.toLocaleString()} ج.م</span></div>
        <div class="row"><span>المسلم فعلياً:</span><span>${actual.toLocaleString()} ج.م</span></div>
        <div class="row bold"><span>الفارق (عجز/فائض):</span><span>${diff === 0 ? "0 ج.م (مطابق تماماً)" : diff > 0 ? `+${diff} ج.م (فائض)` : `${diff} ج.م (عجز)`}</span></div>
        ${shift.handoverNotes ? `<div class="divider"></div><div><b>ملاحظات التسليم:</b> ${shift.handoverNotes}</div>` : ""}
        <div class="divider"></div>
        <div class="center" style="font-size: 11px; margin-top: 6px;">
          طُبع في: ${new Date().toLocaleDateString("ar-EG")} | ${new Date().toLocaleTimeString("ar-EG")}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            إدارة الورديات وجرد الخزينة (Cash Drawer)
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            متابعة المبيعات النقدية والإلكترونية وحساب العجز والفائض وساعات العمل عند تسليم الوردية
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setSelectedShift(activeShift)}
            style={{ height: 38, padding: "0 14px", fontSize: 13, gap: 6 }}
          >
            <Icon name="search" size={15} />
            <span>عرض تفاصيل وساعات الوردية الحالية</span>
          </button>
          {activeShift.status === "نشطة" && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setCloseModalOpen(true)}
              style={{ height: 38, padding: "0 16px", fontSize: 13 }}
            >
              <Icon name="check" size={16} />
              <span>إغلاق الوردية وجرد النقدية</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Spotlight Card */}
      <div
        style={{
          background: "var(--card)",
          border: "1.5px solid var(--gold)",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          cursor: "pointer",
        }}
        onClick={() => setSelectedShift(activeShift)}
        title="انقر لعرض التقرير الكامل والتاريخ وعدد الساعات لهذه الوردية"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(63, 185, 80, 0.15)",
                color: "var(--success-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              #{activeShift.id}
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>
                الوردية الحالية #{activeShift.id} (نشطة الآن)
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                الكاشير المناوب: <strong style={{ color: "var(--text)" }}>{activeShift.cashierName}</strong> • بدء الوردية: {activeShift.startTime || activeShift.openTime}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="status-pill active">نشطة وجارية</span>
            <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="info" size={13} />
              <span>انقر لعرض التفاصيل الكاملة</span>
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>الافتتاحية:</span>
            <strong style={{ fontSize: 16, color: "var(--text)", fontFamily: "Inter" }}>{activeShift.initialCash || activeShift.openingCash} ج.م</strong>
          </div>
          <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>مبيعات نقدية (كاش):</span>
            <strong style={{ fontSize: 16, color: "var(--light-gold)", fontFamily: "Inter" }}>{activeShift.cashSales} ج.م</strong>
          </div>
          <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>إنستاباي وبطاقات:</span>
            <strong style={{ fontSize: 16, color: "var(--success-text)", fontFamily: "Inter" }}>{(activeShift.cardSales || 0) + (activeShift.instapaySales || activeShift.instaPaySales || 0)} ج.م</strong>
          </div>
          <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>مصروفات من الدرج:</span>
            <strong style={{ fontSize: 16, color: "var(--danger-text)", fontFamily: "Inter" }}>-{activeShift.cashExpenses || activeShift.drawerExpenses || 0} ج.م</strong>
          </div>
          <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 8, border: "1px dashed var(--gold)" }}>
            <span style={{ fontSize: 11, color: "var(--light-gold)", display: "block" }}>المتوقع بالدرج:</span>
            <strong style={{ fontSize: 18, color: "var(--light-gold)", fontFamily: "Inter" }}>{activeShift.expectedDrawerCash ?? activeShift.expectedCash} ج.م</strong>
          </div>
        </div>
      </div>

      {/* Shifts History Table with Click-to-View Interaction */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text)" }}>
            سجل الورديات السابقة وجرد الخزائن
          </div>
          <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="info" size={14} />
            <span>اضغط على أي وردية في الجدول لمعرفة تاريخها، ساعة البداية والنهاية، وعدد الساعات والمبيعات</span>
          </div>
        </div>

        <div style={{ width: "100%", overflowX: "hidden" }}>
          <table className="data-table" style={{ width: "100%", tableLayout: "auto" }}>
            <thead>
              <tr>
                <th style={{ width: "80px" }}>رقم الوردية</th>
                <th style={{ width: "140px" }}>مسؤول الوردية</th>
                <th>تاريخ وبدء الوردية</th>
                <th style={{ width: "110px" }}>مدة الوردية</th>
                <th style={{ width: "120px" }}>إجمالي المبيعات</th>
                <th style={{ width: "120px" }}>النقدية المتوقعة</th>
                <th style={{ width: "140px" }}>الفارق (عجز / فائض)</th>
                <th style={{ width: "90px" }}>الحالة</th>
                <th style={{ width: "80px", textAlign: "center" }}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const totalSales = (s.cashSales || 0) + (s.cardSales || 0) + (s.instaPaySales || s.instapaySales || 0);
                const expected = s.expectedDrawerCash ?? s.expectedCash ?? 0;
                const diff = s.difference ?? 0;
                const timing = getShiftTimingDetails(s);

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedShift(s)}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      background: selectedShift?.id === s.id ? "var(--gold-soft)" : undefined,
                    }}
                    title="انقر لعرض التاريخ وساعة البداية والنهاية وعدد الساعات وتفاصيل الوردية"
                  >
                    <td style={{ fontFamily: "Inter", fontWeight: 700, color: s.status === "نشطة" ? "var(--light-gold)" : "var(--text)" }}>
                      #{s.id}
                    </td>
                    <td style={{ fontWeight: 700 }}>{s.cashierName}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>
                        {timing.dayName} {timing.startDateText.replace(timing.dayName + "، ", "")}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "Inter, Cairo" }}>
                        بدء: {timing.startTimeText} {s.status === "نشطة" ? "" : `• إغلاق: ${timing.closeTimeText}`}
                      </div>
                    </td>
                    <td style={{ fontFamily: "Inter, Cairo", color: s.status === "نشطة" ? "var(--light-gold)" : "var(--text-secondary)" }}>
                      {s.status === "نشطة" ? "جارية حالياً" : (s.durationText || "—")}
                    </td>
                    <td style={{ fontFamily: "Inter", fontWeight: 700 }}>{totalSales.toLocaleString()} ج.م</td>
                    <td style={{ fontFamily: "Inter" }}>{expected.toLocaleString()} ج.م</td>
                    <td
                      style={{
                        fontFamily: "Inter",
                        fontWeight: 700,
                        color:
                          s.status === "نشطة"
                            ? "var(--muted)"
                            : diff === 0
                            ? "var(--success-text)"
                            : diff > 0
                            ? "var(--light-gold)"
                            : "var(--danger-text)",
                      }}
                    >
                      {s.status === "نشطة"
                        ? "جارية..."
                        : diff === 0
                        ? "0 ج.م (مطابق)"
                        : diff > 0
                        ? `+${diff} ج.م (فائض)`
                        : `${diff} ج.م (عجز)`}
                    </td>
                    <td>
                      <span className={`status-pill ${s.status === "نشطة" ? "active" : "inactive"}`}>{s.status}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShift(s);
                        }}
                        style={{ height: 26, padding: "0 8px", fontSize: 11, gap: 4 }}
                        title="عرض كامل التفاصيل والساعات"
                      >
                        <Icon name="search" size={12} />
                        <span>عرض</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SHIFT DETAILS MODAL (ما طلبه المستخدم: التاريخ، وقت البدء، وقت النهاية، كام ساعة، كام في اليوم، والمبيعات والدرج) */}
      {selectedShift && (() => {
        const timing = getShiftTimingDetails(selectedShift);
        const totalSales = (selectedShift.cashSales || 0) + (selectedShift.cardSales || 0) + (selectedShift.instaPaySales || selectedShift.instapaySales || 0);
        const expected = selectedShift.expectedDrawerCash ?? selectedShift.expectedCash ?? 0;
        const actual = selectedShift.actualCash ?? expected;
        const diff = selectedShift.difference ?? 0;

        return (
          <div className="modal-overlay" onClick={() => setSelectedShift(null)}>
            <div
              className="modal-box"
              style={{ maxWidth: 760, maxHeight: "90vh", overflowY: "auto", borderRadius: 16 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Head */}
              <div className="modal-head" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: selectedShift.status === "نشطة" ? "rgba(46, 204, 113, 0.15)" : "var(--gold-soft)",
                      color: selectedShift.status === "نشطة" ? "var(--success-text)" : "var(--gold)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: 18,
                    }}
                  >
                    #{selectedShift.id}
                  </span>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 900, color: "var(--text)" }}>
                      تقرير وبيانات الوردية #{selectedShift.id}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      الكاشير المناوب: <b>{selectedShift.cashierName}</b> • الحالة:{" "}
                      <span
                        style={{
                          color: selectedShift.status === "نشطة" ? "var(--success-text)" : "var(--text-secondary)",
                          fontWeight: 700,
                        }}
                      >
                        {selectedShift.status === "نشطة" ? "نشطة وجارية الآن" : "مغلقة ومستلمة"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => handlePrintShiftReport(selectedShift)}
                    style={{ height: 34, padding: "0 12px", fontSize: 12, gap: 6 }}
                    title="طباعة إيصال تقرير الوردية"
                  >
                    <Icon name="printer" size={14} />
                    <span>طباعة تقرير</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShift(null)}
                    style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 4 }}
                  >
                    <Icon name="x" size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 14 }}>
                {/* 1. Main Highlights Grid (ما طلبه المستخدم بدقة) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                  {/* Card 1: التاريخ واليوم في الشهر */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 100%)",
                      border: "1.5px solid var(--border-gold)",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--light-gold)", fontWeight: 700 }}>
                      <Icon name="calendar" size={14} />
                      <span>تاريخ الوردية (اليوم):</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginTop: 2 }}>
                      {timing.dayName}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                      {timing.startDateText.replace(timing.dayName + "، ", "")}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10.5,
                        background: "var(--gold-soft)",
                        color: "var(--light-gold)",
                        padding: "2px 6px",
                        borderRadius: 6,
                        display: "inline-block",
                        width: "fit-content",
                        fontWeight: 700,
                      }}
                    >
                      {timing.dayOfMonthStr}
                    </div>
                  </div>

                  {/* Card 2: ساعة ووقت البداية */}
                  <div
                    style={{
                      background: "rgba(46, 204, 113, 0.08)",
                      border: "1.5px solid rgba(46, 204, 113, 0.3)",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--success-text)", fontWeight: 700 }}>
                      <Icon name="clock" size={14} />
                      <span>ساعة البداية (وقت الفتح):</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", fontFamily: "Inter, Cairo", marginTop: 2 }}>
                      {timing.startTimeText}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      استلام الدرج وبدء العمل
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10.5,
                        background: "rgba(46, 204, 113, 0.15)",
                        color: "var(--success-text)",
                        padding: "2px 6px",
                        borderRadius: 6,
                        display: "inline-block",
                        width: "fit-content",
                        fontWeight: 700,
                      }}
                    >
                      بدء جلسة الكاشير
                    </div>
                  </div>

                  {/* Card 3: ساعة ووقت النهاية */}
                  <div
                    style={{
                      background: selectedShift.status === "نشطة" ? "rgba(243, 156, 18, 0.08)" : "var(--surface-soft)",
                      border: `1.5px solid ${selectedShift.status === "نشطة" ? "rgba(243, 156, 18, 0.4)" : "var(--border)"}`,
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: selectedShift.status === "نشطة" ? "#f39c12" : "var(--muted)", fontWeight: 700 }}>
                      <Icon name="checkCircle" size={14} />
                      <span>ساعة النهاية (الإغلاق):</span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", fontFamily: "Inter, Cairo", marginTop: 2 }}>
                      {timing.closeTimeText}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {selectedShift.status === "نشطة" ? "الوردية مستمرة حتى الآن" : `تاريخ القفل: ${timing.closeDateText}`}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10.5,
                        background: selectedShift.status === "نشطة" ? "rgba(243, 156, 18, 0.15)" : "var(--surface)",
                        color: selectedShift.status === "نشطة" ? "#f39c12" : "var(--muted)",
                        padding: "2px 6px",
                        borderRadius: 6,
                        display: "inline-block",
                        width: "fit-content",
                        fontWeight: 700,
                      }}
                    >
                      {selectedShift.status === "نشطة" ? "مفتوحة حتى الآن" : "تم تسليم الدرج"}
                    </div>
                  </div>

                  {/* Card 4: كم ساعة ودقيقة (المدة) */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(0, 136, 204, 0.1) 0%, rgba(0, 136, 204, 0.04) 100%)",
                      border: "1.5px solid rgba(0, 136, 204, 0.35)",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#0088cc", fontWeight: 700 }}>
                      <Icon name="clock" size={14} />
                      <span>كم ساعة استمرت الوردية؟:</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", marginTop: 2 }}>
                      {timing.durationArabic}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "Inter" }}>
                      الدقة بالثواني: {timing.durationFormatted}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 10.5,
                        background: "rgba(0, 136, 204, 0.12)",
                        color: "#0088cc",
                        padding: "2px 6px",
                        borderRadius: 6,
                        display: "inline-block",
                        width: "fit-content",
                        fontWeight: 700,
                      }}
                    >
                      {timing.hoursCount > 0 ? `تعادل ${timing.hoursCount} ساعة عمل` : "مدة العمل المحسوبة"}
                    </div>
                  </div>
                </div>

                {/* 2. Financial Ledger & Cash Breakdown */}
                <div
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="dollarSign" size={16} />
                    <span>الحركة المالية وجرد الخزينة للوردية #{selectedShift.id}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                    <div style={{ background: "var(--card)", padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>العهدة الافتتاحية:</span>
                      <strong style={{ fontSize: 15, color: "var(--text)", fontFamily: "Inter" }}>
                        {(selectedShift.openingCash || selectedShift.initialCash || 0).toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div style={{ background: "var(--card)", padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>مبيعات نقدية (كاش):</span>
                      <strong style={{ fontSize: 15, color: "var(--light-gold)", fontFamily: "Inter" }}>
                        {(selectedShift.cashSales || 0).toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div style={{ background: "var(--card)", padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>إنستاباي وبطاقات:</span>
                      <strong style={{ fontSize: 15, color: "var(--success-text)", fontFamily: "Inter" }}>
                        {((selectedShift.cardSales || 0) + (selectedShift.instaPaySales || selectedShift.instapaySales || 0)).toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div style={{ background: "var(--card)", padding: 10, borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>مصروفات وسلف من الدرج:</span>
                      <strong style={{ fontSize: 15, color: "var(--danger-text)", fontFamily: "Inter" }}>
                        -{(selectedShift.drawerExpenses || selectedShift.cashExpenses || 0).toLocaleString()} ج.م
                      </strong>
                    </div>
                  </div>

                  {/* Summary Totals & Difference */}
                  <div
                    style={{
                      background: "var(--card)",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1.5px solid var(--border-gold)",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                      marginTop: 4,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--muted)", display: "block" }}>إجمالي مبيعات الوردية:</span>
                      <strong style={{ fontSize: 18, color: "var(--light-gold)", fontFamily: "Inter" }}>
                        {totalSales.toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--muted)", display: "block" }}>النقدية المتوقعة بالدرج:</span>
                      <strong style={{ fontSize: 18, color: "var(--text)", fontFamily: "Inter" }}>
                        {expected.toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--muted)", display: "block" }}>النقدية المسلمة فعلياً:</span>
                      <strong style={{ fontSize: 18, color: "var(--text)", fontFamily: "Inter" }}>
                        {actual.toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: 11.5, color: "var(--muted)", display: "block" }}>الفارق النهائي (عجز/فائض):</span>
                      <strong
                        style={{
                          fontSize: 18,
                          fontFamily: "Inter",
                          color:
                            selectedShift.status === "نشطة"
                              ? "var(--muted)"
                              : diff === 0
                              ? "var(--success-text)"
                              : diff > 0
                              ? "var(--light-gold)"
                              : "var(--danger-text)",
                        }}
                      >
                        {selectedShift.status === "نشطة"
                          ? "جارية..."
                          : diff === 0
                          ? "0 ج.م (مطابق تماماً)"
                          : diff > 0
                          ? `+${diff} ج.م (فائض بالدرج)`
                          : `${diff} ج.م (عجز بالدرج)`}
                      </strong>
                    </div>
                  </div>

                  {selectedShift.handoverNotes && (
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, background: "var(--card)", padding: "8px 12px", borderRadius: 8 }}>
                      <b>ملاحظات التسليم:</b> {selectedShift.handoverNotes}
                    </div>
                  )}
                </div>

                {/* 3. Invoices Issued during this Shift */}
                <div
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="fileText" size={16} />
                      <span>فواتير المبيعات الصادرة في هذه الوردية ({timing.shiftInvoices.length} فاتورة)</span>
                    </div>
                    {timing.shiftInvoices.length > 0 && (
                      <span style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700 }}>
                        إجمالي الفواتير: {timing.shiftInvoices.reduce((sum, i) => sum + (i.total || 0), 0).toLocaleString()} ج.م
                      </span>
                    )}
                  </div>

                  {timing.shiftInvoices.length === 0 ? (
                    <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 12.5, background: "var(--card)", borderRadius: 8 }}>
                      لا توجد فواتير مبيعات مسجلة في هذه الوردية حتى الآن.
                    </div>
                  ) : (
                    <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <table className="data-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>رقم الفاتورة</th>
                            <th>الوقت</th>
                            <th>العميل</th>
                            <th>طريقة الدفع</th>
                            <th>المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timing.shiftInvoices.map((inv) => (
                            <tr key={inv.id}>
                              <td style={{ fontFamily: "Inter", fontWeight: 700 }}>#{inv.id}</td>
                              <td>{inv.time}</td>
                              <td>{inv.customerName || "عميل بدون تسجيل"}</td>
                              <td>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: inv.paymentMethod === "نقداً" ? "var(--gold-soft)" : "rgba(46, 204, 113, 0.12)",
                                    color: inv.paymentMethod === "نقداً" ? "var(--light-gold)" : "var(--success-text)",
                                    fontWeight: 700,
                                  }}
                                >
                                  {inv.paymentMethod}
                                </span>
                              </td>
                              <td style={{ fontFamily: "Inter", fontWeight: 700, color: "var(--text)" }}>
                                {inv.total.toLocaleString()} ج.م
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Foot */}
              <div className="modal-foot" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handlePrintShiftReport(selectedShift)}
                  style={{ flex: 1, height: 42, fontSize: 13, gap: 6 }}
                >
                  <Icon name="printer" size={16} />
                  <span>طباعة إيصال تقرير الوردية كبون حراري</span>
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSelectedShift(null)}
                  style={{ height: 42, padding: "0 20px" }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Close Shift Modal */}
      {closeModalOpen && (
        <div className="modal-overlay" onClick={() => setCloseModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--gold-soft)",
                    color: "var(--light-gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="lock" size={18} />
                </span>
                <div>
                  <h2 style={{ fontSize: 17, margin: 0 }}>إغلاق الوردية وجرد فئات النقدية بالدرج</h2>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
                    تسليم العهدة النقدية وحساب الفارق والتسوية تلقائياً
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCloseModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 4 }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ gap: 14 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                أدخل عدد ورقات كل فئة نقدية بالجنيه المصري لجرد الخزينة وحساب الفارق تلقائياً:
              </div>

              {/* Denomination Counter */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[200, 100, 50, 20, 10, 5].map((denom) => (
                  <div
                    key={denom}
                    style={{
                      background: "var(--surface-soft)",
                      border: "1px solid var(--border)",
                      padding: 10,
                      borderRadius: 10,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--light-gold)", marginBottom: 4 }}>
                      فئة {denom} ج.م
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      value={denomCounts[denom] || 0}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setDenomCounts((prev) => ({ ...prev, [denom]: val }));
                      }}
                      style={{ textAlign: "center", fontSize: 15, fontFamily: "Inter", fontWeight: 700 }}
                    />
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, fontFamily: "Inter" }}>
                      = {(denom * (denomCounts[denom] || 0)).toLocaleString()} ج.م
                    </div>
                  </div>
                ))}
              </div>

              {/* Variance Box */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  padding: 14,
                  borderRadius: 12,
                  border: "1.5px solid var(--border-gold)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>إجمالي النقدية المحسوبة فعلياً:</span>
                  <strong style={{ color: "var(--text)", fontFamily: "Inter", fontSize: 16 }}>
                    {actualCashCalculated.toLocaleString()} ج.م
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>النقدية المتوقعة بالدرج:</span>
                  <strong style={{ color: "var(--text-secondary)", fontFamily: "Inter" }}>
                    {(activeShift.expectedDrawerCash ?? activeShift.expectedCash).toLocaleString()} ج.م
                  </strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px dashed var(--border-strong)",
                    paddingTop: 8,
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  <span>الفارق النهائي:</span>
                  <span
                    style={{
                      color: variance === 0 ? "var(--success-text)" : variance > 0 ? "var(--light-gold)" : "var(--danger-text)",
                      fontFamily: "Inter",
                    }}
                  >
                    {variance === 0 ? "متطابق تماماً (0 ج.م)" : variance > 0 ? `+${variance} ج.م (فائض)` : `${variance} ج.م (عجز)`}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ملاحظات تسليم الوردية (اختياري):</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="أية ملاحظات خاصة بعهدة الكاشير..."
                />
              </div>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCloseModalOpen(false)}
                style={{ height: 42, padding: "0 20px" }}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ height: 42, padding: "0 24px", gap: 6 }}
                onClick={handleConfirmClose}
              >
                <span>تأكيد إغلاق الوردية</span>
                <Icon name="check" size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
