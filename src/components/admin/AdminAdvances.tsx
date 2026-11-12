import { useState } from "react";
import { AdvanceRecord, Barber } from "../../types";
import { Icon } from "../Icons";

export function AdminAdvances({
  advances,
  barbers,
  onAdd,
  onEdit,
  onDelete,
  currentUser,
}: {
  advances: AdvanceRecord[];
  barbers: Barber[];
  onAdd: (a: AdvanceRecord) => void;
  onEdit: (a: AdvanceRecord) => void;
  onDelete: (id: string) => void;
  currentUser: string;
}) {
  const [filterEmp, setFilterEmp] = useState("الكل");
  const [filterStatus, setFilterStatus] = useState("الكل");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdv, setEditingAdv] = useState<AdvanceRecord | null>(null);
  const [form, setForm] = useState({
    barberId: barbers[0]?.id || "",
    amount: "",
    reason: "",
    notes: "",
    status: "نشط" as AdvanceRecord["status"],
    paidAmount: "",
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const filtered = advances.filter((a) => {
    if (filterEmp !== "الكل" && a.barberId !== filterEmp) return false;
    if (filterStatus !== "الكل" && a.status !== filterStatus) return false;
    return true;
  });

  const totalFiltered = filtered.reduce((s, a) => s + a.amount, 0);
  const totalPaid = filtered.reduce((s, a) => s + (a.paidAmount || 0), 0);
  const totalRemaining = totalFiltered - totalPaid;

  const openAdd = () => {
    setEditingAdv(null);
    setForm({
      barberId: barbers[0]?.id || "",
      amount: "",
      reason: "",
      notes: "",
      status: "نشط",
      paidAmount: "",
    });
    setModalOpen(true);
  };

  const openEdit = (adv: AdvanceRecord) => {
    setEditingAdv(adv);
    setForm({
      barberId: adv.barberId,
      amount: String(adv.amount),
      reason: adv.reason,
      notes: adv.notes || "",
      status: adv.status,
      paidAmount: String(adv.paidAmount || 0),
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.barberId || !form.amount || !form.reason) {
      showToast("الرجاء تعبئة جميع الحقول المطلوبة");
      return;
    }
    const barber = barbers.find((b) => b.id === form.barberId);
    if (!barber) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

    if (editingAdv) {
      onEdit({
        ...editingAdv,
        barberId: form.barberId,
        barberName: barber.name,
        amount: Number(form.amount),
        reason: form.reason,
        notes: form.notes,
        status: form.status,
        paidAmount: Number(form.paidAmount) || 0,
      });
      showToast("تم تحديث السلفة بنجاح");
    } else {
      onAdd({
        id: `ADV-${Date.now()}`,
        barberId: form.barberId,
        barberName: barber.name,
        amount: Number(form.amount),
        reason: form.reason,
        date: dateStr,
        time: timeStr,
        registeredBy: currentUser,
        registeredByRole: "admin",
        status: form.status,
        paidAmount: Number(form.paidAmount) || 0,
        notes: form.notes,
      });
      showToast("تم تسجيل السلفة بنجاح");
    }
    setModalOpen(false);
  };

  const statusColor = (s: AdvanceRecord["status"]) => {
    if (s === "مسدد") return "var(--success-text)";
    if (s === "جزئي") return "var(--light-gold)";
    return "var(--danger-text)";
  };

  return (
    <div style={{ padding: "0 0 32px" }}>
      {/* KPI Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "إجمالي السلف", val: totalFiltered, color: "var(--danger-text)" },
          { label: "المُسدَّد", val: totalPaid, color: "var(--success-text)" },
          { label: "المتبقي", val: totalRemaining, color: "var(--light-gold)" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 18px",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>
              {kpi.val.toLocaleString("ar-EG")} ج.م
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select
          value={filterEmp}
          onChange={(e) => setFilterEmp(e.target.value)}
          className="form-input"
          style={{ maxWidth: 180, flex: 1 }}
        >
          <option value="الكل">كل الموظفين</option>
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-input"
          style={{ maxWidth: 160, flex: 1 }}
        >
          {["الكل", "نشط", "جزئي", "مسدد"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={openAdd}
          className="primary-btn"
          style={{ marginRight: "auto", height: 40, padding: "0 20px", fontSize: 14 }}
        >
          <Icon name="plus" size={16} />
          <span>تسجيل سلفة جديدة</span>
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--subtle)",
            background: "var(--surface-2)",
            borderRadius: 12,
            border: "1px dashed var(--border-strong)",
          }}
        >
          <Icon name="users" size={40} />
          <p style={{ marginTop: 12 }}>لا توجد سلف مسجلة</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["الموظف", "المبلغ", "السبب", "التاريخ", "المسجّل", "الحالة", "الإجراءات"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      fontSize: 12,
                      color: "var(--muted)",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((adv) => (
                <tr
                  key={adv.id}
                  style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-soft)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                >
                  <td style={{ padding: "12px", fontWeight: 700, color: "var(--text)", fontSize: 14 }}>
                    {adv.barberName}
                  </td>
                  <td style={{ padding: "12px", color: "var(--danger-text)", fontWeight: 800, fontSize: 15 }}>
                    {adv.amount.toLocaleString("ar-EG")} ج.م
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: 13, maxWidth: 180 }}>
                    {adv.reason}
                  </td>
                  <td style={{ padding: "12px", color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                    {adv.date}
                    <br />
                    <span style={{ color: "var(--subtle)" }}>{adv.time}</span>
                  </td>
                  <td style={{ padding: "12px", fontSize: 12 }}>
                    <span style={{ color: adv.registeredByRole === "admin" ? "var(--gold)" : "var(--info-text)" }}>
                      {adv.registeredBy}
                    </span>
                    <br />
                    <span style={{ color: "var(--subtle)", fontSize: 11 }}>
                      {adv.registeredByRole === "admin" ? "أدمن" : "كاشير"}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        background: `${statusColor(adv.status)}22`,
                        color: statusColor(adv.status),
                        border: `1px solid ${statusColor(adv.status)}55`,
                        borderRadius: 20,
                        padding: "3px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {adv.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => openEdit(adv)}
                        style={{
                          background: "var(--card-hover)",
                          border: "1px solid var(--border)",
                          color: "var(--light-gold)",
                          borderRadius: 8,
                          padding: "5px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(adv.id)}
                        style={{
                          background: "var(--card-hover)",
                          border: "1px solid var(--border)",
                          color: "var(--danger-text)",
                          borderRadius: 8,
                          padding: "5px 10px",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 500,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--surface-2)",
              border: "1.5px solid var(--gold)",
              borderRadius: 18,
              padding: 28,
              width: "100%",
              maxWidth: 480,
            }}
          >
            <h3 style={{ color: "var(--light-gold)", margin: "0 0 20px", fontSize: 18, fontWeight: 800 }}>
              {editingAdv ? "تعديل السلفة" : "تسجيل سلفة جديدة"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label">الموظف *</label>
                <select
                  className="form-input"
                  value={form.barberId}
                  onChange={(e) => setForm((f) => ({ ...f, barberId: e.target.value }))}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">مبلغ السلفة (ج.م) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="form-label">سبب السلفة *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="سبب صرف السلفة..."
                />
              </div>

              <div>
                <label className="form-label">الحالة</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AdvanceRecord["status"] }))}
                >
                  {(["نشط", "جزئي", "مسدد"] as AdvanceRecord["status"][]).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {(form.status === "جزئي" || form.status === "مسدد") && (
                <div>
                  <label className="form-label">المبلغ المُسدَّد (ج.م)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.paidAmount}
                    onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="form-label">ملاحظات</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button type="button" onClick={handleSubmit} className="primary-btn" style={{ flex: 1, height: 44 }}>
                <Icon name="check" size={16} />
                <span>{editingAdv ? "حفظ التعديلات" : "تسجيل السلفة"}</span>
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  flex: 1,
                  height: 44,
                  background: "var(--card-hover)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--surface-soft)",
              border: "1.5px solid var(--danger-text)",
              borderRadius: 16,
              padding: 28,
              maxWidth: 380,
              textAlign: "center",
            }}
          >
            <div style={{ color: "var(--danger-text)", marginBottom: 12 }}>
              <Icon name="alert" size={40} />
            </div>
            <h3 style={{ color: "var(--text)", margin: "0 0 8px", fontSize: 18 }}>تأكيد الحذف</h3>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 20 }}>
              هل تريد حذف هذه السلفة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                  showToast("تم حذف السلفة");
                }}
                style={{
                  flex: 1,
                  height: 42,
                  background: "var(--danger-text)",
                  color: "#FFF",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                نعم، احذف
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  flex: 1,
                  height: 42,
                  background: "var(--card-hover)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-bar">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

