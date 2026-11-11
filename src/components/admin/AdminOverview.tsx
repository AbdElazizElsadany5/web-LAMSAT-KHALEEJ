import { useState } from "react";
import { Invoice, ExpenseRecord, Barber, ServiceItem, AuditLog, PrintMode } from "../../types";
import { Icon } from "../Icons";

export function AdminOverview({
  invoices,
  expenses,
  barbers,
  services,
  auditLogs,
  onShowToast,
}: {
  invoices: Invoice[];
  expenses: ExpenseRecord[];
  barbers: Barber[];
  services: ServiceItem[];
  auditLogs: AuditLog[];
  onShowToast: (msg: string) => void;
}) {
  const [quickPrintMode, setQuickPrintMode] = useState<PrintMode>("services_only");
  const [quickAutoPrint, setQuickAutoPrint] = useState(true);
  const [quickManualDiscount, setQuickManualDiscount] = useState(true);
  const [quickEnableTip, setQuickEnableTip] = useState(true);
  const [quickEnableQueueNum, setQuickEnableQueueNum] = useState(true);

  // Financial KPIs
  const completedInvoices = invoices.filter((i) => i.status === "مكتملة");
  const todayRevenue = completedInvoices.reduce((acc, i) => acc + i.total, 0);
  const todayExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const todayNet = todayRevenue - todayExpenses;
  const targetGoal = 8000;
  const targetProgress = Math.min(100, Math.round((todayRevenue / targetGoal) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Target Progress Bar */}
      <div
        style={{
          background: "#141414",
          border: "1px solid #2A2418",
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(212, 175, 55, 0.12)",
              color: "#D4AF37",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="crown" size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#FFF" }}>
              المستهدف المالي اليومي: <strong style={{ color: "#F5C242", fontFamily: "Inter" }}>{targetGoal.toLocaleString()} ج.م</strong>
            </div>
            <div style={{ fontSize: 12, color: "#888" }}>
              تم تحقيق <strong style={{ color: "#56D364", fontFamily: "Inter" }}>{todayRevenue.toLocaleString()} ج.م</strong> ({targetProgress}%) حتى الآن
            </div>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: 380 }}>
          <div style={{ width: "100%", height: 10, background: "#222", borderRadius: 5, overflow: "hidden" }}>
            <div
              style={{
                width: `${targetProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #D4AF37, #F5C242)",
                borderRadius: 5,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: 13, marginBottom: 8 }}>
            <span>إيراد اليوم</span>
            <Icon name="wallet" size={17} style={{ color: "#D4AF37" } as any} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#F5C242", fontFamily: "Inter" }}>
            {todayRevenue.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500 }}>ج.م</span>
          </div>
          <div style={{ fontSize: 11, color: "#56D364", marginTop: 4 }}>+14% مقارنة بالأسبوع الماضي</div>
        </div>

        <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: 13, marginBottom: 8 }}>
            <span>الفواتير المصدرة</span>
            <Icon name="receipt" size={17} style={{ color: "#D4AF37" } as any} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#FFF", fontFamily: "Inter" }}>
            {completedInvoices.length} <span style={{ fontSize: 14, fontWeight: 500, color: "#888" }}>فاتورة</span>
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>متوسط الفاتورة: ~{Math.round(todayRevenue / Math.max(1, completedInvoices.length))} ج.م</div>
        </div>

        <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: 13, marginBottom: 8 }}>
            <span>مصروفات اليوم</span>
            <Icon name="tag" size={17} style={{ color: "#E5484D" } as any} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#E5484D", fontFamily: "Inter" }}>
            {todayExpenses.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500 }}>ج.م</span>
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>تشمل النظافة والضيافة</div>
        </div>

        <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#888", fontSize: 13, marginBottom: 8 }}>
            <span>صافي أرباح اليوم</span>
            <Icon name="chart" size={17} style={{ color: "#3FB950" } as any} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#3FB950", fontFamily: "Inter" }}>
            {todayNet.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500 }}>ج.م</span>
          </div>
          <div style={{ fontSize: 11, color: "#56D364", marginTop: 4 }}>بعد خصم المصروفات اليومية</div>
        </div>
      </div>

      {/* Middle Grid: Weekly Sales & Top Services */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        {/* Weekly Sales Chart */}
        <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF" }}>مبيعات الأسبوع (السبت - الجمعة)</div>
            <span style={{ fontSize: 12, color: "#D4AF37", fontFamily: "Inter" }}>المجموع: 32,450 ج.م</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 160, paddingTop: 10, borderBottom: "1px solid #252016" }}>
            {[
              { day: "السبت", val: 4200, h: 65 },
              { day: "الأحد", val: 3800, h: 58 },
              { day: "الإثنين", val: 3400, h: 52 },
              { day: "الثلاثاء", val: 4100, h: 62 },
              { day: "الأربعاء", val: 4600, h: 72 },
              { day: "الخميس", val: 6800, h: 96 },
              { day: "الجمعة", val: 5550, h: 84 },
            ].map((d, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <span style={{ fontSize: 10, color: "#888", fontFamily: "Inter" }}>{d.val}</span>
                <div
                  style={{
                    width: 24,
                    height: `${d.h}%`,
                    background: d.day === "الخميس" ? "linear-gradient(180deg, #F5C242, #D4AF37)" : "#262015",
                    border: "1px solid #D4AF37",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s ease",
                  }}
                  title={`${d.day}: ${d.val} ج.م`}
                />
                <span style={{ fontSize: 11, color: "#AAA" }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Requested Services */}
        <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF", marginBottom: 14 }}>الخدمات الأكثر طلباً اليوم</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { name: "تدريج استايل VIP (Skin Fade)", count: 18, pct: 85 },
              { name: "قص شعر كلاسيك فاخر", count: 14, pct: 68 },
              { name: "حلاقة ذقن كاملة فوطة ساخنة", count: 12, pct: 55 },
              { name: "باقة العريس الملكية VIP", count: 6, pct: 32 },
            ].map((srv, idx) => (
              <div key={idx}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#DDD" }}>{srv.name}</span>
                  <strong style={{ color: "#F5C242", fontFamily: "Inter" }}>{srv.count} طلب</strong>
                </div>
                <div style={{ width: "100%", height: 6, background: "#222", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${srv.pct}%`, height: "100%", background: "#D4AF37", borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barber Performance Cards */}
      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF", marginBottom: 14 }}>إنتاجية الحلاقين اليوم</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {barbers.map((b) => (
            <div
              key={b.id}
              style={{
                background: "#181818",
                border: "1px solid #262015",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <img src={b.avatar} alt={b.name} style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {b.name}
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>{b.title}</div>
                <div style={{ fontSize: 12, color: "#D4AF37", fontWeight: 700, marginTop: 2, fontFamily: "Inter" }}>
                  {b.completedToday} خدمة • {b.revenueToday} ج.م
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Control Center */}
      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF", marginBottom: 14 }}>مركز التحكم والسياسات السريعة</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#181818", padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 13, color: "#DDD" }}>طباعة فورية للفاتورة</span>
            <input type="checkbox" checked={quickAutoPrint} onChange={(e) => { setQuickAutoPrint(e.target.checked); onShowToast("تم تحديث خيار الطباعة التلقائية"); }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#181818", padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 13, color: "#DDD" }}>السماح بالخصم اليدوي</span>
            <input type="checkbox" checked={quickManualDiscount} onChange={(e) => { setQuickManualDiscount(e.target.checked); onShowToast("تم تحديث صلاحية الخصم اليدوي"); }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#181818", padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 13, color: "#DDD" }}>تفعيل إكرامية الحلاق</span>
            <input type="checkbox" checked={quickEnableTip} onChange={(e) => { setQuickEnableTip(e.target.checked); onShowToast("تم تحديث خيار الإكرامية"); }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#181818", padding: "10px 14px", borderRadius: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 13, color: "#DDD" }}>إظهار رقم الدور بالإيصال</span>
            <input type="checkbox" checked={quickEnableQueueNum} onChange={(e) => { setQuickEnableQueueNum(e.target.checked); onShowToast("تم تحديث إعداد رقم الدور"); }} />
          </label>
        </div>
      </div>
    </div>
  );
}

