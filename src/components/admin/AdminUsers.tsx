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
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <h2>إضافة مستخدم جديد</h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label className="form-label">الاسم بالكامل:</label>
                <input type="text" className="form-input" placeholder="مثال: حسام حسن" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">اسم المستخدم للطرفية (Username):</label>
                <input type="text" className="form-input" placeholder="cashier_morning" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">الدور / الصلاحيات:</label>
                <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="كاشير مناوب">كاشير (مبيعات وفواتير فقط)</option>
                  <option value="مشرف صالة">مشرف صالة (مبيعات + تقارير محدودة)</option>
                  <option value="أدمن (مدير عام)">أدمن (كامل الصلاحيات والتحكم)</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" className="primary-btn" style={{ flex: 1, height: 42 }}>
                  <span>حفظ الحساب</span>
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

