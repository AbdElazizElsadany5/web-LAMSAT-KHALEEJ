import { useState } from "react";
import { ExpenseRecord } from "../../types";
import { Icon } from "../Icons";

export function AdminExpenses({
  expenses,
  onAddExpense,
  onShowToast,
}: {
  expenses: ExpenseRecord[];
  onAddExpense: (exp: ExpenseRecord) => void;
  onShowToast: (msg: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("مستلزمات تشغيل");
  const [amount, setAmount] = useState<number>(100);
  const [paymentSource, setPaymentSource] = useState<ExpenseRecord["paymentSource"]>("درج النقدية (الوردية)");
  const [deductDrawer, setDeductDrawer] = useState(true);

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    const newExp: ExpenseRecord = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      category,
      amount,
      paymentSource,
      date: new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      registeredBy: "كريم عادل",
      invoicePhotoAttached: false,
      deductedFromDrawer: paymentSource?.includes("درج") ? deductDrawer : false,
    };

    onAddExpense(newExp);
    setModalOpen(false);
    setTitle("");
    setAmount(100);
    onShowToast(`تم تسجيل المصروف بقيمة ${newExp.amount} ج.م بنجاح`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            إدارة المصروفات اليومية والنثريات
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            إجمالي المصروفات المسجلة: <strong style={{ color: "var(--danger-text)", fontFamily: "Inter" }}>{totalExpenses.toLocaleString()} ج.م</strong>
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setModalOpen(true)}
          style={{ height: 38, padding: "0 16px", fontSize: 13 }}
        >
          <Icon name="plus" size={16} />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>المصروف / البند</th>
              <th>التصنيف</th>
              <th>المبلغ</th>
              <th>مصدر الدفع</th>
              <th>التاريخ والوقت</th>
              <th>المسجل</th>
              <th>تأثير الدرج</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 700, color: "var(--text)" }}>{e.title}</td>
                <td>{e.category}</td>
                <td style={{ fontFamily: "Inter", fontWeight: 800, color: "var(--danger-text)" }}>
                  {e.amount.toLocaleString()} ج.م
                </td>
                <td>{e.paymentSource}</td>
                <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{e.date} - {e.time}</td>
                <td>{e.registeredBy}</td>
                <td>
                  <span className={`status-pill ${e.deductedFromDrawer ? "active" : "inactive"}`}>
                    {e.deductedFromDrawer ? "خصم من درج النقدية" : "دفع بنكي خارجي"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(229, 72, 77, 0.12)",
                    color: "var(--danger-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="dollarSign" size={18} />
                </span>
                <div>
                  <h2 style={{ fontSize: 17, margin: 0 }}>تسجيل مصروف جديد</h2>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
                    توثيق المصروفات التشغيلية والنثرية وخصمها من الخزينة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer", padding: 4 }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} style={{ display: "flex", flexDirection: "column", flex: 1, margin: 0 }}>
              <div className="modal-body" style={{ gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">بيان المصروف *:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: شراء مناديل وشامبو للغسيل"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">التصنيف:</label>
                    <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="مستلزمات تشغيل">مستلزمات تشغيل ونظافة</option>
                      <option value="ضيافة وبوفيه">ضيافة وبوفيه عملاء</option>
                      <option value="صيانة أجهزة">صيانة ماكينات وأجهزة</option>
                      <option value="فواتير وخدمات">فواتير كهرباء ومياه</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">المبلغ (ج.م) *:</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type="number"
                        className="form-input"
                        value={amount || ""}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        style={{ paddingLeft: 46, fontFamily: "Inter, Cairo", fontSize: 15, fontWeight: 700 }}
                        placeholder="0"
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
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">طريقة السداد ومصدر الخصم:</label>
                  <select className="form-input" value={paymentSource} onChange={(e) => setPaymentSource(e.target.value as any)}>
                    <option value="درج النقدية (الوردية)">درج النقدية (خصم مباشر من الكاشير)</option>
                    <option value="تحويل بنكي / إنستاباي">إنستاباي / تحويل بنكي</option>
                    <option value="الحساب البنكي الرئيسي">الحساب البنكي الرئيسي للصالون</option>
                  </select>
                </div>

                {paymentSource?.includes("درج") && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: deductDrawer ? "rgba(229, 72, 77, 0.08)" : "var(--surface-soft)",
                      border: `1.5px solid ${deductDrawer ? "rgba(229, 72, 77, 0.4)" : "var(--border)"}`,
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--text)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={deductDrawer}
                      onChange={(e) => setDeductDrawer(e.target.checked)}
                      style={{ width: 17, height: 17, accentColor: "var(--danger)" }}
                    />
                    <span>خصم المبلغ تلقائياً من عهدة الكاشير بالوردية الحالية</span>
                  </label>
                )}
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setModalOpen(false)}
                  style={{ height: 42, padding: "0 20px" }}
                >
                  إلغاء
                </button>
                <button type="submit" className="primary-btn" style={{ height: 42, padding: "0 24px", gap: 6 }}>
                  <span>حفظ المصروف</span>
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

