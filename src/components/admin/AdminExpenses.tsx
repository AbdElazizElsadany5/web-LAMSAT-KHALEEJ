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
      deductedFromDrawer: paymentSource.includes("درج") ? deductDrawer : false,
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
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            إدارة المصروفات اليومية والنثريات
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            إجمالي المصروفات المسجلة: <strong style={{ color: "#E5484D", fontFamily: "Inter" }}>{totalExpenses.toLocaleString()} ج.م</strong>
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
      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, overflow: "hidden" }}>
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
                <td style={{ fontWeight: 700, color: "#FFF" }}>{e.title}</td>
                <td>{e.category}</td>
                <td style={{ fontFamily: "Inter", fontWeight: 800, color: "#E5484D" }}>
                  {e.amount.toLocaleString()} ج.م
                </td>
                <td>{e.paymentSource}</td>
                <td style={{ fontSize: 12, color: "#AAA" }}>{e.date} - {e.time}</td>
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
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h2>تسجيل مصروف جديد</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="form-group">
                <label className="form-label">بيان المصروف:</label>
                <input type="text" className="form-input" placeholder="مثال: شراء مناديل وشامبو للغسيل" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">التصنيف:</label>
                  <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="مستلزمات تشغيل">مستلزمات تشغيل ونظافة</option>
                    <option value="ضيافة وبوفيه">ضيافة وبوفيه عملاء</option>
                    <option value="صيانة أجهزة">صيانة ماكينات وأجهزة</option>
                    <option value="فواتير وخدمات">فواتير كهرباء ومياه</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">المبلغ (ج.م):</label>
                  <input type="number" className="form-input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">طريقة السداد:</label>
                <select className="form-input" value={paymentSource} onChange={(e) => setPaymentSource(e.target.value as any)}>
                  <option value="درج النقدية (الوردية)">درج النقدية (خصم مباشر من الكاشير)</option>
                  <option value="تحويل بنكي / إنستاباي">إنستاباي / تحويل بنكي</option>
                  <option value="الحساب البنكي الرئيسي">الحساب البنكي الرئيسي للصالون</option>
                </select>
              </div>

              {paymentSource.includes("درج") && (
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#DDD", cursor: "pointer", marginTop: 4 }}>
                  <input type="checkbox" checked={deductDrawer} onChange={(e) => setDeductDrawer(e.target.checked)} />
                  <span>خصم المبلغ تلقائياً من عهدة الكاشير بالوردية الحالية</span>
                </label>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, height: 42 }}>
                  <span>حفظ المصروف</span>
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
    </div>
  );
}

