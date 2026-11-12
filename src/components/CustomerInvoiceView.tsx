import { useState } from "react";
import { Invoice, ServiceItem } from "../types";
import { initialServices } from "../data/initialData";
import { getSalonSettings } from "../utils/salonSettings";
import { Icon } from "./Icons";

export function CustomerInvoiceView({
  invoiceData,
  onBackToApp,
}: {
  invoiceData?: Partial<Invoice> | null;
  onBackToApp?: () => void;
}) {
  const salon = getSalonSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");

  // Fallback demo invoice if scanned without full data
  const invoice: Partial<Invoice> = invoiceData || {
    id: "INV-2026-1081",
    date: new Date().toLocaleDateString("ar-EG"),
    time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    customerName: "عميل صالون لمسة خليجي",
    total: 250,
    paymentMethod: "نقداً",
    items: [
      { id: 1, name: "قص وتصفيف شعر ملكي", price: 150, barber: "محمود إبراهيم", category: "قص الشعر" },
      { id: 2, name: "حلاقة وتحديد ذقن VIP", price: 100, barber: "محمود إبراهيم", category: "الذقن" },
    ],
  };

  const services: ServiceItem[] = initialServices;
  const categories = ["الكل", ...Array.from(new Set(services.map((s) => s.category)))];

  const filteredServices =
    selectedCategory === "الكل"
      ? services
      : services.filter((s) => s.category === selectedCategory);

  const cleanPhone = salon.phone.replace(/[^0-9+]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone}?text=${encodeURIComponent(
    `مرحباً صالون ${salon.salonName}، أود الاستفسار وحجز موعد لخدمة لديكم.`
  )}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #12100C 0%, #1A1610 50%, #0E0D0A 100%)",
        color: "#F9F9FB",
        fontFamily: "'Cairo', sans-serif",
        padding: "20px 14px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
      dir="rtl"
    >
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Salon Brand Header */}
        <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #D4AF37 0%, #AA8010 100%)",
              color: "#12100C",
              fontSize: 26,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px",
              boxShadow: "0 8px 24px rgba(212, 175, 55, 0.35)",
            }}
          >
            <Icon name="scissors" size={24} style={{ color: "#12100C" } as React.CSSProperties} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#F5C242", margin: "0 0 4px" }}>
            {salon.salonName}
          </h1>
          <p style={{ fontSize: 12.5, color: "#C0B8A8", margin: 0 }}>
            {salon.address || "صالون حلاقة رجالي فاخر • أرقى خدمات العناية والتصفيف"}
          </p>
        </div>

        {/* INVOICE CARD */}
        <div
          style={{
            background: "#1E1A14",
            border: "1.5px solid #6A5726",
            borderRadius: 18,
            padding: "20px 18px",
            boxShadow: "0 14px 40px rgba(0, 0, 0, 0.6)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top Gold Ribbon */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: "linear-gradient(90deg, #D4AF37 0%, #F5C242 50%, #D4AF37 100%)",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#D4AF37", fontWeight: 800 }}>فاتورة إلكترونية معتمدة</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#FFF", fontFamily: "Inter, Cairo" }}>
                رقم: #{invoice.id}
              </div>
            </div>
            <div
              style={{
                background: "rgba(63, 185, 80, 0.15)",
                color: "#56D364",
                border: "1px solid rgba(63, 185, 80, 0.4)",
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 800,
              }}
            >
              مدفوعة ومكتملة
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              background: "#15130F",
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 11.5,
              color: "#BBB",
              marginBottom: 14,
            }}
          >
            <div>
              <span style={{ color: "#777", display: "block" }}>العميل:</span>
              <strong style={{ color: "#EEE" }}>{invoice.customerName || "عميل بدون تسجيل"}</strong>
            </div>
            <div>
              <span style={{ color: "#777", display: "block" }}>التاريخ والوقت:</span>
              <span style={{ color: "#EEE", fontFamily: "Inter, Cairo" }}>
                {invoice.date} • {invoice.time}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#D4AF37", marginBottom: 8 }}>
              الخدمات المقدمة بالفاتورة:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: "#181510",
                      borderRadius: 8,
                      border: "1px solid #2B2418",
                      fontSize: 12.5,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: "#FFF" }}>{it.name}</div>
                      {it.barber && (
                        <div style={{ fontSize: 10.5, color: "#888" }}>الحلاق: {it.barber}</div>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, color: "#F5C242", fontFamily: "Inter" }}>
                      {it.price} ج.م
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "#777", textAlign: "center" }}>خدمات الصالون</div>
              )}
            </div>
          </div>

          {/* Total & Payment Method */}
          <div
            style={{
              borderTop: "1px dashed #3D3522",
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: "#888", display: "block" }}>طريقة السداد:</span>
              <span style={{ fontSize: 13, color: "#FFF", fontWeight: 700 }}>
                {invoice.paymentMethod || "نقداً (كاش)"}
              </span>
            </div>
            <div style={{ textAlign: "left" }}>
              <span style={{ fontSize: 11, color: "#D4AF37", display: "block" }}>الإجمالي المستحق:</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#F5C242", fontFamily: "Inter" }}>
                {invoice.total?.toLocaleString()} <small style={{ fontSize: 13 }}>ج.م</small>
              </span>
            </div>
          </div>
        </div>

        {/* CALL TO ACTION: Quick Booking via WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            color: "#FFF",
            textDecoration: "none",
            borderRadius: 14,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontWeight: 800,
            fontSize: 14.5,
            boxShadow: "0 6px 20px rgba(37, 211, 102, 0.35)",
            transition: "transform 0.15s ease",
          }}
        >
          <Icon name="send" size={18} />
          <span>احجز موعدك القادم عبر واتساب بنقرة واحدة</span>
        </a>

        {/* SERVICES CATALOG & MENU (قائمة وكتالوج الخدمات المتاحة الأخرى) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#F5C242", margin: "0 0 4px" }}>
              خدمات وباقات الصالون المتاحة
            </h2>
            <p style={{ fontSize: 12, color: "#AAA", margin: 0 }}>
              استكشف أحدث باقات العناية بالبشرة، البروتين، وجلسات الـ VIP
            </p>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: selectedCategory === cat ? "linear-gradient(135deg, #D4AF37 0%, #AA8010 100%)" : "#1A1712",
                  color: selectedCategory === cat ? "#12100C" : "#CCC",
                  border: `1px solid ${selectedCategory === cat ? "#D4AF37" : "#2B2418"}`,
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: selectedCategory === cat ? 800 : 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Services List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredServices.map((svc) => (
              <div
                key={svc.id}
                style={{
                  background: "#1A1712",
                  border: "1px solid #2B2418",
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  transition: "border-color 0.2s ease",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#FFF" }}>{svc.name}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    المدة التقديرية: {svc.durationMinutes} دقيقة • قسم {svc.category}
                  </div>
                </div>
                <div style={{ textAlign: "left", flexShrink: 0 }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: "#F5C242", fontFamily: "Inter" }}>
                    {svc.price}
                  </span>{" "}
                  <span style={{ fontSize: 11, color: "#D4AF37", fontWeight: 700 }}>ج.م</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Salon Contact Card */}
        <div
          style={{
            background: "#14120E",
            border: "1px solid #2B2418",
            borderRadius: 14,
            padding: "16px 18px",
            textAlign: "center",
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: "#D4AF37", marginBottom: 4 }}>
            زورونا في صالون {salon.salonName}
          </div>
          <div style={{ fontSize: 12, color: "#AAA", marginBottom: 8 }}>{salon.address}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            هاتف الصالون: <b style={{ color: "#FFF", direction: "ltr", display: "inline-block" }}>{salon.phone}</b>
          </div>
        </div>

        {/* If Opened from within POS Desktop App */}
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            style={{
              background: "transparent",
              border: "1px solid #3D3522",
              color: "#AAA",
              borderRadius: 10,
              padding: "10px 16px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Icon name="logout" size={14} />
            <span>العودة إلى شاشة الكاشير الرئيسية</span>
          </button>
        )}
      </div>
    </div>
  );
}
