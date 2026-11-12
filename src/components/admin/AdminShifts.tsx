import { useState } from "react";
import { ShiftRecord } from "../../types";
import { Icon } from "../Icons";

export function AdminShifts({
  shifts,
  onCloseShift,
  onShowToast,
}: {
  shifts: ShiftRecord[];
  onCloseShift: (shiftId: number, actualCash: number, notes: string) => void;
  onShowToast: (msg: string) => void;
}) {
  const activeShift = shifts.find((s) => s.status === "نشطة") || shifts[0];
  const [closeModalOpen, setCloseModalOpen] = useState(false);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            إدارة الورديات وجرد الخزينة (Cash Drawer)
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            متابعة المبيعات النقدية والإلكترونية وحساب العجز والفائض عند تسليم الوردية
          </p>
        </div>
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

      {/* Active Shift Spotlight Card */}
      <div
        style={{
          background: "#141414",
          border: "1.5px solid #D4AF37",
          borderRadius: 12,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(63, 185, 80, 0.15)",
                color: "#3FB950",
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
              <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF" }}>
                الوردية الحالية #{activeShift.id} (نشطة الآن)
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>
                الكاشير المناوب: <strong style={{ color: "#DDD" }}>{activeShift.cashierName}</strong> • بدء الوردية: {activeShift.startTime}
              </div>
            </div>
          </div>
          <span className="status-pill active">نشطة وجارية</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div style={{ background: "#181818", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "#888", display: "block" }}>الافتتاحية:</span>
            <strong style={{ fontSize: 16, color: "#DDD", fontFamily: "Inter" }}>{activeShift.initialCash} ج.م</strong>
          </div>
          <div style={{ background: "#181818", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "#888", display: "block" }}>مبيعات نقدية (كاش):</span>
            <strong style={{ fontSize: 16, color: "#F5C242", fontFamily: "Inter" }}>{activeShift.cashSales} ج.م</strong>
          </div>
          <div style={{ background: "#181818", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "#888", display: "block" }}>إنستاباي وبطاقات:</span>
            <strong style={{ fontSize: 16, color: "#56D364", fontFamily: "Inter" }}>{(activeShift.cardSales || 0) + (activeShift.instapaySales || 0)} ج.م</strong>
          </div>
          <div style={{ background: "#181818", padding: 12, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: "#888", display: "block" }}>مصروفات من الدرج:</span>
            <strong style={{ fontSize: 16, color: "#E5484D", fontFamily: "Inter" }}>-{activeShift.cashExpenses} ج.م</strong>
          </div>
          <div style={{ background: "#181818", padding: 12, borderRadius: 8, border: "1px dashed #D4AF37" }}>
            <span style={{ fontSize: 11, color: "#F5C242", display: "block" }}>المتوقع بالدرج:</span>
            <strong style={{ fontSize: 18, color: "#F5C242", fontFamily: "Inter" }}>{activeShift.expectedDrawerCash} ج.م</strong>
          </div>
        </div>
      </div>

      {/* Shifts History Table */}
      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الوردية</th>
              <th>الكاشير</th>
              <th>وقت البدء</th>
              <th>إجمالي المبيعات</th>
              <th>النقدية المتوقعة</th>
              <th>الفارق (عجز / فائض)</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: "Inter", fontWeight: 700, color: "#F5C242" }}>#104</td>
              <td>حسام حسن</td>
              <td>اليوم 09:00 ص</td>
              <td style={{ fontFamily: "Inter", fontWeight: 700 }}>4,850 ج.م</td>
              <td style={{ fontFamily: "Inter" }}>3,820 ج.م</td>
              <td style={{ color: "#888" }}>جارية...</td>
              <td><span className="status-pill active">نشطة</span></td>
            </tr>
            <tr>
              <td style={{ fontFamily: "Inter", fontWeight: 700 }}>#103</td>
              <td>أحمد كمال</td>
              <td>أمس 15:00 م</td>
              <td style={{ fontFamily: "Inter" }}>6,240 ج.م</td>
              <td style={{ fontFamily: "Inter" }}>4,150 ج.م</td>
              <td style={{ color: "#56D364", fontFamily: "Inter", fontWeight: 700 }}>+0 ج.م (مطابق تماماً)</td>
              <td><span className="status-pill inactive">مغلقة</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Close Shift Modal */}
      {closeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-head">
              <h2>إغلاق الوردية وجرد فئات النقدية بالدرج</h2>
              <button type="button" onClick={() => setCloseModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>

            <div style={{ fontSize: 13, color: "#AAA", marginBottom: 14 }}>
              أدخل عدد ورقات كل فئة نقدية بالجنيه المصري لجرد الخزينة وحساب الفارق تلقائياً:
            </div>

            {/* Denomination Counter */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
              {[200, 100, 50, 20, 10, 5].map((denom) => (
                <div key={denom} style={{ background: "#181818", padding: 10, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#F5C242", marginBottom: 4 }}>فئة {denom} ج.م</div>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    value={denomCounts[denom] || 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setDenomCounts((prev) => ({ ...prev, [denom]: val }));
                    }}
                    style={{ textAlign: "center", fontSize: 14, fontFamily: "Inter" }}
                  />
                  <div style={{ fontSize: 11, color: "#777", marginTop: 4, fontFamily: "Inter" }}>
                    = {(denom * (denomCounts[denom] || 0)).toLocaleString()} ج.م
                  </div>
                </div>
              ))}
            </div>

            {/* Variance Box */}
            <div style={{ background: "#181818", padding: 14, borderRadius: 10, marginBottom: 16, border: "1px solid #2B2519" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#AAA" }}>إجمالي النقدية المحسوبة فعلياً:</span>
                <strong style={{ color: "#FFF", fontFamily: "Inter", fontSize: 16 }}>{actualCashCalculated.toLocaleString()} ج.م</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: "#AAA" }}>النقدية المتوقعة بالدرج:</span>
                <strong style={{ color: "#BBB", fontFamily: "Inter" }}>{(activeShift.expectedDrawerCash ?? activeShift.expectedCash).toLocaleString()} ج.م</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #333", paddingTop: 8, fontSize: 14, fontWeight: 800 }}>
                <span>الفارق النهائي:</span>
                <span style={{ color: variance === 0 ? "#56D364" : variance > 0 ? "#F5C242" : "#E5484D", fontFamily: "Inter" }}>
                  {variance === 0 ? "متطابق تماماً (0 ج.م)" : variance > 0 ? `+${variance} ج.م (فائض)` : `${variance} ج.م (عجز)`}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ملاحظات تسليم الوردية (اختياري):</label>
              <textarea
                className="form-input"
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="أية ملاحظات خاصة بعهدة الكاشير..."
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button type="button" className="primary-btn" style={{ flex: 1, height: 42 }} onClick={handleConfirmClose}>
                <span>تأكيد إغلاق الوردية</span>
                <Icon name="check" size={16} />
              </button>
              <button type="button" className="secondary-btn" onClick={() => setCloseModalOpen(false)} style={{ height: 42 }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

