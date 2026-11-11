import { useState } from "react";
import { Barber } from "../../types";
import { Icon } from "../Icons";

export function AdminPayroll({
  barbers,
  onShowToast,
}: {
  barbers: Barber[];
  onShowToast: (msg: string) => void;
}) {
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedBarberForVoucher, setSelectedBarberForVoucher] = useState<Barber | null>(null);

  // Example payroll records
  const payrollData = barbers.map((b) => {
    const basic = b.basicSalary;
    const commission = b.commissionEarned > 0 ? b.commissionEarned * 18 : 3400; // estimated monthly
    const tips = 450;
    const bonus = b.rating >= 4.9 ? 500 : 0;
    const advance = 1000;
    const deduction = 0;
    const net = basic + commission + tips + bonus - advance - deduction;

    return {
      barber: b,
      basic,
      commission,
      tips,
      bonus,
      advance,
      deduction,
      net,
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            الرواتب والعمولات الشهرية
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            معادلة الصافي: الأساسي + العمولات + الإكراميات + المكافآت - السلف والخصومات
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
              <th>الأساسي</th>
              <th>العمولات المكتسبة</th>
              <th>الإكراميات</th>
              <th>المكافآت</th>
              <th>السلف والخصومات</th>
              <th>صافي المستحق</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.map((row) => (
              <tr key={row.barber.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={row.barber.avatar} alt={row.barber.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover" }} />
                    <div>
                      <div style={{ fontWeight: 700, color: "#FFF" }}>{row.barber.name}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{row.barber.title}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: "Inter" }}>{row.basic > 0 ? `${row.basic} ج.م` : "—"}</td>
                <td style={{ fontFamily: "Inter", color: "#F5C242", fontWeight: 700 }}>{row.commission.toLocaleString()} ج.م</td>
                <td style={{ fontFamily: "Inter" }}>+{row.tips} ج.م</td>
                <td style={{ fontFamily: "Inter", color: "#56D364" }}>{row.bonus > 0 ? `+${row.bonus} ج.م` : "—"}</td>
                <td style={{ fontFamily: "Inter", color: "#E5484D" }}>{row.advance > 0 ? `-${row.advance} ج.م` : "—"}</td>
                <td style={{ fontFamily: "Inter", fontWeight: 900, color: "#56D364", fontSize: 15 }}>
                  {row.net.toLocaleString()} ج.م
                </td>
                <td>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ height: 30, padding: "0 10px", fontSize: 11 }}
                    onClick={() => {
                      setSelectedBarberForVoucher(row.barber);
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
              <h2>سند صرف معتمد (راتب وعمولات)</h2>
              <button type="button" onClick={() => setVoucherModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div style={{ background: "#FFFFFF", color: "#111", padding: 24, borderRadius: 12, margin: "10px 0" }}>
              <div style={{ textAlign: "center", borderBottom: "2px solid #333", paddingBottom: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>صالون لمسة الفاخر — القاهرة</div>
                <div style={{ fontSize: 12, color: "#666" }}>سند صرف رواتب وعمولات شهرية معتمد</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
                <div>اسم الموظف: <strong>{selectedBarberForVoucher.name}</strong></div>
                <div>الوظيفة: <strong>{selectedBarberForVoucher.title}</strong></div>
                <div>تاريخ الصرف: <strong>11 فبراير 2026</strong></div>
                <div>رقم السند: <strong>#VCH-2026-904</strong></div>
              </div>
              <div style={{ background: "#F5F5F5", padding: 12, borderRadius: 8, fontSize: 14, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                <span>صافي المبلغ المستلم نقداً:</span>
                <span style={{ fontSize: 18, color: "#B8860B" }}>8,950 ج.م</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, paddingTop: 10, borderTop: "1px dashed #CCC", fontSize: 12 }}>
                <div>توقيع المستلم (الحلاق): _______________</div>
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
              <button type="button" className="secondary-btn" onClick={() => setVoucherModalOpen(false)} style={{ height: 40 }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

