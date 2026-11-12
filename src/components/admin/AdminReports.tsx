import { useState } from "react";
import { Invoice } from "../../types";
import { Icon } from "../Icons";

export function AdminReports({
  invoices,
  onShowToast,
}: {
  invoices: Invoice[];
  onShowToast: (msg: string) => void;
}) {
  const [reportType, setReportType] = useState<"sales" | "financial" | "services" | "staff">("sales");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            التقارير التحليلية والإحصائية
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            تقارير تفصيلية للأداء المالي، المبيعات، ومعدل إنجاز الخدمات
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ height: 36, padding: "0 14px", fontSize: 12 }}
            onClick={() => onShowToast("تم تصدير التقرير بصيغة Excel")}
          >
            <Icon name="download" size={15} />
            <span>Excel</span>
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ height: 36, padding: "0 14px", fontSize: 12 }}
            onClick={() => {
              window.print();
              onShowToast("تم فتح نافذة طباعة التقرير PDF");
            }}
          >
            <Icon name="printer" size={15} />
            <span>طباعة PDF</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { id: "sales", label: "تقرير المبيعات والفواتير" },
          { id: "financial", label: "التقرير المالي وصافي الأرباح" },
          { id: "services", label: "تقرير الخدمات والباقات" },
          { id: "staff", label: "تقرير إنتاجية الحلاقين" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setReportType(tab.id as any)}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              background: reportType === tab.id ? "rgba(212, 175, 55, 0.15)" : "var(--surface-2)",
              border: `1px solid ${reportType === tab.id ? "var(--gold)" : "var(--border)"}`,
              color: reportType === tab.id ? "var(--light-gold)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
        {reportType === "sales" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>ملخص مبيعات اليوم حسب طريقة الدفع:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "var(--surface-soft)", padding: 14, borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>مبيعات الكاش (نقداً):</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--light-gold)", fontFamily: "Inter", marginTop: 4 }}>2,750 ج.م</div>
              </div>
              <div style={{ background: "var(--surface-soft)", padding: 14, borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>مبيعات إنستاباي:</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success-text)", fontFamily: "Inter", marginTop: 4 }}>900 ج.م</div>
              </div>
              <div style={{ background: "var(--surface-soft)", padding: 14, borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>مبيعات البطاقات الائتمانية:</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success-text)", fontFamily: "Inter", marginTop: 4 }}>1,200 ج.م</div>
              </div>
            </div>

            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>الخدمات</th>
                  <th>الإجمالي</th>
                  <th>طريقة الدفع</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontFamily: "Inter", fontWeight: 700 }}>{inv.id}</td>
                    <td>{inv.customerName}</td>
                    <td>{inv.items.map((it) => it.name).join(" + ")}</td>
                    <td style={{ fontFamily: "Inter", fontWeight: 700, color: "var(--light-gold)" }}>{inv.total} ج.م</td>
                    <td>{inv.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === "financial" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>الميزانية التقديرية للأرباح والخسائر:</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "var(--surface-soft)", padding: 16, borderRadius: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--success-text)", marginBottom: 8 }}>الإيرادات الشهرية المحققة:</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", fontFamily: "Inter" }}>124,500 ج.م</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>تشمل خدمات الحلاقة وبيع منتجات العناية</div>
              </div>
              <div style={{ background: "var(--surface-soft)", padding: 16, borderRadius: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger-text)", marginBottom: 8 }}>إجمالي المصروفات والرواتب:</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", fontFamily: "Inter" }}>48,200 ج.م</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>تشمل الرواتب، العمولات، والإيجار والفواتير</div>
              </div>
            </div>
          </div>
        )}

        {reportType === "services" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>ترتيب الخدمات حسب الإيراد الإجمالي:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { name: "تدريج استايل VIP (Skin Fade)", revenue: 18200, count: 140 },
                { name: "باقة العريس الملكية VIP", revenue: 13500, count: 30 },
                { name: "قص شعر كلاسيك فاخر", revenue: 11000, count: 110 },
                { name: "تنظيف بشرة بالبخار وقناع الذهب", revenue: 9000, count: 50 },
              ].map((s, idx) => (
                <div key={idx} style={{ background: "var(--surface-soft)", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "var(--text)", fontSize: 14 }}>{s.name}</strong>
                    <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 12 }}>({s.count} طلب)</span>
                  </div>
                  <strong style={{ color: "var(--light-gold)", fontFamily: "Inter", fontSize: 15 }}>{s.revenue.toLocaleString()} ج.م</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportType === "staff" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>تقييم وأداء فريق العمل:</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {[
                { name: "محمود إبراهيم", services: 184, rev: 24200, rating: 4.9 },
                { name: "أحمد فتحي", services: 162, rev: 21500, rating: 4.8 },
                { name: "مينا عادل", services: 145, rev: 19800, rating: 5.0 },
                { name: "مصطفى حسن", services: 110, rev: 16500, rating: 4.7 },
              ].map((b, idx) => (
                <div key={idx} style={{ background: "var(--surface-soft)", padding: 14, borderRadius: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>إنجاز {b.services} خدمة • تقييم ⭐ {b.rating}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--success-text)", fontFamily: "Inter", marginTop: 6 }}>{b.rev.toLocaleString()} ج.م</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

