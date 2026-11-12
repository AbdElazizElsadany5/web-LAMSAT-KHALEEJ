import { useState } from "react";
import { Icon } from "../Icons";

export function AdminBackup({
  onShowToast,
}: {
  onShowToast: (msg: string) => void;
}) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restorePassword, setRestorePassword] = useState("");

  const handleManualBackup = () => {
    setIsBackingUp(true);
    setBackupProgress(10);
    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBackingUp(false);
          onShowToast("تم إنشاء نسخة احتياطية محلية مشفرة بنجاح (SQLite Backup)");
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  const handleConfirmRestore = (e: React.FormEvent) => {
    e.preventDefault();
    if (restorePassword === "1234" || restorePassword === "admin123") {
      setRestoreModalOpen(false);
      setRestorePassword("");
      onShowToast("تم استرجاع النسخة الاحتياطية بنجاح وإعادة تشغيل قاعدة البيانات");
    } else {
      alert("كلمة المرور غير صحيحة! (للتجربة: 1234)");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            النسخ الاحتياطي واستعادة البيانات (Backup & Restore)
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            قاعدة البيانات المحلية مشفرة بالكامل بتشفير AES-256 لحماية بيانات العملاء والمبيعات
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={handleManualBackup}
          disabled={isBackingUp}
          style={{ height: 38, padding: "0 16px", fontSize: 13 }}
        >
          <Icon name="backup" size={16} />
          <span>{isBackingUp ? `جارٍ النسخ (${backupProgress}%)...` : "أخذ نسخة احتياطية فورية"}</span>
        </button>
      </div>

      {isBackingUp && (
        <div style={{ background: "var(--card)", border: "1px solid var(--gold)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, color: "var(--light-gold)", fontWeight: 700, marginBottom: 8 }}>
            جارٍ أرشفة وتشفير قاعدة بيانات الصالون...
          </div>
          <div style={{ width: "100%", height: 8, background: "var(--surface-soft)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${backupProgress}%`, height: "100%", background: "var(--gold)", transition: "width 0.2s" }} />
          </div>
        </div>
      )}

      {/* Backup History Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>اسم ملف النسخة الاحتياطية</th>
              <th>التاريخ والوقت</th>
              <th>الحجم</th>
              <th>نوع النسخ</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: "Inter", fontWeight: 700, color: "var(--text)" }}>
                lamsa_pos_backup_20260211_1800.sqlite.bak
              </td>
              <td>11 فبراير 2026 - 06:00 م</td>
              <td style={{ fontFamily: "Inter" }}>14.8 MB</td>
              <td>يدوي (كريم عادل)</td>
              <td><span className="badge success"><i />سليمة وقابلة للاستعادة</span></td>
              <td>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ height: 30, padding: "0 10px", fontSize: 11 }}
                  onClick={() => setRestoreModalOpen(true)}
                >
                  استعادة هذه النسخة
                </button>
              </td>
            </tr>
            <tr>
              <td style={{ fontFamily: "Inter", fontWeight: 700, color: "var(--text)" }}>
                lamsa_pos_backup_20260210_2300.sqlite.bak
              </td>
              <td>10 فبراير 2026 - 11:00 م</td>
              <td style={{ fontFamily: "Inter" }}>14.2 MB</td>
              <td>تلقائي (إغلاق الوردية #103)</td>
              <td><span className="badge success"><i />سليمة وقابلة للاستعادة</span></td>
              <td>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ height: 30, padding: "0 10px", fontSize: 11 }}
                  onClick={() => setRestoreModalOpen(true)}
                >
                  استعادة هذه النسخة
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Restore Modal */}
      {restoreModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h2 style={{ color: "var(--danger-text)" }}>تأكيد استرجاع النسخة الاحتياطية</h2>
              <button type="button" onClick={() => setRestoreModalOpen(false)} style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmRestore}>
              <div style={{ background: "var(--danger-soft)", border: "1px solid var(--danger-border)", color: "var(--danger-text)", padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                <strong>تحذير أمني:</strong> استعادة نسخة سابقة سيستبدل البيانات الحالية بالبيانات المحفوظة في ملف النسخة الاحتياطية.
              </div>

              <div className="form-group">
                <label className="form-label">أدخل كلمة مرور الأدمن للتأكيد:</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="كلمة المرور (للتجربة: 1234)"
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button type="submit" className="danger-btn" style={{ flex: 1, height: 42 }}>
                  <span>تأكيد الاستعادة</span>
                  <Icon name="check" size={16} />
                </button>
                <button type="button" className="secondary-btn" onClick={() => setRestoreModalOpen(false)} style={{ height: 42 }}>
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

