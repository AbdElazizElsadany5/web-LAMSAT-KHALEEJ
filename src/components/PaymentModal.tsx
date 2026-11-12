import { useState, useMemo, useEffect } from "react";
import { CartItem, PaymentMethod, Invoice } from "../types";
import { Icon } from "./Icons";
import { QrCode } from "./QrCode";
import { ThermalReceiptHeader } from "./ReceiptLogo";
import { sfx } from "../utils/audio";
import { getThermalSettings, ThermalSettings } from "../utils/thermalSettings";
import { getSalonSettings } from "../utils/salonSettings";
import { executeReceiptPrint } from "../utils/printHelper";
import { generateCustomerInvoiceQrUrl } from "../utils/qrInvoiceHelper";

const WALLET_PROVIDERS = ["فودافون كاش", "إنستاباي", "أورنج كاش", "اتصالات كاش", "وي باي"];

export function PaymentModal({
  cart,
  subtotal,
  onClose,
  onPaymentSuccess,
  activeCashier,
  shiftId = 104,
}: {
  cart: CartItem[];
  subtotal: number;
  onClose: () => void;
  onPaymentSuccess: (invoice: Invoice) => void;
  activeCashier: string;
  shiftId?: number;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("نقداً");
  const [paidCash, setPaidCash] = useState<number>(subtotal);
  const [walletProvider, setWalletProvider] = useState<string>("");
  const [walletSenderNumber, setWalletSenderNumber] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  const [tip, setTip] = useState<number>(0);

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState("");
  const [printerWarning, setPrinterWarning] = useState<string | null>(null);
  const [thermalSettings, setThermalSettings] = useState<ThermalSettings>(getThermalSettings);

  useEffect(() => {
    setThermalSettings(getThermalSettings());
  }, []);

  // Final Total
  const finalTotal = useMemo(() => {
    const raw = subtotal + (isNaN(tip) ? 0 : tip);
    return Math.max(0, isNaN(raw) ? subtotal : raw);
  }, [subtotal, tip]);

  // Update paidCash when total changes
  useEffect(() => {
    setPaidCash(finalTotal);
  }, [finalTotal]);

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
  }, [isSuccess, finalTotal, paymentMethod, paidCash, walletProvider, walletSenderNumber]);

  // Execute Payment
  const handleExecutePayment = () => {
    setPaymentError("");

    if (paymentMethod === "نقداً" && paidCash < finalTotal) {
      setPaymentError("المبلغ المدفوع نقداً أقل من الإجمالي المطلوب!");
      return;
    }

    if (paymentMethod === "محافظ إلكترونية") {
      if (!walletProvider) {
        setPaymentError("يرجى الضغط على اسم المحفظة الإلكترونية أولاً.");
        return;
      }
      if (!walletSenderNumber.trim()) {
        setPaymentError(`يرجى كتابة الرقم الذي حوّل العميل منه (${walletProvider}).`);
        return;
      }
    }

    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    const invoiceId = `INV-2026-${orderNumber}`;
    const now = new Date();

    const invoice: Invoice = {
      id: invoiceId,
      orderNumber,
      customerName: customerName.trim() || "عميل لمسة خليجي",
      customerPhone: "—",
      date: now.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }),
      time: now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      timestamp: now.getTime(),
      items: cart.map((item) => ({
        name: item.name,
        barber: item.barberName,
        price: item.price,
        qty: item.qty,
        commission: (item.price * 0.35) * item.qty,
      })),
      subtotal,
      discount: 0,
      tip,
      total: finalTotal,
      paymentMethod,
      walletProvider: paymentMethod === "محافظ إلكترونية" ? walletProvider : undefined,
      walletSenderNumber: paymentMethod === "محافظ إلكترونية" ? walletSenderNumber.trim() : undefined,
      status: "مكتملة",
      cashierName: activeCashier,
      shiftId,
      reprintCount: 0,
    };

    setCreatedInvoice(invoice);
    setIsSuccess(true);
    sfx.playCashRegister();
    onPaymentSuccess(invoice);

    // Check printer and trigger thermal print on payment completion without closing modal
    setTimeout(() => {
      void triggerThermalPrint(false);
    }, 250);
  };

  // Print Thermal Receipt (checks physical printer connection and alerts if disconnected)
  const triggerThermalPrint = async (allowDialogFallback = false) => {
    sfx.playThermalPrint();
    setIsPrinting(true);
    setPrintSuccessMsg("جارٍ فحص الطابعة والطباعة...");

    try {
      const res = await executeReceiptPrint({
        allowDialogOnVirtualPrinter: allowDialogFallback,
      });

      if (res.printedSilently) {
        setPrinterWarning(null);
        setPrintSuccessMsg(res.message);
      } else if (res.usedDialog) {
        setPrintSuccessMsg(res.message);
      } else {
        // No thermal printer connected
        setPrinterWarning(res.message || "تنبيه: لا توجد طابعة إيصالات حرارية متصلة بالجهاز حالياً!");
        setPrintSuccessMsg("");
      }
    } catch {
      setPrinterWarning("تنبيه: تعذر الاتصال بالطابعة الحرارية — تأكد من تشغيلها وتوصيل الكابل.");
      setPrintSuccessMsg("");
    } finally {
      setIsPrinting(false);
    }
  };

  // Keyboard shortcut to start a new order when invoice is on screen
  useEffect(() => {
    if (!isSuccess) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSuccess, onClose]);

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
          <button
            type="button"
            onClick={onClose}
            title="إغلاق والرجوع لشاشة الكاشير (Esc)"
            style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {!isSuccess ? (
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
              {/* Left Column: Form, Payment Methods */}
              <div>
                {/* Customer Details */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
                    اسم العميل (اختياري):
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="اسم العميل (أو اتركه فارغاً: عميل لمسة خليجي)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                {/* Payment Method Selector */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>
                    طريقة السداد:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {(["نقداً", "محافظ إلكترونية"] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m);
                          setPaymentError("");
                        }}
                        style={{
                          height: 52,
                          borderRadius: 12,
                          background: paymentMethod === m ? "var(--gold-soft)" : "var(--surface-2)",
                          border: `1.5px solid ${paymentMethod === m ? "var(--gold)" : "var(--border)"}`,
                          color: paymentMethod === m ? "var(--light-gold)" : "var(--text-secondary)",
                          fontSize: 14,
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          cursor: "pointer",
                          transition: "all 0.16s",
                        }}
                      >
                        <Icon name={m === "نقداً" ? "cash" : "wallet"} size={18} />
                        <span>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Payment Method Inputs */}
                {paymentMethod === "نقداً" && (
                  <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                      المبلغ المستلم نقداً من العميل:
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <input
                        type="number"
                        className="form-input"
                        value={paidCash}
                        onChange={(e) => {
                          setPaidCash(Number(e.target.value));
                          if (paymentError) setPaymentError("");
                        }}
                        style={{ fontSize: 18, fontWeight: 700, color: "var(--light-gold)" }}
                      />
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setPaidCash(finalTotal)}
                        style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        المبلغ بالضبط
                      </button>
                    </div>

                    {/* Quick Tender Presets */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {[50, 100, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className="secondary-btn"
                          style={{ height: 32, padding: "0 12px", fontSize: 12, whiteSpace: "nowrap" }}
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
                        borderTop: "1px dashed var(--border-strong)",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>المتبقي للعميل (الباقي):</span>
                      <span
                        style={{
                          fontSize: 18,
                          color: changeAmount > 0 ? "var(--success-text)" : "var(--text-secondary)",
                          fontFamily: "Inter",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {changeAmount} ج.م
                      </span>
                    </div>
                  </div>
                )}

                {paymentMethod === "محافظ إلكترونية" && (
                  <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: 12, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                      اختر اسم المحفظة الإلكترونية:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {WALLET_PROVIDERS.map((w) => {
                        const isSelected = walletProvider === w;
                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => {
                              setWalletProvider(w);
                              setPaymentError("");
                            }}
                            style={{
                              height: 38,
                              padding: "0 14px",
                              borderRadius: 10,
                              border: `1.5px solid ${isSelected ? "var(--gold)" : "var(--border)"}`,
                              background: isSelected ? "var(--gold)" : "var(--surface-soft)",
                              color: isSelected ? "#111" : "var(--text)",
                              fontSize: 13,
                              fontWeight: 800,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              transition: "all 0.15s",
                            }}
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>

                    {walletProvider && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border-strong)" }}>
                        <label
                          htmlFor="wallet-sender-input"
                          style={{ fontSize: 12.5, fontWeight: 700, color: "var(--light-gold)", display: "block", marginBottom: 6 }}
                        >
                          اكتب الرقم اللي العميل حوّل منه ({walletProvider}):
                        </label>
                        <input
                          id="wallet-sender-input"
                          type="text"
                          className="form-input"
                          placeholder={walletProvider === "إنستاباي" ? "رقم الموبايل أو عنوان IPA (مثال: 010xxxxxxxx)" : "اكتب رقم الموبايل المُحوَّل منه..."}
                          value={walletSenderNumber}
                          onChange={(e) => {
                            setWalletSenderNumber(e.target.value);
                            if (paymentError) setPaymentError("");
                          }}
                          autoFocus
                          style={{ fontFamily: "Inter, Cairo", fontSize: 14, fontWeight: 700 }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {paymentError && (
                  <div
                    style={{
                      marginTop: 12,
                      background: "var(--danger-soft)",
                      border: "1px solid var(--danger-border)",
                      color: "var(--danger-text)",
                      padding: "9px 12px",
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    {paymentError}
                  </div>
                )}

                {/* Barber Tip Field */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>
                    إكرامية الحلاق (اختياري):
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[0, 10, 20, 50].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTip(t)}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 8,
                          background: tip === t ? "var(--gold)" : "var(--card-hover)",
                          color: tip === t ? "#111" : "var(--text-secondary)",
                          border: `1px solid ${tip === t ? "var(--gold)" : "var(--border)"}`,
                          fontWeight: 700,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                          cursor: "pointer",
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
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
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
                      color: "var(--text)",
                      paddingBottom: 10,
                      borderBottom: "1px solid var(--border)",
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
                          borderBottom: "1px dashed var(--border-strong)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text)" }}>
                            {item.name} {item.qty > 1 && `(×${item.qty})`}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            الحلاق: <span style={{ color: "var(--gold)" }}>{item.barberName}</span>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: "var(--light-gold)", fontFamily: "Inter" }}>
                          {item.price * item.qty} ج.م
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
                    <span>المجموع الفرعي:</span>
                    <span className="num">{subtotal} ج.م</span>
                  </div>

                  {tip > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--warning-text)", marginBottom: 6 }}>
                      <span>إكرامية الحلاق:</span>
                      <span className="num">+{tip} ج.م</span>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 10,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border-strong)",
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap" }}>المبلغ الإجمالي المطلوب:</span>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "var(--light-gold)", fontFamily: "Inter", whiteSpace: "nowrap" }}>
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
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--success-text)" }}>
                      تم الدفع وإصدار الفاتورة بنجاح!
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                      رقم الفاتورة: <strong style={{ color: "var(--text)", fontFamily: "Inter" }}>{createdInvoice?.id}</strong> • طريقة الدفع:{" "}
                      {createdInvoice?.walletProvider
                        ? `${createdInvoice.paymentMethod} (${createdInvoice.walletProvider})`
                        : createdInvoice?.paymentMethod}
                      {createdInvoice?.walletSenderNumber && (
                        <> • محوّل من: <strong style={{ fontFamily: "Inter", color: "var(--text)" }}>{createdInvoice.walletSenderNumber}</strong></>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => void triggerThermalPrint(true)}
                    disabled={isPrinting}
                  >
                    <Icon name="printer" size={17} />
                    <span>{isPrinting ? "جارٍ الطباعة..." : "إعادة طباعة الإيصال"}</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={onClose}
                    style={{ background: "var(--gold-soft)", borderColor: "var(--border-gold)", color: "var(--light-gold)", fontWeight: 800 }}
                  >
                    <Icon name="plus" size={16} />
                    <span>بدء أوردر جديد (F2)</span>
                  </button>
                </div>
              </div>

              {/* Warning Banner if Thermal Printer is Disconnected */}
              {printerWarning && (
                <div
                  style={{
                    background: "rgba(231, 76, 60, 0.12)",
                    border: "1.5px solid rgba(231, 76, 60, 0.35)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(231, 76, 60, 0.2)",
                        color: "#ff6b6b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="alertCircle" size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 900, color: "#ff6b6b" }}>
                        {printerWarning}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        يمكنك مراجعة وتدقيق بيانات الفاتورة الموضحة أدناه. لن يتم إغلاق هذه الشاشة حتى تقوم بتوصيل الطابعة وإعادة المحاولة، أو الضغط على «بدء أوردر جديد».
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => void triggerThermalPrint(true)}
                      disabled={isPrinting}
                      style={{ height: 36, padding: "0 14px", fontSize: 12.5, gap: 6 }}
                    >
                      <Icon name="printer" size={15} />
                      <span>{isPrinting ? "جارٍ المحاولة..." : "إعادة محاولة الطباعة"}</span>
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={onClose}
                      style={{ height: 36, padding: "0 14px", fontSize: 12.5, gap: 6 }}
                    >
                      <Icon name="plus" size={14} />
                      <span>بدء أوردر جديد (F2)</span>
                    </button>
                  </div>
                </div>
              )}

              {printSuccessMsg && !printerWarning && (
                <div
                  style={{
                    background: "rgba(63, 185, 80, 0.12)",
                    border: "1px solid rgba(63, 185, 80, 0.3)",
                    color: "var(--success-text)",
                    padding: "10px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 16,
                    textAlign: "center",
                  }}
                >
                  {printSuccessMsg}
                </div>
              )}

              {/* Thermal Receipt Slip Simulator */}
              <div style={{ display: "flex", justifyContent: "center", paddingBottom: 12 }}>
                <div
                  className={`thermal-paper ${thermalSettings.paperWidth === "58mm" ? "narrow" : ""}`}
                  style={{
                    width: thermalSettings.paperWidth === "58mm" ? 216 : 308,
                    padding: thermalSettings.paperWidth === "58mm" ? "16px 12px 20px" : "22px 18px 26px",
                    fontSize: thermalSettings.paperWidth === "58mm" ? 10.5 : 12,
                    border: "1px solid #DFD9C9",
                    borderRadius: 6,
                  }}
                >
                  <ThermalReceiptHeader
                    title={thermalSettings.headerTitle || "لمسة خليجي"}
                    address={thermalSettings.shopAddress}
                    phone={getSalonSettings().phone}
                    taxId={thermalSettings.taxId}
                    isNarrow={thermalSettings.paperWidth === "58mm"}
                  />

                  <div
                    style={{
                      background: "#F5F2EA",
                      border: "1px solid #E3DEC9",
                      borderRadius: 6,
                      padding: "7px 9px",
                      marginBottom: 10,
                      fontSize: 11,
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>رقم الفاتورة:</span>
                      <strong style={{ fontFamily: "Inter", color: "#000" }}>{createdInvoice?.id}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>التاريخ والوقت:</span>
                      <span style={{ color: "#1A1A1A" }}>{createdInvoice?.date} - {createdInvoice?.time}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>مسؤول الوردية:</span>
                      <span style={{ color: "#1A1A1A" }}>{createdInvoice?.cashierName} (#{createdInvoice?.shiftId})</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#555" }}>العميل:</span>
                      <span style={{ fontWeight: 700, color: "#000" }}>{createdInvoice?.customerName}</span>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 800,
                        borderTop: "1px dashed #666",
                        borderBottom: "1.5px solid #1A1A1A",
                        padding: "5px 0",
                        marginBottom: 7,
                        fontSize: 11.5,
                      }}
                    >
                      <span>الخدمة / الحلاق</span>
                      <span>السعر</span>
                    </div>

                    {createdInvoice?.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="thermal-item-row"
                        style={{
                          paddingBottom: 6,
                          marginBottom: 6,
                          borderBottom: idx < (createdInvoice.items.length - 1) ? "1px dotted #C8C2B4" : "none",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: "#000" }}>
                            {it.name} {it.qty > 1 && `(×${it.qty})`}
                          </div>
                          <div className="thermal-barber-tag" style={{ marginRight: 0, marginTop: 1 }}>
                            الحلاق: {it.barber}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontFamily: "Inter", color: "#000", whiteSpace: "nowrap" }}>
                          {it.price * it.qty} ج.م
                        </div>
                      </div>
                    ))}
                  </div>

                  <hr className="thermal-divider" />

                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#444" }}>المجموع الفرعي:</span>
                    <span style={{ fontFamily: "Inter", fontWeight: 700 }}>{createdInvoice?.subtotal} ج.م</span>
                  </div>

                  {(createdInvoice?.discount ?? 0) > 0 && (
                    <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3, color: "#006600" }}>
                      <span>خصم الكوبون ({createdInvoice?.couponCode}):</span>
                      <span style={{ fontFamily: "Inter", fontWeight: 700 }}>-{createdInvoice?.discount} ج.م</span>
                    </div>
                  )}

                  {(createdInvoice?.tip ?? 0) > 0 && (
                    <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ color: "#444" }}>إكرامية الحلاق:</span>
                      <span style={{ fontFamily: "Inter", fontWeight: 700 }}>+{createdInvoice?.tip} ج.م</span>
                    </div>
                  )}

                  <div
                    className="thermal-total-row"
                    style={{
                      background: "#F5F2EA",
                      border: "1.5px solid #1A1A1A",
                      borderRadius: 6,
                      padding: "7px 9px",
                      marginTop: 7,
                      fontSize: thermalSettings.paperWidth === "58mm" ? 13 : 15,
                    }}
                  >
                    <span>الإجمالي النهائي المسدد:</span>
                    <span style={{ fontFamily: "Inter" }}>{createdInvoice?.total} ج.م</span>
                  </div>

                  <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ color: "#444" }}>طريقة الدفع:</span>
                    <strong style={{ color: "#000" }}>
                      {createdInvoice?.walletProvider
                        ? `${createdInvoice.paymentMethod} (${createdInvoice.walletProvider})`
                        : createdInvoice?.paymentMethod}
                    </strong>
                  </div>
                  {createdInvoice?.walletSenderNumber && (
                    <div style={{ fontSize: 10.5, display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ color: "#444" }}>الرقم المُحوَّل منه:</span>
                      <strong style={{ color: "#000", fontFamily: "Inter" }}>{createdInvoice.walletSenderNumber}</strong>
                    </div>
                  )}

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
                        عروض لمسة خليجي القادمة
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

                  {/* Real Authentic QR Code Generator (Scan to View Invoice & Services Menu) */}
                  {(() => {
                    const invoiceForQr = createdInvoice || {
                      id: `INV-${Date.now().toString().slice(-4)}`,
                      total: finalTotal,
                      subtotal,
                      customerName: customerName || "عميل الصالون",
                      customerPhone: customerPhone || "",
                      paymentMethod,
                      items: cart.map((it, idx) => ({
                        id: idx + 1,
                        name: it.service.name,
                        price: it.service.price,
                        barber: it.barber.name,
                        category: it.service.category,
                      })),
                      date: new Date().toLocaleDateString("ar-EG"),
                      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
                    };
                    const qrUrl = generateCustomerInvoiceQrUrl(invoiceForQr);
                    return (
                      <div style={{ textAlign: "center", margin: "10px 0 8px" }}>
                        <QrCode
                          value={qrUrl}
                          size={135}
                        />
                        <div style={{ fontSize: 9.5, color: "#111", marginTop: 6, fontWeight: 800 }}>
                          امسح الكود بكاميرا الموبايل لعرض فاتورتك وقائمة خدمات الصالون
                        </div>
                        <a
                          href={qrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="no-print"
                          style={{
                            fontSize: 9.5,
                            color: "#6A5726",
                            textDecoration: "underline",
                            display: "inline-block",
                            marginTop: 3,
                            cursor: "pointer",
                          }}
                        >
                          [ تجربة ومعاينة صفحة الفاتورة الآن ]
                        </a>
                      </div>
                    );
                  })()}

                  <div style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "#222", marginTop: 6 }}>
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

