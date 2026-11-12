import { useState, useMemo, useEffect, useRef } from "react";
import {
  ServiceItem,
  Barber,
  CartItem,
  HeldOrder,
  ServiceCategory,
  AdvanceRecord,
  CashOutCategory,
  CashOutPayload,
} from "../types";
import { Icon } from "./Icons";
import { sfx } from "../utils/audio";
import { executeReceiptPrint } from "../utils/printHelper";
import { getThermalSettings } from "../utils/thermalSettings";

export function PosPage({
  services,
  barbers,
  onCheckout,
  activeCashier,
  shiftNumber: _shiftNumber = 104,
  onAddAdvance,
  onCashOut,
  drawerCash = 0,
  heldOrders: propHeldOrders,
  onHeldOrdersChange,
  openPendingSignal = 0,
  openAdvanceSignal = 0,
  openCashOutSignal = 0,
  clearCartSignal = 0,
  isIsolated = false,
  onToggleIsolated,
}: {
  services: ServiceItem[];
  barbers: Barber[];
  onCheckout: (cart: CartItem[], total: number) => void;
  activeCashier: string;
  shiftNumber?: number;
  onAddAdvance?: (advance: AdvanceRecord) => void;
  onCashOut?: (payload: CashOutPayload) => Promise<{ ok: boolean; message?: string }>;
  drawerCash?: number;
  heldOrders?: HeldOrder[];
  onHeldOrdersChange?: (next: HeldOrder[]) => void;
  openPendingSignal?: number;
  openAdvanceSignal?: number;
  openCashOutSignal?: number;
  clearCartSignal?: number;
  isIsolated?: boolean;
  onToggleIsolated?: () => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Clear cart whenever payment succeeds
  useEffect(() => {
    if (clearCartSignal) {
      setCart([]);
    }
  }, [clearCartSignal]);

  const [localHeldOrders, setLocalHeldOrders] = useState<HeldOrder[]>([
    {
      id: "HOLD-01",
      holdTime: "05:12 م",
      customerNote: "العميل في الصالة ينتظر صديقه",
      subtotal: 200,
      items: [
        {
          serviceId: 1,
          name: "قص شعر كلاسيك فاخر",
          category: "قص الشعر",
          price: 100,
          duration: 30,
          qty: 2,
          barberId: "b2",
          barberName: "أحمد فتحي",
        },
      ],
    },
  ]);
  const heldOrders = propHeldOrders ?? localHeldOrders;
  const setHeldOrders = (next: HeldOrder[]) => {
    if (onHeldOrdersChange) onHeldOrdersChange(next);
    else setLocalHeldOrders(next);
  };

  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const [notification, setNotification] = useState("");

  // Cash Out Modal State (خروج نقدية من الدرج)
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [cashOutCategory, setCashOutCategory] = useState<CashOutCategory>("سلفة موظف");
  const [cashOutBarberId, setCashOutBarberId] = useState(barbers[0]?.id || "");
  const [cashOutRecipient, setCashOutRecipient] = useState(barbers[0]?.name || "");
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [cashOutReason, setCashOutReason] = useState("");
  const [cashOutNotes, setCashOutNotes] = useState("");
  const [cashOutShouldPrint, setCashOutShouldPrint] = useState(true);
  const [isSubmittingCashOut, setIsSubmittingCashOut] = useState(false);
  const [cashOutSlipData, setCashOutSlipData] = useState<{
    voucherId: string;
    amount: number;
    category: CashOutCategory;
    recipient: string;
    reason: string;
    notes?: string;
    date: string;
    time: string;
    cashier: string;
    shiftNumber: number;
  } | null>(null);

  const thermalSettings = getThermalSettings();

  const lastPendingSignalRef = useRef(openPendingSignal);
  useEffect(() => {
    if (openPendingSignal > lastPendingSignalRef.current) {
      setShowPendingModal(true);
    }
    lastPendingSignalRef.current = openPendingSignal;
  }, [openPendingSignal]);

  const lastAdvanceSignalRef = useRef(openAdvanceSignal);
  useEffect(() => {
    if (openAdvanceSignal > lastAdvanceSignalRef.current) {
      setCashOutCategory("سلفة موظف");
      setCashOutBarberId(barbers[0]?.id || "");
      setCashOutRecipient(barbers[0]?.name || "");
      setCashOutAmount("");
      setCashOutReason("");
      setCashOutNotes("");
      setShowCashOutModal(true);
    }
    lastAdvanceSignalRef.current = openAdvanceSignal;
  }, [openAdvanceSignal, barbers]);

  const lastCashOutSignalRef = useRef(openCashOutSignal);
  useEffect(() => {
    if (openCashOutSignal > lastCashOutSignalRef.current) {
      setShowCashOutModal(true);
    }
    lastCashOutSignalRef.current = openCashOutSignal;
  }, [openCashOutSignal]);

  const handleConfirmCashOut = async () => {
    const numAmount = Number(cashOutAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("الرجاء إدخال مبلغ صحيح للصرف");
      return;
    }

    if (!cashOutReason.trim()) {
      showToast("الرجاء كتابة سبب وخروج النقدية بالتفصيل");
      return;
    }

    const finalRecipient =
      cashOutCategory === "سلفة موظف"
        ? (barbers.find((b) => b.id === cashOutBarberId)?.name || cashOutRecipient || "موظف")
        : (cashOutRecipient.trim() || "غير محدد");

    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const voucherId = `VCH-OUT-${Date.now().toString().slice(-6)}`;

    const slip = {
      voucherId,
      amount: numAmount,
      category: cashOutCategory,
      recipient: finalRecipient,
      reason: cashOutReason.trim(),
      notes: cashOutNotes.trim(),
      date: dateStr,
      time: timeStr,
      cashier: activeCashier,
      shiftNumber: _shiftNumber,
    };
    setCashOutSlipData(slip);
    setIsSubmittingCashOut(true);

    try {
      if (onCashOut) {
        await onCashOut({
          amount: numAmount,
          category: cashOutCategory,
          recipient: finalRecipient,
          reason: cashOutReason.trim(),
          notes: cashOutNotes.trim(),
          barberId: cashOutCategory === "سلفة موظف" ? cashOutBarberId : undefined,
          shouldPrint: cashOutShouldPrint,
        });
      } else if (cashOutCategory === "سلفة موظف" && onAddAdvance) {
        onAddAdvance({
          id: `ADV-${Date.now()}`,
          barberId: cashOutBarberId,
          barberName: finalRecipient,
          amount: numAmount,
          reason: cashOutReason.trim(),
          date: dateStr,
          time: timeStr,
          registeredBy: activeCashier,
          registeredByRole: "cashier",
          status: "نشط",
          notes: cashOutNotes.trim() ? `كاشير: ${cashOutNotes.trim()}` : "سلفة مسجلة من طرفية الكاشير",
        });
      }

      sfx.playCashRegister();
      showToast(`تم بنجاح صرف ${numAmount.toLocaleString("ar-EG")} ج.م من الدرج (${cashOutCategory})`);

      if (cashOutShouldPrint) {
        setTimeout(async () => {
          const res = await executeReceiptPrint({ allowDialogOnVirtualPrinter: true });
          showToast(res.message);
        }, 150);
      }

      setShowCashOutModal(false);
      setCashOutAmount("");
      setCashOutReason("");
      setCashOutNotes("");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تسجيل خروج النقدية");
    } finally {
      setIsSubmittingCashOut(false);
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live time ticker
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setCurrentDate(
        now.toLocaleDateString("ar-SA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0) {
          handleConfirmCheckout();
        }
      } else if (e.key === "F3") {
        e.preventDefault();
        if (cart.length > 0) {
          setShowHoldModal(true);
        }
      } else if (e.key === "F4") {
        e.preventDefault();
        setShowPendingModal(true);
      } else if (e.key === "F5") {
        e.preventDefault();
        if (cart.length > 0) {
          setShowClearConfirm(true);
        }
      } else if (e.key === "Escape") {
        setShowPendingModal(false);
        setShowClearConfirm(false);
        setShowHoldModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3500);
  };

  const categories: ServiceCategory[] = [
    "الكل",
    "قص الشعر",
    "الذقن",
    "التسريحات",
    "العناية بالبشرة",
    "الباقات",
    "خدمات أخرى",
  ];

  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchCat = selectedCategory === "الكل" || srv.category === selectedCategory;
      const matchSearch =
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (srv.description && srv.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  // Present barbers only (Available, Busy, or on Break - Excludes absent)
  const presentBarbers = useMemo(() => {
    const list = barbers.filter(
      (b) => b.status === "متاح" || b.status === "مشغول" || b.status === "في استراحة"
    );
    return list.length > 0 ? list : barbers;
  }, [barbers]);

  // First available barber among present staff
  const defaultBarber = useMemo(() => {
    const available = presentBarbers.find((b) => b.status === "متاح");
    return available || presentBarbers[0] || barbers[0];
  }, [presentBarbers, barbers]);

  // Add Service to Cart (Once per service - barbershop has no duplicate quantities)
  const handleAddService = (srv: ServiceItem) => {
    const isAlreadyInCart = cart.some((item) => item.serviceId === srv.id);
    if (isAlreadyInCart) {
      showToast(`«${srv.name}» مضافة بالفعل في السلة`);
      return;
    }
    sfx.playClick();
    setCart((prev) => [
      ...prev,
      {
        serviceId: srv.id,
        name: srv.name,
        category: srv.category,
        price: srv.price,
        duration: srv.duration,
        qty: 1,
        barberId: defaultBarber.id,
        barberName: defaultBarber.name,
      },
    ]);
  };

  // Adjust Qty
  const handleQtyChange = (serviceId: number, delta: number) => {
    sfx.playClick();
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.serviceId === serviceId) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Change Barber for individual item
  const handleBarberChange = (serviceId: number, barberId: string) => {
    sfx.playClick();
    const selectedBarber = barbers.find((b) => b.id === barberId);
    if (!selectedBarber) return;
    setCart((prev) =>
      prev.map((item) =>
        item.serviceId === serviceId
          ? { ...item, barberId: selectedBarber.id, barberName: selectedBarber.name }
          : item,
      ),
    );
  };

  // Remove Item
  const handleRemoveItem = (serviceId: number) => {
    sfx.playAlert();
    setCart((prev) => prev.filter((item) => item.serviceId !== serviceId));
  };

  // Cart Totals
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  }, [cart]);

  const totalDuration = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.duration * item.qty, 0);
  }, [cart]);

  // Confirm Checkout
  const handleConfirmCheckout = () => {
    if (cart.length === 0) return;
    onCheckout(cart, subtotal);
  };

  // Hold Order
  const handleSaveHoldOrder = () => {
    if (cart.length === 0) return;
    const newHold: HeldOrder = {
      id: `HOLD-0${heldOrders.length + 1}`,
      holdTime: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
      customerNote: holdNote.trim() || "طلب معلق بدون ملاحظة",
      subtotal,
      items: [...cart],
    };
    setHeldOrders([newHold, ...heldOrders]);
    setCart([]);
    setHoldNote("");
    setShowHoldModal(false);
    showToast(`تم تعليق الطلب (${newHold.id}) بنجاح`);
  };

  // Resume Held Order
  const handleResumeHeldOrder = (held: HeldOrder) => {
    setCart(held.items);
    setHeldOrders(heldOrders.filter((h) => h.id !== held.id));
    setShowPendingModal(false);
    showToast(`تم استرجاع الطلب المعلق (${held.id}) إلى السلة`);
  };

  // Delete Held Order
  const handleDeleteHeldOrder = (heldId: string) => {
    setHeldOrders(heldOrders.filter((h) => h.id !== heldId));
    showToast(`تم حذف الطلب المعلق (${heldId})`);
  };

  // Fullscreen / POS Focus Mode Toggle
  const handleToggleFocusMode = () => {
    onToggleIsolated?.();
    try {
      if (!isIsolated) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {}
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        handleToggleFocusMode();
      } else if (e.key === "F7") {
        e.preventDefault();
        setShowCashOutModal(true);
      } else if (e.key === "Escape" && isIsolated) {
        e.preventDefault();
        onToggleIsolated?.();
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isIsolated]);

  return (
    <div>
      {/* Top Header Bar: Actions + Cash Out + Drawer Balance + Clock */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "6px 14px",
          background: isIsolated ? "rgba(212,175,55,0.08)" : "var(--surface-soft)",
          border: isIsolated ? "1px solid var(--border-gold)" : "1px solid var(--border-subtle)",
          borderRadius: 10,
          marginBottom: 12,
          whiteSpace: "nowrap",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleToggleFocusMode}
            title={isIsolated ? "الخروج من وضع الشاشة الكاملة المعزولة (Esc أو F11)" : "تكبير الشاشة وعزل شاشة الكاشير عن القائمة (F11)"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 12px",
              borderRadius: 8,
              border: isIsolated ? "1px solid var(--gold)" : "1px solid var(--border)",
              background: isIsolated ? "var(--gold-soft)" : "var(--surface-2)",
              color: isIsolated ? "var(--light-gold)" : "var(--text)",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            <Icon name={isIsolated ? "minimize" : "maximize"} size={13} />
            <span>{isIsolated ? "إلغاء العزل (Esc)" : "عزل الكاشير (F11)"}</span>
          </button>

          {/* Dedicated Cash Out Button Requested by User */}
          <button
            type="button"
            onClick={() => {
              setCashOutCategory("سلفة موظف");
              setCashOutBarberId(barbers[0]?.id || "");
              setCashOutRecipient(barbers[0]?.name || "");
              setCashOutAmount("");
              setCashOutReason("");
              setCashOutNotes("");
              setShowCashOutModal(true);
            }}
            title="خروج وصرف نقدية من الدرج (سلفة، مصاريف ونثريات، مسحوبات) - اضغط F7"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: 8,
              border: "1px solid rgba(229, 72, 77, 0.45)",
              background: "rgba(229, 72, 77, 0.12)",
              color: "var(--danger-text)",
              fontSize: 12.5,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            <Icon name="dollarSign" size={14} />
            <span>خروج نقدية من الدرج (F7)</span>
          </button>

          {/* Current Drawer Balance Indicator */}
          {drawerCash !== undefined && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 8,
                background: "var(--gold-soft)",
                border: "1px solid var(--border-gold)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--light-gold)",
              }}
              title="رصيد الكاش المتواجد حالياً داخل درج الكاشير"
            >
              <span>درج الكاشير:</span>
              <strong style={{ fontFamily: "Inter, Cairo" }}>{drawerCash.toLocaleString("ar-EG")} ج.م</strong>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="clock" size={13} style={{ color: "var(--gold)" }} />
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{currentDate}</span>
          <span style={{ color: "var(--border-strong)" }}>•</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: "var(--light-gold)",
              fontFamily: "Inter, Cairo",
              fontVariantNumeric: "tabular-nums",
              direction: "ltr",
            }}
          >
            {currentTime}
          </span>
        </div>
      </div>

      {/* POS Two-Column Grid */}
      <div className="pos-layout">
        {/* Left Area: Categories, Search, Services Grid */}
        <div className="pos-left">
          {/* Category Tabs */}
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-btn ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Quick Search Bar (F1) */}
          <div className="search-bar-wrap">
            <span className="search-icon">
              <Icon name="search" size={18} />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم الخدمة أو الباقة... (اضغط F1 للتركيز)"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: 0,
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>

          {/* Services Grid */}
          <div className="services-grid">
            {filteredServices.map((srv) => {
              const isSelected = cart.some((c) => c.serviceId === srv.id);
              return (
                <div
                  key={srv.id}
                  className="service-card"
                  onClick={() => handleAddService(srv)}
                  role="button"
                  tabIndex={0}
                  style={
                    isSelected
                      ? {
                          borderColor: "var(--gold)",
                          background: "var(--gold-soft)",
                          boxShadow: "0 0 10px rgba(212, 175, 55, 0.2)",
                        }
                      : undefined
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleAddService(srv);
                    }
                  }}
                >
                  <div>
                    <div className="service-card-top">
                      <span className="service-badge-cat">{srv.category}</span>
                      <span className="service-duration">
                        <Icon name="clock" size={12} />
                        <span>{srv.duration} د</span>
                      </span>
                    </div>
                    <div className="service-card-title">{srv.name}</div>
                    {srv.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginBottom: 10,
                          lineHeight: 1.4,
                        }}
                      >
                        {srv.description}
                      </div>
                    )}
                  </div>

                  <div className="service-card-bottom">
                    <div className="service-price">
                      {srv.price}
                      <small>ج.م</small>
                    </div>
                    <div
                      className="service-add-icon"
                      style={
                        isSelected
                          ? {
                              background: "var(--success-soft)",
                              borderColor: "var(--success-border)",
                              color: "var(--success-text)",
                            }
                          : undefined
                      }
                      title={isSelected ? "الخدمة مضافة في السلة" : "إضافة إلى السلة"}
                    >
                      <Icon name={isSelected ? "check" : "plus"} size={16} />
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredServices.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "50px 20px",
                  textAlign: "center",
                  background: "var(--card)",
                  borderRadius: 14,
                  border: "1px dashed var(--border-strong)",
                  color: "var(--muted)",
                }}
              >
                <Icon name="scissors" size={36} style={{ color: "var(--subtle)", marginBottom: 10 } as React.CSSProperties} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>
                  لا توجد خدمات مطابقة للبحث
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  جرّب تصنيفاً مختلفاً أو امسح عبارة البحث
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Order Summary / Cart */}
        <div className="pos-cart">
          <div className="cart-header">
            <div>
              <h2>سلة الطلب الحالي</h2>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {cart.length > 0 ? `${cart.length} خدمات مختارة • تقدير ${totalDuration} دقيقة` : "السلة فارغة"}
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="danger-ghost"
                title="مسح السلة (F5)"
              >
                <Icon name="trash" size={14} />
                <span>مسح</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="cart-items-list">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <Icon name="receipt" size={42} style={{ color: "var(--subtle)", marginBottom: 12 } as React.CSSProperties} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--muted)" }}>لم يتم اختيار خدمات بعد</div>
                <div style={{ fontSize: 13, color: "var(--subtle)", marginTop: 4 }}>
                  انقر على أي بطاقة خدمة من القائمة لإضافتها إلى الفاتورة
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const assignedBarber = barbers.find((b) => b.id === item.barberId);
                const barberStatus = assignedBarber?.status || "متاح";

                return (
                  <div key={item.serviceId} className="cart-item-row">
                    <div className="cart-item-header">
                      <div>
                        <div className="cart-item-name">{item.name}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Icon name="clock" size={11} />
                          <span>{item.duration} دقيقة</span>
                        </div>
                      </div>
                      <div className="cart-item-price">
                        {item.price}
                        <small style={{ fontSize: 11, marginRight: 2 }}>ج.م</small>
                      </div>
                    </div>

                    {/* Dedicated Barber Selector for EACH service */}
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--muted)",
                          marginBottom: 4,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>الحلاق المخصص للخدمة:</span>
                        <span
                          style={{
                            fontSize: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color:
                              barberStatus === "متاح"
                                ? "var(--success-text)"
                                : barberStatus === "مشغول"
                                  ? "var(--warning-text)"
                                  : "var(--muted)",
                          }}
                        >
                          <i
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background:
                                barberStatus === "متاح"
                                  ? "var(--success-text)"
                                  : barberStatus === "مشغول"
                                    ? "var(--warning-text)"
                                    : "var(--muted)",
                            }}
                          />
                          {barberStatus}
                        </span>
                      </div>
                      <div className="cart-barber-select-wrap">
                        <select
                          className="barber-select"
                          value={item.barberId}
                          onChange={(e) => handleBarberChange(item.serviceId, e.target.value)}
                        >
                          {presentBarbers.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.status})
                            </option>
                          ))}
                          {!presentBarbers.some((b) => b.id === item.barberId) && (
                            <option value={item.barberId}>{item.barberName} (غير حاضر)</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Remove Item Button */}
                    <div className="cart-item-bottom" style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.serviceId)}
                        style={{
                          background: "var(--danger-soft)",
                          border: "1px solid var(--danger-border)",
                          color: "var(--danger-text)",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 12px",
                          borderRadius: 8,
                        }}
                        title="حذف هذه الخدمة من السلة"
                      >
                        <Icon name="trash" size={13} />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Financial Totals */}
          <div className="cart-totals">
            <div className="totals-row">
              <span>المجموع الفرعي:</span>
              <span className="num" style={{ fontWeight: 700 }}>
                {subtotal} ج.م
              </span>
            </div>
            <div className="totals-row">
              <span>الضريبة المضافة (شاملة):</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>مشمولة في الأسعار</span>
            </div>
            <div className="totals-row grand-total-row">
              <span style={{ fontSize: 16, fontWeight: 800 }}>الإجمالي النهائي:</span>
              <div className="grand-total-val">
                {subtotal}
                <small>ج.م</small>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="cart-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleConfirmCheckout}
              disabled={cart.length === 0}
              style={{ height: 48, fontSize: 16 }}
            >
              <span>تأكيد الطلب والانتقال للدفع</span>
              <kbd style={{ background: "rgba(0,0,0,0.15)", color: "#111", borderColor: "rgba(0,0,0,0.25)" }}>
                F2
              </kbd>
            </button>

            <div className="cart-secondary-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowHoldModal(true)}
                disabled={cart.length === 0}
              >
                <Icon name="pause" size={15} />
                <span>تعليق الطلب</span>
                <kbd>F3</kbd>
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowClearConfirm(true)}
                disabled={cart.length === 0}
                style={{ color: "var(--danger-text)", borderColor: "var(--danger-border)" }}
              >
                <Icon name="trash" size={15} />
                <span>إلغاء السلة</span>
                <kbd>F5</kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Hold Order Note */}
      {showHoldModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h2>تعليق الطلب الحالي</h2>
              <button
                type="button"
                onClick={() => setShowHoldModal(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 14 }}>
                سيتم حفظ الخدمات الحالية في قائمة الطلبات المعلقة ويمكن استعادتها في أي وقت.
              </p>
              <div className="form-group">
                <label className="form-label">ملاحظة الطلب أو اسم الزبون (اختياري):</label>
                <input
                  type="text"
                  className="form-input"
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                  placeholder="مثال: العميل في صالة الانتظار / بانتظار دور الحلاق محمود"
                  autoFocus
                />
              </div>
              <div
                style={{
                  background: "var(--surface-2)",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                <div>إجمالي المبلغ المعلق: <strong style={{ color: "var(--light-gold)" }}>{subtotal} ج.م</strong></div>
                <div>عدد الخدمات: <strong>{cart.length}</strong></div>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowHoldModal(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveHoldOrder}
              >
                تأكيد تعليق الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Clear Cart Confirmation */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h2 style={{ color: "var(--danger-text)" }}>تأكيد إلغاء ومسح السلة</h2>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.5 }}>
                هل أنت متأكد من رغبتك في إفراغ سلة الطلب الحالية بالكامل؟ لن يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowClearConfirm(false)}
              >
                تراجع
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  setCart([]);
                  setShowClearConfirm(false);
                  showToast("تم إفراغ سلة الطلب");
                }}
              >
                نعم، مسح السلة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Pending / Held Orders List (F4) */}
      {showPendingModal && (
        <div className="modal-overlay">
          <div className="modal-box wide">
            <div className="modal-head">
              <div>
                <h2>قائمة الطلبات المعلقة (Held Orders)</h2>
                <p>استرجع أي طلب معلق لإكمال الدفع أو احذفه</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              {heldOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  <Icon name="pause" size={40} style={{ color: "var(--subtle)", marginBottom: 10 } as React.CSSProperties} />
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>لا توجد طلبات معلقة حالياً</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>يمكنك تعليق أي طلب بالضغط على زر F3</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {heldOrders.map((held) => (
                    <div
                      key={held.id}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              background: "rgba(255, 159, 28, 0.15)",
                              color: "var(--warning-text)",
                              border: "1px solid rgba(255, 159, 28, 0.3)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: "Inter",
                            }}
                          >
                            {held.id}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--muted)" }}>
                            وقت التعليق: <strong style={{ color: "var(--text)" }}>{held.holdTime}</strong>
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 6 }}>
                          {held.customerNote}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                          {held.items.map((i) => i.name).join("، ")}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>المبلغ</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--light-gold)", fontFamily: "Inter" }}>
                            {held.subtotal} <small style={{ fontSize: 12, fontFamily: "Cairo" }}>ج.م</small>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="primary-btn"
                            style={{ height: 38, padding: "0 14px", fontSize: 13 }}
                            onClick={() => handleResumeHeldOrder(held)}
                          >
                            <Icon name="check" size={15} />
                            <span>استرجاع للسلة</span>
                          </button>
                          <button
                            type="button"
                            className="danger-ghost"
                            onClick={() => handleDeleteHeldOrder(held.id)}
                            title="حذف الطلب المعلق"
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowPendingModal(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Out Modal (خروج نقدية من الدرج - سلفة / مصاريف / مسحوبات) */}
      {showCashOutModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "var(--surface-2)",
              border: "1.5px solid var(--gold)",
              borderRadius: 18,
              padding: "24px 26px",
              width: "100%",
              maxWidth: 530,
              boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "rgba(229, 72, 77, 0.15)",
                    border: "1px solid rgba(229, 72, 77, 0.4)",
                    color: "var(--danger-text)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="dollarSign" size={22} />
                </span>
                <div>
                  <h3 style={{ margin: 0, color: "var(--text)", fontSize: 18, fontWeight: 800 }}>
                    خروج نقدية من الدرج (Cash Out)
                  </h3>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    الطرفية: <strong>{activeCashier}</strong> • الوردية رقم #{_shiftNumber} • كاش الدرج:{" "}
                    <strong style={{ color: "var(--light-gold)" }}>{drawerCash.toLocaleString("ar-EG")} ج.م</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashOutModal(false)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Financial Control Notice */}
            <div
              style={{
                background: "rgba(212, 175, 55, 0.08)",
                border: "1px solid var(--border-gold)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                display: "flex",
                gap: 8,
              }}
            >
              <Icon name="alert" size={18} style={{ color: "var(--light-gold)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>رقابة الدرج المالي:</strong> يخصم هذا المبلغ فوراً من نقدية الوردية ويُسجل في السجل المالي، ويرسل إشعاراً فورياً على تلجرام الإدارة مع إمكانية طباعة سند صرف ورقي معتمد.
              </div>
            </div>

            {/* Category Selector Tabs */}
            <div style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ marginBottom: 6 }}>نوع وبند الصرف *</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {(["سلفة موظف", "مصاريف تشغيل ونثريات", "مسحوبات إدارة", "أخرى"] as CashOutCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCashOutCategory(cat);
                      if (cat === "سلفة موظف") {
                        const b = barbers[0];
                        if (b) {
                          setCashOutBarberId(b.id);
                          setCashOutRecipient(b.name);
                        }
                      } else if (cat === "مسحوبات إدارة") {
                        setCashOutRecipient("المالك / الإدارة العامة");
                      } else {
                        setCashOutRecipient("");
                      }
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: cashOutCategory === cat ? "1.5px solid var(--gold)" : "1px solid var(--border)",
                      background: cashOutCategory === cat ? "var(--gold-soft)" : "var(--surface)",
                      color: cashOutCategory === cat ? "var(--light-gold)" : "var(--text-secondary)",
                      fontWeight: cashOutCategory === cat ? 800 : 600,
                      fontSize: 12.5,
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* If Employee Advance: Select Barber */}
              {cashOutCategory === "سلفة موظف" && (
                <div>
                  <label className="form-label">الموظف المستلم للسلفة *</label>
                  <select
                    className="form-input"
                    value={cashOutBarberId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCashOutBarberId(id);
                      const b = barbers.find((x) => x.id === id);
                      if (b) setCashOutRecipient(b.name);
                    }}
                    style={{ background: "var(--gold-soft)", borderColor: "var(--border-gold)", color: "var(--text)", fontWeight: 700 }}
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.title} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipient Field (خرج لمين) */}
              <div>
                <label className="form-label">خرج لمين (اسم المستلم الفعلي) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: أحمد فتحي (حلاق)، عمرو (عامل البوفيه)، المندوب، المالك..."
                  value={cashOutRecipient}
                  onChange={(e) => setCashOutRecipient(e.target.value)}
                  required
                />
              </div>

              {/* Amount Field (كام) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">المبلغ الخارج من الدرج (ج.م) *</label>
                  {Number(cashOutAmount) > drawerCash && (
                    <span style={{ fontSize: 11, color: "var(--danger-text)", fontWeight: 700 }}>
                      المبلغ يتجاوز كاش الدرج ({drawerCash} ج.م)
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  className="form-input"
                  placeholder="مثال: 300"
                  value={cashOutAmount}
                  onChange={(e) => setCashOutAmount(e.target.value)}
                  min="1"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    fontFamily: "Inter, Cairo",
                    color: "var(--light-gold)",
                  }}
                  autoFocus
                />
                {/* Quick Addition Chips */}
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {[50, 100, 200, 500, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        const current = Number(cashOutAmount) || 0;
                        setCashOutAmount(String(current + v));
                      }}
                      style={{
                        padding: "3px 9px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +{v} ج.م
                    </button>
                  ))}
                  {cashOutAmount && (
                    <button
                      type="button"
                      onClick={() => setCashOutAmount("")}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--danger-border)",
                        background: "var(--danger-soft)",
                        color: "var(--danger-text)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      تفريغ
                    </button>
                  )}
                </div>
              </div>

              {/* Reason / Purpose Field (خرج ليه بالتفصيل) */}
              <div>
                <label className="form-label">سبب وبيان خروج النقدية (خرج ليه بالتفصيل) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="اكتب البيان بالتفصيل، مثال: شراء شاي وبن وسكر للبوفيه..."
                  value={cashOutReason}
                  onChange={(e) => setCashOutReason(e.target.value)}
                />
                {/* Reason Quick Suggestions Chips */}
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {(cashOutCategory === "سلفة موظف"
                    ? ["سلفة نقدية مستعجلة", "سلفة علاجية", "ظروف عائلية", "سلفة شخصية على الراتب"]
                    : cashOutCategory === "مسحوبات إدارة"
                    ? ["مسحوبات نقدية للمالك", "توريد لخزينة المحل", "أرباح دورية للمالك"]
                    : [
                        "شراء شاي وبن وسكر ومشروبات",
                        "مستلزمات نظافة ومطهرات",
                        "موسات وشفرات حلاقة عاجلة",
                        "صيانة وإصلاحات عاجلة",
                        "بنزين وتوصيل طلبات",
                      ]
                  ).map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setCashOutReason(sugg)}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "1px dashed var(--border)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        fontSize: 10.5,
                        cursor: "pointer",
                      }}
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes (Optional) */}
              <div>
                <label className="form-label">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="رقم الفاتورة الورقية أو اسم التاجر / المورد..."
                  value={cashOutNotes}
                  onChange={(e) => setCashOutNotes(e.target.value)}
                />
              </div>

              {/* Print Receipt Voucher Checkbox */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "var(--surface)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  marginTop: 4,
                  cursor: "pointer",
                }}
                onClick={() => setCashOutShouldPrint(!cashOutShouldPrint)}
              >
                <input
                  type="checkbox"
                  id="printCashOutCheck"
                  checked={cashOutShouldPrint}
                  onChange={(e) => setCashOutShouldPrint(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "var(--gold)", cursor: "pointer" }}
                />
                <label
                  htmlFor="printCashOutCheck"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="printer" size={15} style={{ color: "var(--gold)" }} />
                  <span>طباعة سند صرف نقدية حراري فوري (Thermal Voucher)</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmCashOut}
                disabled={isSubmittingCashOut}
                style={{ flex: 1, height: 44, fontSize: 14.5, gap: 7 }}
              >
                <Icon name="dollarSign" size={17} />
                <span>
                  {cashOutShouldPrint
                    ? `تأكيد خروج ${cashOutAmount ? `${cashOutAmount} ج.م` : "النقدية"} وطباعة السند`
                    : `تأكيد خروج ${cashOutAmount ? `${cashOutAmount} ج.م` : "النقدية"} من الدرج`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowCashOutModal(false)}
                disabled={isSubmittingCashOut}
                style={{
                  height: 44,
                  padding: "0 18px",
                  background: "var(--card-hover)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Thermal Slip Element specifically for printing Cash Out Voucher */}
      {cashOutSlipData && (
        <div
          id="cash-out-thermal-slip"
          className={`thermal-paper ${thermalSettings.paperWidth === "58mm" ? "narrow" : ""}`}
          style={{
            display: "none",
            width: thermalSettings.paperWidth === "58mm" ? 216 : 308,
            padding: thermalSettings.paperWidth === "58mm" ? "14px 10px 18px" : "20px 16px 24px",
            background: "#ffffff",
            color: "#000000",
            direction: "rtl",
            textAlign: "center",
            fontFamily: "Cairo, sans-serif",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 2 }}>
            {thermalSettings.headerTitle || "لمسة خليجي"}
          </div>
          <div style={{ fontSize: 11, color: "#444", marginBottom: 2 }}>
            {thermalSettings.shopAddress || "مساكن الجيش-بجوار بنك ناصر-بجوار سنترال حوده فون"}
          </div>
          <div style={{ fontSize: 10.5, color: "#444", marginBottom: 6 }}>
            هاتف: 01040734582
          </div>
          <div style={{ borderBottom: "1.5px dashed #000", margin: "6px 0" }} />

          <div style={{ fontWeight: 800, fontSize: 13, margin: "6px 0" }}>
            سند صرف نقدية من الدرج
          </div>
          <div style={{ fontSize: 10, color: "#333", marginBottom: 8 }}>
            رقم السند: {cashOutSlipData.voucherId}
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: 11,
              lineHeight: 1.6,
              background: "#f9f9f9",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ddd",
            }}
          >
            <div><strong>التاريخ والوقت:</strong> {cashOutSlipData.date} - {cashOutSlipData.time}</div>
            <div><strong>الكاشير:</strong> {activeCashier} (وردية #{cashOutSlipData.shiftNumber})</div>
            <div><strong>نوع الصرف:</strong> {cashOutSlipData.category}</div>
            <div>
              <strong>خرج لمين (المستلم):</strong> <span style={{ fontWeight: 800 }}>{cashOutSlipData.recipient}</span>
            </div>
            <div><strong>السبب والبيان:</strong> {cashOutSlipData.reason}</div>
            {cashOutSlipData.notes && <div><strong>ملاحظات:</strong> {cashOutSlipData.notes}</div>}
          </div>

          <div style={{ borderBottom: "1.5px dashed #000", margin: "10px 0" }} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
              fontWeight: 900,
              padding: "4px 0",
            }}
          >
            <span>المبلغ المنصرف:</span>
            <span
              style={{
                fontSize: 16,
                border: "1.5px solid #000",
                padding: "2px 8px",
                borderRadius: 4,
                fontFamily: "Inter, Cairo",
              }}
            >
              {cashOutSlipData.amount.toLocaleString("ar-EG")} ج.م
            </span>
          </div>

          <div style={{ borderBottom: "1.5px dashed #000", margin: "10px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: 10.5 }}>
            <div style={{ textAlign: "center" }}>
              <div>توقيع المستلم</div>
              <div style={{ marginTop: 26 }}>....................</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div>توقيع الكاشير / المسؤول</div>
              <div style={{ marginTop: 26 }}>....................</div>
            </div>
          </div>

          <div style={{ fontSize: 9.5, color: "#666", marginTop: 16, textAlign: "center" }}>
            نظام لمسة خليجي لإدارة الصالونات • سند مالي معتمد
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {notification && (
        <div className="toast-bar">
          <Icon name="check" size={18} style={{ color: "var(--success-text)" } as React.CSSProperties} />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}

