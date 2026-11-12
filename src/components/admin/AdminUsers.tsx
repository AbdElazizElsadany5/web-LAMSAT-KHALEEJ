import { useState } from "react";
import { Icon } from "../Icons";

export function AdminUsers({
  onShowToast,
}: {
  onShowToast: (msg: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [users, setUsers] = useState([
    { id: "u1", name: "كريم عادل", role: "أدمن (مدير عام)", username: "admin", status: "نشط", lastLogin: "اليوم 18:40" },
    { id: "u2", name: "حسام حسن", role: "كاشير مناوب", username: "cashier1", status: "نشط", lastLogin: "اليوم 09:00" },
    { id: "u3", name: "أحمد كمال", role: "كاشير وردية مسائية", username: "cashier2", status: "نشط", lastLogin: "أمس 22:30" },
  ]);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("كاشير مناوب");

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;

    const newUser = {
      id: `u-${Date.now()}`,
      name: name.trim(),
      role,
      username: username.trim().toLowerCase(),
      status: "نشط",
      lastLogin: "لم يسجل بعد",
    };
    setUsers((prev) => [...prev, newUser]);
    setModalOpen(false);
    setName("");
    setUsername("");
    onShowToast(`تم إنشاء حساب المستخدم «${newUser.name}» بنجاح`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            إدارة حسابات مستخدمي النظام
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            التحكم في حسابات الكاشير، المشرفين، وصلاحيات الوصول للطرفية
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setModalOpen(true)}
          style={{ height: 38, padding: "0 16px", fontSize: 13 }}
        >
          <Icon name="plus" size={16} />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم بالكامل</th>
              <th>اسم المستخدم</th>
              <th>الدور والصلاحية</th>
              <th>آخر تسجيل دخول</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 700, color: "#FFF" }}>{u.name}</td>
                <td style={{ fontFamily: "Inter", color: "#F5C242" }}>@{u.username}</td>
                <td>
                  <span className={`badge ${u.role.includes("أدمن") ? "warning" : "info"}`}>
                    <i />
                    {u.role}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "#AAA" }}>{u.lastLogin}</td>
                <td>
                  <span className="status-pill active">{u.status}</span>
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ height: 30, padding: "0 10px", fontSize: 11 }}
                    onClick={() => onShowToast(`تم إرسال رابط إعادة تعيين كلمة المرور لـ ${u.name}`)}
                  >
                    إعادة ضبط السر
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
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
                  <Icon name="users" size={18} />
                </span>
                <div>
                  <h2 style={{ fontSize: 17, margin: 0 }}>إضافة مستخدم جديد</h2>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>
                    إنشاء حساب دخول للكاشير أو مشرف الصالة
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
            <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", flex: 1, margin: 0 }}>
              <div className="modal-body" style={{ gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">الاسم بالكامل *:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: حسام حسن"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">اسم المستخدم للدخول (Username) *:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: cashier_morning"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ direction: "ltr", textAlign: "right", fontFamily: "Inter, monospace" }}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">الدور / الصلاحيات:</label>
                  <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="كاشير مناوب">كاشير مناوب (مبيعات وفواتير فقط)</option>
                    <option value="مشرف صالة">مشرف صالة (مبيعات + تقارير محدودة)</option>
                    <option value="أدمن (مدير عام)">أدمن (كامل الصلاحيات والتحكم)</option>
                  </select>
                </div>
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
                  <span>حفظ الحساب</span>
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

