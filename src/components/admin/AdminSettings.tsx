import { useState, useEffect } from "react";
import { Icon } from "../Icons";
import { getSalonSettings, saveSalonSettings, SalonSettings } from "../../utils/salonSettings";

export function AdminSettings({
  onSaveSettings,
  onShowToast,
}: {
  onSaveSettings: (settings: Record<string, string>) => void;
  onShowToast: (msg: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"salon" | "general" | "attendance" | "sales" | "security">("salon");

  // Load existing saved settings
  const initial = getSalonSettings();
  const [salonName, setSalonName] = useState(initial.salonName);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone);
  const [taxNumber, setTaxNumber] = useState(initial.taxNumber);
  const [commercialReg, setCommercialReg] = useState(initial.commercialReg);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSalonSettings({
      salonName,
      address,
      phone,
      taxNumber,
      commercialReg,
    });
    onSaveSettings({
      salonName: updated.salonName,
      address: updated.address,
      phone: updated.phone,
      taxNumber: updated.taxNumber,
      commercialReg: updated.commercialReg,
    });
    onShowToast("✅ تم حفظ كافة إعدادات النظام وتحديث العنوان والاسم في كافة الشاشات");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
            إعدادات وتهيئة النظام
          </h2>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
            تخصيص الهوية التجارية للصالون، القواعد التشغيلية، ومعايير الأمان
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { id: "salon", label: "بيانات الصالون والفرع" },
          { id: "general", label: "الإعدادات العامة والعملة" },
          { id: "attendance", label: "سياسات الحضور والانصراف" },
          { id: "sales", label: "سياسات الكاشير والمبيعات" },
          { id: "security", label: "الأمان والخصوصية" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              background: activeTab === tab.id ? "rgba(212, 175, 55, 0.15)" : "#161616",
              border: `1px solid ${activeTab === tab.id ? "#D4AF37" : "#2A2418"}`,
              color: activeTab === tab.id ? "#F5C242" : "#AAA",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: "#141414", border: "1px solid #2A2418", borderRadius: 12, padding: 24 }}>
        <form onSubmit={handleSave}>
          {activeTab === "salon" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
              <div className="form-group">
                <label className="form-label">الاسم التجاري للصالون:</label>
                <input type="text" className="form-input" value={salonName} onChange={(e) => setSalonName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">العنوان بالتفصيل:</label>
                <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">هاتف الاستقبال والحجوزات:</label>
                  <input type="text" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم التسجيل الضريبي (ب.ض):</label>
                  <input type="text" className="form-input" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">رقم السجل التجاري (س.ت):</label>
                <input type="text" className="form-input" value={commercialReg} onChange={(e) => setCommercialReg(e.target.value)} required />
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
              <div className="form-group">
                <label className="form-label">العملة الأساسية للنظام:</label>
                <input type="text" className="form-input" value="الجنيه المصري (ج.م - EGP)" disabled style={{ opacity: 0.8 }} />
              </div>
              <div className="form-group">
                <label className="form-label">لغة الواجهة:</label>
                <input type="text" className="form-input" value="العربية (RTL) - مصر" disabled style={{ opacity: 0.8 }} />
              </div>
              <div className="form-group">
                <label className="form-label">المؤثرات الصوتية (Web Audio API):</label>
                <span style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6 }}>
                  أصوات درج الكاشير، تنبيهات طابعة الفواتير، ونغمة نداء شاشة الدور.
                </span>
                <span className="status-pill active">مفعلة وتعمل أوفلاين ✓</span>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
              <div className="form-group">
                <label className="form-label">الحد الأقصى للسماح بالتأخير الصباحي (بالدقائق):</label>
                <input type="number" className="form-input" defaultValue={15} />
              </div>
              <div className="form-group">
                <label className="form-label">طريقة تسجيل الحضور للحلاقين:</label>
                <select className="form-input" defaultValue="pin">
                  <option value="pin">الرمز السري الشخصي (PIN المكون من 4 أرقام)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "sales" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#DDD" }}>
                <input type="checkbox" defaultChecked />
                <span>إتاحة تطبيق كوبونات الخصم في شاشة الدفع السريع</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#DDD" }}>
                <input type="checkbox" defaultChecked />
                <span>إتاحة إضافة إكراميات الحلاقين (Tips) واحتسابها بمسير الرواتب</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "#DDD" }}>
                <input type="checkbox" defaultChecked />
                <span>إظهار زر الدفع عبر «إنستاباي - InstaPay» في الكاشير</span>
              </label>
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
              <div style={{ background: "#181818", padding: 14, borderRadius: 8, border: "1px solid #2B2519" }}>
                <strong style={{ color: "#F5C242", fontSize: 13, display: "block", marginBottom: 4 }}>
                  حماية خصوصية هواتف العملاء (Phone Masking)
                </strong>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                  يتم تشفير وتعتيم هواتف العملاء (مثال: 010****7665) تلقائياً، ولا يمكن كشف الرقم الكامل إلا لمدير الصالون مع توثيق السبب بالسجل الأمني.
                </p>
              </div>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="primary-btn" style={{ height: 42, padding: "0 24px" }}>
              <span>حفظ الإعدادات</span>
              <Icon name="check" size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

