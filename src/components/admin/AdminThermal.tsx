import { useState, useEffect } from "react";
import { Icon } from "../Icons";
import { QrCode } from "../QrCode";
import { sfx } from "../../utils/audio";
import {
  ThermalSettings,
  getThermalSettings,
  saveThermalSettings,
} from "../../utils/thermalSettings";

export function AdminThermal({
  onShowToast,
}: {
  onShowToast: (msg: string) => void;
}) {
  const initial = getThermalSettings();
  const [printMode, setPrintMode] = useState<ThermalSettings["printMode"]>(initial.printMode);
  const [paperWidth, setPaperWidth] = useState<ThermalSettings["paperWidth"]>(initial.paperWidth);
  const [headerTitle, setHeaderTitle] = useState(initial.headerTitle);
  const [footerMsg, setFooterMsg] = useState(initial.footerMsg);
  const [shopAddress, setShopAddress] = useState(initial.shopAddress);
  const [taxId, setTaxId] = useState(initial.taxId);

  // Auto-save whenever any setting changes
  useEffect(() => {
    saveThermalSettings({
      printMode,
      paperWidth,
      headerTitle,
      footerMsg,
      shopAddress,
      taxId,
    });
  }, [printMode, paperWidth, headerTitle, footerMsg, shopAddress, taxId]);

  const handleTestPrint = () => {
    saveThermalSettings({
      printMode,
      paperWidth,
      headerTitle,
      footerMsg,
      shopAddress,
      taxId,
    });
    sfx.playThermalPrint();
    onShowToast("✅ تم حفظ الإعدادات بنجاح وإرسال أمر الطباعة التجريبي");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const isNarrow = paperWidth === "58mm";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Title & Description */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFF", margin: "0 0 4px" }}>
          إعدادات الطباعة الحرارية (ESC/POS Thermal Receipt)
        </h2>
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
          تخصيص أنماط الإيصالات، مقاسات الورق (80mm / 58mm)، والترويسة التسويقية مع معاينة حية ومباشرة
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Settings Form */}
        <div
          style={{
            background: "#141414",
            border: "1px solid #2A2418",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Print Mode Selector */}
          <div>
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>نمط الطباعة الافتراضي:</span>
              <span style={{ color: "#F5C242", fontSize: 11, fontWeight: 600 }}>
                {printMode === "services_only" && "⚡ مقتضب: فاتورة خدمات سريعة"}
                {printMode === "services_and_catalog" && "⭐ تسويقي: خدمات + عروض مقبلة"}
                {printMode === "catalog_only" && "📋 منيو: كتالوج أسعار الصالون"}
              </span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { id: "services_only", title: "الخدمات فقط", desc: "سريع واقتصادي" },
                { id: "services_and_catalog", title: "خدمات + كتالوج", desc: "تسويقي للصالون" },
                { id: "catalog_only", title: "الكتالوج فقط", desc: "منيو تسعيرة للعميل" },
              ].map((m) => {
                const isSelected = printMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrintMode(m.id as any)}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 8,
                      textAlign: "center",
                      background: isSelected ? "rgba(212, 175, 55, 0.2)" : "#181818",
                      border: `2px solid ${isSelected ? "#D4AF37" : "#262015"}`,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? "0 0 12px rgba(212, 175, 55, 0.2)" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: isSelected ? "#F5C242" : "#DDD",
                      }}
                    >
                      {m.title}
                    </div>
                    <div style={{ fontSize: 11, color: isSelected ? "#E0C878" : "#777", marginTop: 2 }}>
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paper Width & Header Title */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">عرض رول الورق:</label>
              <select
                className="form-input"
                value={paperWidth}
                onChange={(e) => setPaperWidth(e.target.value as any)}
                style={{ fontWeight: 700 }}
              >
                <option value="80mm">80 ملم (القياسي الموصى به - عريض)</option>
                <option value="58mm">58 ملم (طابعات ميني صغيرة - ضيق)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">عنوان الترويسة الرئيسي:</label>
              <input
                type="text"
                className="form-input"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="اسم الصالون في رأس الفاتورة"
              />
            </div>
          </div>

          {/* Shop Address & Tax Registration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">عنوان الصالون / الفرع:</label>
              <input
                type="text"
                className="form-input"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="مثال: القاهرة - التجمع الخامس"
              />
            </div>
            <div className="form-group">
              <label className="form-label">الرقم الضريبي / السجل التجاري:</label>
              <input
                type="text"
                className="form-input"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="مثال: ب.ض: 412890331 • س.ت: 204910"
              />
            </div>
          </div>

          {/* Footer Message */}
          <div className="form-group">
            <label className="form-label">رسالة تذييل الإيصال (Footer):</label>
            <input
              type="text"
              className="form-input"
              value={footerMsg}
              onChange={(e) => setFooterMsg(e.target.value)}
              placeholder="رسالة شكر أو سياسة الاسترجاع"
            />
          </div>

          {/* Test Print Button */}
          <button
            type="button"
            className="primary-btn"
            style={{ height: 44, marginTop: 4, fontSize: 14, fontWeight: 800 }}
            onClick={handleTestPrint}
          >
            <Icon name="printer" size={18} />
            <span>حفظ وطباعة إيصال تجريبي</span>
          </button>
        </div>

        {/* Live ESC/POS Receipt Simulator */}
        <div
          style={{
            background: "#141414",
            border: "1px solid #2A2418",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Status Indicators above Paper */}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              fontSize: 12,
              color: "#888",
              background: "#1A1813",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #332B1C",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#D4AF37", fontWeight: 700 }}>النمط:</span>
              <span style={{ color: "#FFF" }}>
                {printMode === "services_only" && "الخدمات فقط"}
                {printMode === "services_and_catalog" && "خدمات + كتالوج تسويقي"}
                {printMode === "catalog_only" && "منيو الكتالوج فقط"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#D4AF37", fontWeight: 700 }}>عرض الرول:</span>
              <span
                style={{
                  background: isNarrow ? "#E5484D22" : "#3FB95022",
                  color: isNarrow ? "#FF7B72" : "#56D364",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontFamily: "Inter",
                  fontWeight: 800,
                }}
              >
                {paperWidth} {isNarrow ? "(ميني ضيق)" : "(عريض قياسي)"}
              </span>
            </div>
          </div>

          {/* Thermal Paper Container */}
          <div
            className={`thermal-paper ${isNarrow ? "narrow" : ""}`}
            style={{
              width: isNarrow ? 210 : 300,
              padding: isNarrow ? "14px 10px" : "22px 18px",
              fontSize: isNarrow ? 10.5 : 12,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              border: "1px solid #E0DCD3",
              background: "#FFFDF9",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
            }}
          >
            {/* Header */}
            <div className="thermal-paper-header" style={{ marginBottom: isNarrow ? 8 : 12 }}>
              <div
                className="thermal-paper-logo"
                style={{
                  fontSize: isNarrow ? 15 : 18,
                  fontWeight: 900,
                  color: "#000",
                }}
              >
                {headerTitle || "صالون لمسة"}
              </div>
              <div
                className="thermal-paper-tagline"
                style={{ fontSize: isNarrow ? 9.5 : 11, color: "#444", marginTop: 2 }}
              >
                أناقتك تبدأ من هنا
              </div>
              <div style={{ fontSize: isNarrow ? 9 : 10, color: "#666", marginTop: 4 }}>
                {shopAddress}
              </div>
              <div style={{ fontSize: isNarrow ? 8.5 : 9.5, color: "#777", fontFamily: "Inter" }}>
                {taxId}
              </div>
            </div>

            <hr className="thermal-divider" style={{ margin: isNarrow ? "6px 0" : "10px 0" }} />

            {/* Content Variant 1 & 2: Standard Invoice Body (services_only OR services_and_catalog) */}
            {printMode !== "catalog_only" && (
              <>
                <div style={{ fontSize: isNarrow ? 10 : 11, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>رقم الفاتورة:</span>
                  <strong style={{ fontFamily: "Inter" }}>INV-2026-1081</strong>
                </div>
                <div style={{ fontSize: isNarrow ? 10 : 11, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>التاريخ:</span>
                  <span>11 فبراير 2026 - 18:40</span>
                </div>
                <div style={{ fontSize: isNarrow ? 10 : 11, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>الكاشير:</span>
                  <span>حسام حسن (الوردية #104)</span>
                </div>

                <hr className="thermal-divider" style={{ margin: isNarrow ? "6px 0" : "10px 0" }} />

                {/* Items List */}
                <div style={{ fontSize: isNarrow ? 10 : 11, marginBottom: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 800,
                      borderBottom: "1px solid #777",
                      paddingBottom: 2,
                      marginBottom: 4,
                    }}
                  >
                    <span>الخدمة المسددة</span>
                    <span>السعر</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <div>
                      <div>تدريج استايل VIP</div>
                      <div style={{ fontSize: isNarrow ? 8.5 : 9.5, color: "#666" }}>الحلاق: أحمد فتحي</div>
                    </div>
                    <span style={{ fontFamily: "Inter", fontWeight: 700 }}>130 ج.م</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <div>
                      <div>تهذيب وتحديد ذقن بالبخار</div>
                      <div style={{ fontSize: isNarrow ? 8.5 : 9.5, color: "#666" }}>الحلاق: مصطفى حسن</div>
                    </div>
                    <span style={{ fontFamily: "Inter", fontWeight: 700 }}>60 ج.م</span>
                  </div>
                </div>

                <hr className="thermal-divider" style={{ margin: isNarrow ? "6px 0" : "10px 0" }} />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 900,
                    fontSize: isNarrow ? 12 : 14,
                    marginTop: 4,
                  }}
                >
                  <span>الإجمالي المسدد:</span>
                  <span style={{ fontFamily: "Inter" }}>190 ج.م</span>
                </div>
                <div style={{ fontSize: isNarrow ? 9.5 : 10.5, color: "#555", display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                  <span>طريقة الدفع:</span>
                  <span>نقدي (كاش)</span>
                </div>
              </>
            )}

            {/* MARKETING CATALOG SECTION (Appears only when "services_and_catalog" is selected!) */}
            {printMode === "services_and_catalog" && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: "1.5px dashed #444",
                  background: "#F5F2EB",
                  padding: isNarrow ? "8px 6px" : "10px 8px",
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 900,
                    fontSize: isNarrow ? 10 : 11.5,
                    color: "#000",
                    marginBottom: 4,
                  }}
                >
                  ✂️ عروض وكتالوج صالون لمسة ✂️
                </div>
                <div style={{ fontSize: isNarrow ? 8.5 : 9.5, color: "#666", textAlign: "center", marginBottom: 6 }}>
                  عروض خاصة وحصرية لزيارتك القادمة:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: isNarrow ? 9 : 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• باقة VIP الملكية (شعر + ذقن + بخار)</span>
                    <strong style={{ fontFamily: "Inter" }}>250 ج.م</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• تنظيف بشرة أوزون وماسك ذهب</span>
                    <strong style={{ fontFamily: "Inter" }}>120 ج.م</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• جلسة بروتين كولاجين علاجي</span>
                    <strong style={{ fontFamily: "Inter" }}>450 ج.م</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>• استشوار وتصفيف سيروم كريستال</span>
                    <strong style={{ fontFamily: "Inter" }}>50 ج.م</strong>
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: isNarrow ? 8.5 : 9.5,
                    color: "#222",
                    fontWeight: 700,
                    marginTop: 6,
                    paddingTop: 4,
                    borderTop: "1px dotted #999",
                  }}
                >
                  احجز موعدك القادم مع كابتنك المفضل!
                </div>
              </div>
            )}

            {/* CATALOG ONLY MODE (Appears when "catalog_only" is selected - completely turns receipt into Salon Menu!) */}
            {printMode === "catalog_only" && (
              <div style={{ padding: "4px 0" }}>
                <div
                  style={{
                    textAlign: "center",
                    background: "#000",
                    color: "#FFF",
                    padding: "4px 8px",
                    fontWeight: 900,
                    fontSize: isNarrow ? 11 : 12.5,
                    borderRadius: 3,
                    marginBottom: 6,
                  }}
                >
                  قائمة خدمات وأسعار الصالون
                </div>
                <div style={{ textAlign: "center", fontSize: isNarrow ? 8.5 : 9.5, color: "#666", marginBottom: 8 }}>
                  منيو التسعيرة المعتمدة لعام 2026
                </div>

                {/* Section 1: Haircuts */}
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: isNarrow ? 9.5 : 11,
                      borderBottom: "1px solid #000",
                      paddingBottom: 2,
                      marginBottom: 4,
                    }}
                  >
                    💈 خدمات الحلاقة والتدريج
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: isNarrow ? 9 : 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>تدريج استايل VIP + استشوار</span>
                      <strong style={{ fontFamily: "Inter" }}>130 ج.م</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>قص شعر كلاسيك ملكي</span>
                      <strong style={{ fontFamily: "Inter" }}>90 ج.م</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>تهذيب وتحديد ذقن بالبخار</span>
                      <strong style={{ fontFamily: "Inter" }}>60 ج.م</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>حلاقة أطفال استايل</span>
                      <strong style={{ fontFamily: "Inter" }}>70 ج.م</strong>
                    </div>
                  </div>
                </div>

                {/* Section 2: Skin Care */}
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: isNarrow ? 9.5 : 11,
                      borderBottom: "1px solid #000",
                      paddingBottom: 2,
                      marginBottom: 4,
                    }}
                  >
                    💆 العناية بالبشرة والسبا
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: isNarrow ? 9 : 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>تنظيف بشرة أوزون متكامل (6 مراحل)</span>
                      <strong style={{ fontFamily: "Inter" }}>120 ج.م</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>حمام كريم وبخار للشعر</span>
                      <strong style={{ fontFamily: "Inter" }}>80 ج.م</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>صنفرة وماسك الفحم والذهب</span>
                      <strong style={{ fontFamily: "Inter" }}>70 ج.م</strong>
                    </div>
                  </div>
                </div>

                {/* Section 3: Treatments */}
                <div style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: isNarrow ? 9.5 : 11,
                      borderBottom: "1px solid #000",
                      paddingBottom: 2,
                      marginBottom: 4,
                    }}
                  >
                    ✨ المعالجات والبروتين
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: isNarrow ? 9 : 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>جلسة بروتين كيراتين برازيلي أصلي</span>
                      <strong style={{ fontFamily: "Inter" }}>450 ج.م</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>صبغة وتلوين لحية إيطالية</span>
                      <strong style={{ fontFamily: "Inter" }}>150 ج.م</strong>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "#EEEEEE",
                    padding: "4px 8px",
                    borderRadius: 4,
                    textAlign: "center",
                    fontSize: isNarrow ? 8.5 : 9.5,
                    color: "#333",
                    margin: "6px 0",
                  }}
                >
                  جميع الأسعار شاملة الخدمة والضريبة
                </div>
              </div>
            )}

            <hr className="thermal-divider" style={{ margin: isNarrow ? "6px 0" : "10px 0" }} />

            {/* Real Authentic QR Code Generator */}
            <div style={{ textAlign: "center", margin: isNarrow ? "8px 0 4px" : "12px 0 6px" }}>
              <QrCode
                value={`${headerTitle}|${taxId}|INV-2026-1081|190.00|2026-02-11T18:40:00Z`}
                size={isNarrow ? 68 : 82}
              />
              <div style={{ fontSize: isNarrow ? 8 : 8.5, color: "#555", marginTop: 4, fontWeight: 600 }}>
                فاتورة إلكترونية معتمدة • مصلحة الضرائب المصرية
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                textAlign: "center",
                marginTop: isNarrow ? 6 : 10,
                fontSize: isNarrow ? 9 : 10.5,
                color: "#333",
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {footerMsg || "شكراً لزيارتكم • أناقتك تبدأ من هنا"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
