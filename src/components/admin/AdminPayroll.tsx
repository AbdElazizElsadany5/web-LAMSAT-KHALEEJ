import { useState } from "react";
import { Barber, AdvanceRecord } from "../../types";
import { Icon } from "../Icons";

export function AdminPayroll({
  barbers,
  advances = [],
  onShowToast,
}: {
  barbers: Barber[];
  advances?: AdvanceRecord[];
  onShowToast: (msg: string) => void;
}) {
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedBarberForVoucher, setSelectedBarberForVoucher] = useState<{
    barber: Barber;
    basic: number;
    tips: number;
    bonus: number;
    advance: number;
    net: number;
  } | null>(null);

  // Pure Fixed Salary Payroll (No Commissions)
  const payrollData = barbers.map((b) => {
    const basic = b.basicSalary || 6000;
    const tips = 450;
    const bonus = b.rating >= 4.9 ? 500 : 0;

    // Calculate actual active advances for this barber
    const barberAdvances = advances.filter((a) => a.barberId === b.id || a.barberName === b.name);
    const activeAdvanceTotal = barberAdvances.reduce(
      (sum, a) => sum + (a.amount - (a.paidAmount || 0)),
      0
    );
    const advanceDeduction = activeAdvanceTotal > 0 ? activeAdvanceTotal : 0;

    const net = Math.max(0, basic + tips + bonus - advanceDeduction);

    return {
      barber: b,
      basic,
      tips,
      bonus,
      advance: advanceDeduction,
      net,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            الرواتب والمستحقات الشهرية (نظام الراتب الثابت)
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            معادلة الصافي: الراتب الأساسي الثابت + الإكراميات والمكافآت - السلف والخصومات
          </p>
        </div>
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

      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>الموظف / الحلاق</th>
              <th>الراتب الأساسي الثابت</th>
              <th>الإكراميات</th>
              <th>المكافآت</th>
              <th>السلف والخصومات</th>
              <th>صافي المستحق للصرف</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.map((row) => (
              <tr key={row.barber.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={row.barber.avatar}
                      alt={row.barber.name}
                      style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", border: "1.5px solid #D4AF37" }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: "#FFF" }}>{row.barber.name}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{row.barber.title}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: "Inter", fontWeight: 700, color: "#FFF" }}>
                  {row.basic.toLocaleString("ar-EG")} ج.م
                </td>
                <td style={{ fontFamily: "Inter", color: "#AAA" }}>+{row.tips} ج.م</td>
                <td style={{ fontFamily: "Inter", color: row.bonus > 0 ? "#56D364" : "#666" }}>
                  {row.bonus > 0 ? `+${row.bonus} ج.م` : "—"}
                </td>
                <td style={{ fontFamily: "Inter", color: row.advance > 0 ? "#FF8E92" : "#666", fontWeight: row.advance > 0 ? 700 : 400 }}>
                  {row.advance > 0 ? `-${row.advance.toLocaleString("ar-EG")} ج.م` : "0 ج.م"}
                </td>
                <td style={{ fontFamily: "Inter", fontWeight: 900, color: "#F5C242", fontSize: 16 }}>
                  {row.net.toLocaleString("ar-EG")} ج.م
                </td>
                <td>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                    onClick={() => {
                      setSelectedBarberForVoucher(row);
                      setVoucherModalOpen(true);
                    }}
                  >
                    سند صرف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Voucher Modal */}
      {voucherModalOpen && selectedBarberForVoucher && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-head">
              <h2>سند صرف معتمد (راتب شهري)</h2>
              <button
                type="button"
                onClick={() => setVoucherModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <div style={{ background: "#FFFFFF", color: "#111", padding: 24, borderRadius: 12, margin: "10px 0" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #333", paddingBottom: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>صالون لمسة الفاخر — القاهرة</div>
                <div style={{ fontSize: 12, color: "#666" }}>سند صرف رواتب معتمد لشهر فبراير 2026</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
                <div>اسم الموظف: <strong>{selectedBarberForVoucher.barber.name}</strong></div>
                <div>الوظيفة: <strong>{selectedBarberForVoucher.barber.title}</strong></div>
                <div>تاريخ الصرف: <strong>11 فبراير 2026</strong></div>
                <div>رقم السند: <strong>#VCH-2026-904</strong></div>
                <div>الراتب الأساسي: <strong>{selectedBarberForVoucher.basic.toLocaleString("ar-EG")} ج.م</strong></div>
                <div>الخصومات والسلف: <strong style={{ color: "#D9534F" }}>-{selectedBarberForVoucher.advance.toLocaleString("ar-EG")} ج.م</strong></div>
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
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="primary-btn"
                style={{ flex: 1, height: 40 }}
                onClick={() => {
                  window.print();
                  onShowToast("تم إرسال سند الصرف إلى الطابعة");
                  setVoucherModalOpen(false);
                }}
              >
                <Icon name="printer" size={16} />
                <span>طباعة السند</span>
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
          </div>
        </div>
      )}
    </div>
  );
}
