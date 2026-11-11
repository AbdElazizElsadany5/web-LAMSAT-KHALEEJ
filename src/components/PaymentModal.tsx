import { useState, useMemo, useEffect } from "react";
import { CartItem, PaymentMethod, Invoice, Coupon } from "../types";
import { Icon } from "./Icons";
import { QrCode } from "./QrCode";
import { sfx } from "../utils/audio";
import { getThermalSettings, ThermalSettings } from "../utils/thermalSettings";

export function PaymentModal({
  cart,
  subtotal,
  onClose,
  onPaymentSuccess,
  coupons,
  activeCashier,
  shiftId = 104,
}: {
  cart: CartItem[];
  subtotal: number;
  onClose: () => void;
  onPaymentSuccess: (invoice: Invoice) => void;
  coupons: Coupon[];
  activeCashier: string;
  shiftId?: number;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("نقداً");
  const [paidCash, setPaidCash] = useState<number>(subtotal);
  const [splitCash, setSplitCash] = useState<number>(Math.floor(subtotal / 2));
  const [splitCard, setSplitCard] = useState<number>(subtotal - Math.floor(subtotal / 2));
  const [tip, setTip] = useState<number>(0);

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState("");
  const [thermalSettings, setThermalSettings] = useState<ThermalSettings>(getThermalSettings);

  useEffect(() => {
    setThermalSettings(getThermalSettings());
  }, []);

  // Helper functions for bulletproof coupon calculation
  const getCouponValue = (c?: Coupon | null): number => {
    if (!c) return 0;
    const val = Number(c.discountValue ?? c.value ?? 0);
    return isNaN(val) ? 0 : val;
  };

  const isPercentageCoupon = (c?: Coupon | null): boolean => {
    if (!c) return false;
    const t = c.discountType || c.type || "percentage";
    return t === "percentage" || t === "نسبة";
  };

  const getCouponMinOrder = (c?: Coupon | null): number => {
    if (!c) return 0;
    const min = Number(c.minOrderValue ?? c.minOrder ?? 0);
    return isNaN(min) ? 0 : min;
  };

  // Coupon discount calculation
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const val = getCouponValue(appliedCoupon);
    if (val <= 0) return 0;

    if (isPercentageCoupon(appliedCoupon)) {
      const calc = (subtotal * val) / 100;
      const maxDiscount = appliedCoupon.maxDiscount ? Number(appliedCoupon.maxDiscount) : calc;
      return Math.round(Math.min(calc, isNaN(maxDiscount) ? calc : maxDiscount));
    }
    return Math.min(val, subtotal);
  }, [appliedCoupon, subtotal]);

  // Final Total
  const finalTotal = useMemo(() => {
    const raw = subtotal - (isNaN(discountAmount) ? 0 : discountAmount) + (isNaN(tip) ? 0 : tip);
    return Math.max(0, isNaN(raw) ? subtotal : raw);
  }, [subtotal, discountAmount, tip]);

  // Update paidCash when total changes
  useEffect(() => {
    setPaidCash(finalTotal);
    setSplitCash(Math.floor(finalTotal / 2));
    setSplitCard(finalTotal - Math.floor(finalTotal / 2));
  }, [finalTotal]);

  // Handle Apply Coupon
  const handleApplyCoupon = (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) return;
    const match = coupons.find((c) => c.code.toUpperCase() === code);
    if (!match) {
      setCouponError("كود الكوبون غير صحيح");
      setAppliedCoupon(null);
      return;
    }
    if (match.status !== "نشط") {
      setCouponError("هذا الكوبون غير مفعّل أو منتهي الصلاحية");
      setAppliedCoupon(null);
      return;
    }
    const minRequired = getCouponMinOrder(match);
    if (subtotal < minRequired) {
      setCouponError(`الحد الأدنى للطلب لتفعيل هذا الكوبون هو ${minRequired} ج.م`);
      setAppliedCoupon(null);
      return;
    }
    setCouponError("");
    setAppliedCoupon(match);
    setCouponCode(match.code);
  };

  // Quick tender buttons for Cash
  const changeAmount = useMemo(() => {
    if (paymentMethod !== "نقداً") return 0;
    return Math.max(0, paidCash - finalTotal);
  }, [paymentMethod, paidCash, finalTotal]);

  // Enter shortcut to complete payment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isSuccess && e.ctrlKey) {
        handleExecutePayment();
      } else if (e.key === "Escape") {
        if (!isSuccess) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSuccess, finalTotal, paymentMethod, paidCash, splitCash, splitCard]);

  // Execute Payment
  const handleExecutePayment = () => {
    // Validation
    if (paymentMethod === "دفع مختلط") {
      if (splitCash + splitCard < finalTotal) {
        alert("مجموع الدفع المختلط أقل من إجمالي الفاتورة المطلوب سداده!");
        return;
      }
    } else if (paymentMethod === "نقداً" && paidCash < finalTotal) {
      alert("المبلغ المدفوع نقداً أقل من الإجمالي المطلوب!");
      return;
    }

    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const invoiceId = `INV-2026-${orderNumber}`;
    const now = new Date();

    const invoice: Invoice = {
      id: invoiceId,
      orderNumber,
      customerName: customerName.trim() || "عميل لمسة خليجي",
      customerPhone: customerPhone.trim() || "01000000000",
      date: now.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
      time: now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      items: cart.map((item) => ({
        name: item.name,
        barber: item.barberName,
        price: item.price,
        qty: item.qty,
        commission: (item.price * 0.35) * item.qty,
      })),
      subtotal,
      discount: discountAmount,
      couponCode: appliedCoupon?.code,
      tip,
      total: finalTotal,
      paymentMethod,
      splitDetails:
        paymentMethod === "دفع مختلط" ? { cash: splitCash, card: splitCard } : undefined,
      status: "مكتملة",
      cashierName: activeCashier,
      shiftId,
      reprintCount: 0,
    };

    setCreatedInvoice(invoice);
    setIsSuccess(true);
    sfx.playCashRegister();
    onPaymentSuccess(invoice);
  };

  // Simulate Thermal Printing
  const handleSimulatePrint = () => {
    sfx.playThermalPrint();
    setIsPrinting(true);
    setPrintSuccessMsg("");
    setTimeout(() => {
      setIsPrinting(false);
      setPrintSuccessMsg("تم إرسال أمر الطباعة بنجاح إلى طابعة الإيصالات الحرارية (ESC/POS) وقص الورقة!");
      setTimeout(() => setPrintSuccessMsg(""), 4000);
    }, 1200);
  };

  return (
    <div className="modal-overlay">
      <div className={`modal-box ${isSuccess ? "wide" : ""}`}>
        {/* Header */}
        <div className="modal-head">
          <div>
            <h2>{isSuccess ? "فاتورة الدفع والإيصال الحراري" : "إتمام الدفع وإصدار الفاتورة"}</h2>
            <p>
              {isSuccess
                ? `تم تسجيل العملية بنجاح تحت الفاتورة رقم ${createdInvoice?.id}`
                : "حدد طريقة الدفع ومعلومات العميل لإصدار الفاتورة الضريبية"}
            </p>
          </div>
          {!isSuccess && (
            <button
              type="button"
              onClick={onClose}
              style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
            >
              <Icon name="x" size={20} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {!isSuccess ? (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
              {/* Left Column: Form, Payment Methods, Coupon */}
              <div>
                {/* Customer Details */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#AAA", marginBottom: 10 }}>
                    معلومات العميل (اختيارية):
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="اسم العميل (اختياري)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="رقم الهاتف (اختياري)"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Coupon Code Section */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#AAA", marginBottom: 8 }}>
                    كود الخصم / الكوبون:
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="أدخل رمز الكوبون (مثلاً: KHALEEJI10)"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError("");
                      }}
                      style={{ textTransform: "uppercase" }}
                    />
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleApplyCoupon()}
                    >
                      تطبيق
                    </button>
                  </div>

                  {couponError && (
                    <div style={{ fontSize: 12, color: "#FF8E92", marginTop: 4, fontWeight: 600 }}>
                      {couponError}
                    </div>
                  )}

                  {appliedCoupon && (
                    <div
                      style={{
                        background: "rgba(63, 185, 80, 0.15)",
                        border: "1px solid rgba(63, 185, 80, 0.35)",
                        color: "#56D364",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        تم تفعيل الكوبون «{appliedCoupon.code}» — خصم {discountAmount} ج.م
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponCode("");
                        }}
                        style={{ background: "transparent", border: 0, color: "#FF8E92", cursor: "pointer" }}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  )}

                  {/* Quick Coupon Chips */}
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {coupons
                      .filter((c) => c.status === "نشط")
                      .map((c) => {
                        const val = getCouponValue(c);
                        const isPct = isPercentageCoupon(c);
                        return (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => handleApplyCoupon(c.code)}
                            style={{
                              background: appliedCoupon?.code === c.code ? "rgba(212, 175, 55, 0.25)" : "#1C180E",
                              border: `1px solid ${appliedCoupon?.code === c.code ? "#D4AF37" : "#4D3F1D"}`,
                              color: appliedCoupon?.code === c.code ? "#FFF" : "#D4AF37",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {c.code} ({isPct ? `${val}%` : `${val} ج.م`})
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#AAA", marginBottom: 10 }}>
                    طريقة السداد:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                    {(["نقداً", "بطاقة", "إنستاباي", "دفع مختلط"] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        style={{
                          height: 48,
                          borderRadius: 10,
                          background: paymentMethod === m ? "rgba(212, 175, 55, 0.2)" : "#161616",
                          border: `1.5px solid ${paymentMethod === m ? "#D4AF37" : "#2B2418"}`,
                          color: paymentMethod === m ? "#F5C242" : "#CCC",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          transition: "all 0.16s",
                        }}
                      >
                        <Icon
                          name={
                            m === "نقداً"
                              ? "cash"
                              : m === "بطاقة"
                                ? "card"
                                : m === "إنستاباي"
                                  ? "wallet"
                                  : "tag"
                          }
                          size={16}
                        />
                        <span>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Payment Method Inputs */}
                {paymentMethod === "نقداً" && (
                  <div style={{ background: "#161616", padding: 14, borderRadius: 10, border: "1px solid #2B2519" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#DDD", marginBottom: 8 }}>
                      المبلغ المستلم نقداً من العميل:
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <input
                        type="number"
                        className="form-input"
                        value={paidCash}
                        onChange={(e) => setPaidCash(Number(e.target.value))}
                        style={{ fontSize: 18, fontWeight: 700, color: "#F5C242" }}
                      />
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setPaidCash(finalTotal)}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        المبلغ بالضبط
                      </button>
                    </div>

                    {/* Quick Tender Presets */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {[50, 100, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className="secondary-btn"
                          style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                          onClick={() => setPaidCash(amt)}
                        >
                          {amt} ج.م
                        </button>
                      ))}
                    </div>

                    {/* Change / Remaining */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 8,
                        borderTop: "1px dashed #333",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ color: "#BBB" }}>المتبقي للعميل (الباقي):</span>
                      <span
                        style={{
                          fontSize: 18,
                          color: changeAmount > 0 ? "#56D364" : "#BBB",
                          fontFamily: "Inter",
                        }}
                      >
                        {changeAmount} ج.م
                      </span>
                    </div>
                  </div>
                )}

                {paymentMethod === "دفع مختلط" && (
                  <div style={{ background: "#161616", padding: 14, borderRadius: 10, border: "1px solid #2B2519" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#DDD", marginBottom: 8 }}>
                      توزيع مبالغ الدفع المختلط:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>
                          المبلغ نقداً:
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          value={splitCash}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSplitCash(val);
                            setSplitCard(Math.max(0, finalTotal - val));
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>
                          المبلغ بالبطاقة أو إنستاباي:
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          value={splitCard}
                          onChange={(e) => setSplitCard(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      المجموع المدخل:{" "}
                      <strong style={{ color: splitCash + splitCard === finalTotal ? "#56D364" : "#FF9F1C" }}>
                        {splitCash + splitCard} / {finalTotal} ج.م
                      </strong>
                    </div>
                  </div>
                )}

                {/* Barber Tip Field */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#AAA", marginBottom: 8 }}>
                    إكرامية الحلاق (اختياري):
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[0, 10, 20, 50].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTip(t)}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 8,
                          background: tip === t ? "#D4AF37" : "#1A1A1A",
                          color: tip === t ? "#111" : "#CCC",
                          border: `1px solid ${tip === t ? "#D4AF37" : "#333"}`,
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {t === 0 ? "بدون إكرامية" : `+${t} ج.م`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Order Items Summary & Total */}
              <div
                style={{
                  background: "#161616",
                  border: "1px solid #2B2519",
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#FFF",
                      paddingBottom: 10,
                      borderBottom: "1px solid #28241B",
                      marginBottom: 12,
                    }}
                  >
                    مراجعة خدمات الطلب:
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
                    {cart.map((item) => (
                      <div
                        key={item.serviceId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          paddingBottom: 8,
                          borderBottom: "1px dashed #222",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "#EEE" }}>
                            {item.name} {item.qty > 1 && `(×${item.qty})`}
                          </div>
                          <div style={{ fontSize: 11, color: "#888" }}>
                            الحلاق: <span style={{ color: "#D4AF37" }}>{item.barberName}</span>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: "#F5C242", fontFamily: "Inter" }}>
                          {item.price * item.qty} ج.م
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div style={{ borderTop: "1px solid #28241B", paddingTop: 14, marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#AAA", marginBottom: 6 }}>
                    <span>المجموع الفرعي:</span>
                    <span className="num">{subtotal} ج.م</span>
                  </div>

                  {discountAmount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#56D364", marginBottom: 6 }}>
                      <span>الخصم المطبق ({appliedCoupon?.code}):</span>
                      <span className="num">-{discountAmount} ج.م</span>
                    </div>
                  )}

                  {tip > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#FF9F1C", marginBottom: 6 }}>
                      <span>إكرامية الحلاق:</span>
                      <span className="num">+{tip} ج.م</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid #332B1E",
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#FFF" }}>المبلغ الإجمالي المطلوب:</span>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#F5C242", fontFamily: "Inter" }}>
                      {finalTotal} <small style={{ fontSize: 14, fontFamily: "Cairo" }}>ج.م</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Post-Payment Success & Interactive Live Thermal Receipt */
            <div>
              <div
                style={{
                  background: "rgba(63, 185, 80, 0.12)",
                  border: "1px solid rgba(63, 185, 80, 0.3)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "#3FB950",
                      color: "#0E0E0E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="check" size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#56D364" }}>
                      تم الدفع وإصدار الفاتورة بنجاح!
                    </div>
                    <div style={{ fontSize: 13, color: "#CCC", marginTop: 2 }}>
                      رقم الفاتورة: <strong style={{ color: "#FFF", fontFamily: "Inter" }}>{createdInvoice?.id}</strong> • طريقة الدفع: {createdInvoice?.paymentMethod}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      handleSimulatePrint();
                      setTimeout(() => {
                        window.print();
                      }, 500);
                    }}
                    disabled={isPrinting}
                  >
                    <Icon name="printer" size={17} />
                    <span>{isPrinting ? "جارٍ الإرسال للطابعة..." : "طباعة الإيصال الحراري"}</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={onClose}
                  >
                    <Icon name="plus" size={16} />
                    <span>بدء طلب جديد (F2)</span>
                  </button>
                </div>
              </div>

              {printSuccessMsg && (
                <div
                  style={{
                    background: "#1E1A12",
                    border: "1px solid #D4AF37",
                    color: "#F5C242",
                    padding: "10px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  ✓ {printSuccessMsg}
                </div>
              )}

              {/* Thermal Receipt Slip Simulator */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  className={`thermal-paper ${thermalSettings.paperWidth === "58mm" ? "narrow" : ""}`}
                  style={{
                    width: thermalSettings.paperWidth === "58mm" ? 210 : 300,
                    padding: thermalSettings.paperWidth === "58mm" ? "14px 10px" : "22px 18px",
                    fontSize: thermalSettings.paperWidth === "58mm" ? 10.5 : 12,
                  }}
                >
                  <div className="thermal-paper-header">
                    <div
                      className="thermal-paper-logo"
                      style={{ fontSize: thermalSettings.paperWidth === "58mm" ? 15 : 18 }}
                    >
                      {thermalSettings.headerTitle || "صالون لمسة"}
                    </div>
                    <div className="thermal-paper-tagline">أناقتك تبدأ من هنا</div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>
                      {thermalSettings.shopAddress}
                    </div>
                    <div style={{ fontSize: 9.5, color: "#666", fontFamily: "Inter" }}>
                      {thermalSettings.taxId}
                    </div>
                  </div>

                  <hr className="thermal-divider" />

                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span>رقم الفاتورة:</span>
                    <strong style={{ fontFamily: "Inter" }}>{createdInvoice?.id}</strong>
                  </div>
                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span>التاريخ والوقت:</span>
                    <span>{createdInvoice?.date} - {createdInvoice?.time}</span>
                  </div>
                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span>الكاشير المناوب:</span>
                    <span>{createdInvoice?.cashierName} (الوردية #{createdInvoice?.shiftId})</span>
                  </div>
                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span>العميل:</span>
                    <span>{createdInvoice?.customerName}</span>
                  </div>

                  <hr className="thermal-divider" />

                  {/* Items Table */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderBottom: "1px solid #666", paddingBottom: 4, marginBottom: 6 }}>
                      <span>الخدمة / الحلاق</span>
                      <span>السعر</span>
                    </div>

                    {createdInvoice?.items.map((it, idx) => (
                      <div key={idx} className="thermal-item-row">
                        <div>
                          <div style={{ fontWeight: 700 }}>{it.name} {it.qty > 1 && `(×${it.qty})`}</div>
                          <div className="thermal-barber-tag">الحلاق: {it.barber}</div>
                        </div>
                        <div style={{ fontWeight: 700, fontFamily: "Inter" }}>
                          {it.price * it.qty} ج.م
                        </div>
                      </div>
                    ))}
                  </div>

                  <hr className="thermal-divider" />

                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span>المجموع الفرعي:</span>
                    <span style={{ fontFamily: "Inter" }}>{createdInvoice?.subtotal} ج.م</span>
                  </div>

                  {(createdInvoice?.discount ?? 0) > 0 && (
                    <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 2, color: "#006600" }}>
                      <span>خصم الكوبون ({createdInvoice?.couponCode}):</span>
                      <span style={{ fontFamily: "Inter" }}>-{createdInvoice?.discount} ج.م</span>
                    </div>
                  )}

                  {(createdInvoice?.tip ?? 0) > 0 && (
                    <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span>إكرامية الحلاق:</span>
                      <span style={{ fontFamily: "Inter" }}>+{createdInvoice?.tip} ج.م</span>
                    </div>
                  )}

                  <div className="thermal-total-row">
                    <span>الإجمالي النهائي المسدد:</span>
                    <span style={{ fontFamily: "Inter" }}>{createdInvoice?.total} ج.م</span>
                  </div>

                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span>طريقة الدفع:</span>
                    <span>{createdInvoice?.paymentMethod}</span>
                  </div>

                  {/* Catalog Marketing Section if enabled */}
                  {thermalSettings.printMode === "services_and_catalog" && (
                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1.5px dashed #555",
                        background: "#F5F2EB",
                        padding: "8px 6px",
                        borderRadius: 4,
                      }}
                    >
                      <div style={{ textAlign: "center", fontWeight: 800, fontSize: 11, color: "#000", marginBottom: 3 }}>
                        ✂️ عروض صالون لمسة القادمة ✂️
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 9.5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>• باقة VIP الملكية (شعر+ذقن+بخار)</span>
                          <strong style={{ fontFamily: "Inter" }}>250 ج.م</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>• تنظيف بشرة أوزون كامل</span>
                          <strong style={{ fontFamily: "Inter" }}>120 ج.م</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>• بروتين كولاجين علاجي</span>
                          <strong style={{ fontFamily: "Inter" }}>450 ج.م</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <hr className="thermal-divider" />

                  {/* Real Authentic QR Code Generator */}
                  <div style={{ textAlign: "center", margin: "10px 0 6px" }}>
                    <QrCode
                      value={`${thermalSettings.headerTitle}|${thermalSettings.taxId}|${createdInvoice?.id}|${createdInvoice?.total}|${createdInvoice?.date}`}
                      size={thermalSettings.paperWidth === "58mm" ? 68 : 82}
                    />
                    <div style={{ fontSize: 8.5, color: "#555", marginTop: 4, fontWeight: 600 }}>
                      فاتورة إلكترونية معتمدة • مصلحة الضرائب المصرية
                    </div>
                  </div>

                  <div style={{ textAlign: "center", fontSize: 10, color: "#444", marginTop: 8 }}>
                    {thermalSettings.footerMsg || "شكراً لزيارتكم • أناقتك تبدأ من هنا"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isSuccess && (
          <div className="modal-foot">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
            >
              إلغاء والعودة
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleExecutePayment}
              style={{ minWidth: 200, fontSize: 16 }}
            >
              <Icon name="check" size={18} />
              <span>دفع وإصدار الفاتورة ({finalTotal} ج.م)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

