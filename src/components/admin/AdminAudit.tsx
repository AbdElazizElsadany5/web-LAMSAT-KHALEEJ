import { useState } from "react";
import { AuditLog } from "../../types";
import { Icon } from "../Icons";

export function AdminAudit({
  auditLogs,
  onShowToast,
}: {
  auditLogs: AuditLog[];
  onShowToast: (msg: string) => void;
}) {
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = auditLogs.filter((log) => {
    const matchSev = filterSeverity === "all" || log.severity === filterSeverity;
    const matchSearch =
      searchTerm === "" ||
      log.action.includes(searchTerm) ||
      log.user.includes(searchTerm) ||
      log.reason?.includes(searchTerm);
    return matchSev && matchSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            سجل العمليات والرقابة الأمنية (Audit Trail)
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            سجل محمي وغير قابل للتعديل يوثق كافة العمليات الحساسة مع الأسباب المسبقة
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn"
          style={{ height: 36, padding: "0 14px", fontSize: 12 }}
          onClick={() => onShowToast("تم تصدير سجل العمليات بصيغة Excel")}
        >
          <Icon name="download" size={15} />
          <span>تصدير السجل</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 12 }}>
        <input
          type="text"
          className="form-input"
          placeholder="بحث في السجل الأمني بالعملية أو المستخدم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <select
          className="form-input"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="all">جميع مستويات الحساسية</option>
          <option value="حرج">حرج فقط (إلغاء واسترجاع)</option>
          <option value="حساس">حساس (كشف هاتف، مصاريف)</option>
          <option value="عادي">عادي (تسجيل دخول، أسعار)</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>المعرف</th>
              <th>المستخدم</th>
              <th>العملية</th>
              <th>التصنيف</th>
              <th>التوقيت</th>
              <th>السبب الإلزامي الموثق</th>
              <th>مستوى الحساسية</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ fontFamily: "Inter", color: "var(--muted)" }}>{log.id}</td>
                <td style={{ fontWeight: 700, color: "var(--text)" }}>{log.user}</td>
                <td>{log.action}</td>
                <td><span className="status-pill">{log.category}</span></td>
                <td style={{ fontFamily: "Inter", fontSize: 12, color: "var(--text-secondary)" }}>{log.timestamp}</td>
                <td style={{ color: "var(--text)", maxWidth: 280 }}>{log.reason || "—"}</td>
                <td>
                  <span
                    className={`badge ${
                      log.severity === "حرج" ? "danger" : log.severity === "حساس" ? "warning" : "info"
                    }`}
                  >
                    <i />
                    {log.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

