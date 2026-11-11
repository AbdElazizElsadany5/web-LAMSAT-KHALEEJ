import { useState } from "react";
import { Coupon } from "../../types";
import { Icon } from "../Icons";

export function AdminCoupons({
  coupons,
  onSaveCoupon,
  onShowToast,
}: {
  coupons: Coupon[];
  onSaveCoupon: (coupon: Coupon) => void;
  onShowToast: (msg: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrder, setMinOrder] = useState<number>(150);
  const [usageLimit, setUsageLimit] = useState<number>(100);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      alert("يرجى إدخال كود الكوبون");
      return;
    }
    const newCoupon: Coupon = {
      id: `cp-${Date.now()}`,
      code: code.trim().toUpperCase(),
      discountType,
      discountValue,
      minOrderValue: minOrder,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "2026-12-31",
      usageLimit,
      usageCount: 0,
      status: "نشط",
    };
    onSaveCoupon(newCoupon);
    setModalOpen(false);
    setCode("");
    onShowToast(`تم إنشاء الكوبون «${newCoupon.code}» بنجاح`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            إدارة كوبونات وعروض الخصم
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            إنشاء وتتبع كوبونات الحملات التسويقية ونسب استخدامها بالصالون
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setModalOpen(true)}
          style={{ height: 38, padding: "0 16px", fontSize: 13 }}
        >
          <Icon name="plus" size={16} />
          <span>إنشاء كوبون جديد</span>
        </button>
      </div>

      {/* Coupons Table */}
      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>كود الكوبون</th>
              <th>نوع الخصم</th>
              <th>قيمة الخصم</th>
              <th>الحد الأدنى للطلب</th>
              <th>الاستخدام / الحد الأقصى</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const usagePct = Math.round((c.usageCount / c.usageLimit) * 100);
              return (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontFamily: "Inter", fontWeight: 800, color: "#F5C242", background: "#1C180E", padding: "4px 8px", borderRadius: 6, border: "1px solid #5E4E25" }}>
                      {c.code}
                    </span>
                  </td>
                  <td>{c.discountType === "percentage" ? "نسبة مئوية (%)" : "مبلغ ثابت (ج.م)"}</td>
                  <td style={{ fontFamily: "Inter", fontWeight: 700 }}>
                    {c.discountType === "percentage" ? `${c.discountValue}%` : `${c.discountValue} ج.م`}
                  </td>
                  <td style={{ fontFamily: "Inter" }}>{c.minOrderValue} ج.م</td>
                  <td style={{ width: 180 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                      <span style={{ fontFamily: "Inter" }}>{c.usageCount} / {c.usageLimit}</span>
                      <span style={{ color: "#888" }}>{usagePct}%</span>
                    </div>
                    <div style={{ width: "100%", height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, usagePct)}%`, height: "100%", background: usagePct >= 100 ? "#E5484D" : "#D4AF37" }} />
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${c.status === "نشط" ? "active" : "inactive"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ height: 30, padding: "0 10px", fontSize: 11 }}
                      onClick={() => {
                        setSelectedCoupon(c);
                        setHistoryModalOpen(true);
                      }}
                    >
                      سجل الاستخدام
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Coupon Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-head">
              <h2>إنشاء كوبون خصم جديد</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCoupon}>
              <div className="form-group">
                <label className="form-label">كود الكوبون:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: SUMMER2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">نوع الخصم:</label>
                  <select
                    className="form-input"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                  >
                    <option value="percentage">نسبة مئوية (%)</option>
                    <option value="fixed">مبلغ ثابت (ج.م)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">قيمة الخصم:</label>
                  <input
                    type="number"
                    className="form-input"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">الحد الأدنى للطلب (ج.م):</label>
                  <input
                    type="number"
                    className="form-input"
                    value={minOrder}
                    onChange={(e) => setMinOrder(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">أقصى عدد استخدامات:</label>
                  <input
                    type="number"
                    className="form-input"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, height: 42 }}>
                  <span>حفظ وتفعيل الكوبون</span>
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

      {/* Usage History Modal */}
      {historyModalOpen && selectedCoupon && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-head">
              <h2>سجل استخدام الكوبون: {selectedCoupon.code}</h2>
              <button type="button" onClick={() => setHistoryModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div style={{ fontSize: 13, color: "#AAA", marginBottom: 14 }}>
              إجمالي الاستخدام: <strong style={{ color: "#F5C242" }}>{selectedCoupon.usageCount}</strong> من أصل {selectedCoupon.usageLimit} مرة
            </div>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>قيمة الخصم</th>
                  <th>التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontFamily: "Inter" }}>INV-2026-1080</td>
                  <td>هيثم سمير</td>
                  <td style={{ color: "#56D364", fontFamily: "Inter" }}>-36 ج.م</td>
                  <td>11 فبراير 2026 - 18:15</td>
                </tr>
                <tr>
                  <td style={{ fontFamily: "Inter" }}>INV-2026-1055</td>
                  <td>طارق ممدوح</td>
                  <td style={{ color: "#56D364", fontFamily: "Inter" }}>-50 ج.م</td>
                  <td>10 فبراير 2026 - 20:30</td>
                </tr>
                <tr>
                  <td style={{ fontFamily: "Inter" }}>INV-2026-1042</td>
                  <td>كريم عادل</td>
                  <td style={{ color: "#56D364", fontFamily: "Inter" }}>-25 ج.م</td>
                  <td>09 فبراير 2026 - 16:45</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

