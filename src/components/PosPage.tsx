import { useState, useMemo, useEffect, useRef } from "react";
import { ServiceItem, Barber, CartItem, HeldOrder, ServiceCategory, AdvanceRecord } from "../types";
import { Icon } from "./Icons";
import { sfx } from "../utils/audio";

export function PosPage({
  services,
  barbers,
  onCheckout,
  activeCashier,
  shiftNumber = 104,
  onOpenQueue,
  onAddAdvance,
}: {
  services: ServiceItem[];
  barbers: Barber[];
  onCheckout: (cart: CartItem[], total: number) => void;
  activeCashier: string;
  shiftNumber?: number;
  onOpenQueue?: () => void;
  onAddAdvance?: (advance: AdvanceRecord) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([
    {
      serviceId: 2,
      name: "تدريج استايل VIP (Skin Fade)",
      category: "قص الشعر",
      price: 130,
      duration: 40,
      qty: 1,
      barberId: "b1",
      barberName: "محمود إبراهيم",
    },
    {
      serviceId: 3,
      name: "تهذيب وتحديد ذقن بالموس",
      category: "الذقن",
      price: 60,
      duration: 25,
      qty: 1,
      barberId: "b1",
      barberName: "محمود إبراهيم",
    },
  ]);

  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([
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

  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const [notification, setNotification] = useState("");

  // Cashier Advance Modal State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceEmpId, setAdvanceEmpId] = useState(barbers[0]?.id || "");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceReason, setAdvanceReason] = useState("");
  const [advanceNotes, setAdvanceNotes] = useState("");

  const handleSaveAdvanceFromCashier = () => {
    if (!advanceEmpId || !advanceAmount || !advanceReason.trim()) {
      showToast("⚠️ يرجى تحديد الموظف والمبلغ وسبب السلفة");
      return;
    }
    const targetBarber = barbers.find((b) => b.id === advanceEmpId);
    if (!targetBarber) return;

    const numAmount = Number(advanceAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast("⚠️ الرجاء إدخال مبلغ صحيح للسلفة");
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

    const newAdvance: AdvanceRecord = {
      id: `ADV-${Date.now()}`,
      barberId: targetBarber.id,
      barberName: targetBarber.name,
      amount: numAmount,
      reason: advanceReason.trim(),
      date: dateStr,
      time: timeStr,
      registeredBy: activeCashier,
      registeredByRole: "cashier",
      status: "نشط",
      notes: advanceNotes.trim() ? `كاشير: ${advanceNotes.trim()}` : "سلفة مسجلة من طرفية الكاشير",
    };

    if (onAddAdvance) {
      onAddAdvance(newAdvance);
    }
    setShowAdvanceModal(false);
    showToast(`✅ تم تسجيل سلفة بقيمة ${numAmount} ج.م للموظف «${targetBarber.name}»`);
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
      } else if (e.key === "F6") {
        e.preventDefault();
        if (onOpenQueue) {
          onOpenQueue();
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

  // Add Service to Cart
  const handleAddService = (srv: ServiceItem) => {
    sfx.playClick();
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.serviceId === srv.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].qty += 1;
        return next;
      }
      return [
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
      ];
    });
    showToast(`تمت إضافة «${srv.name}» إلى سلة الطلب`);
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

  return (
    <div>
      {/* Top Header / Cashier Operational Status */}
      <div
        style={{
          background: "#121212",
          border: "1px solid #2A2418",
          borderRadius: 14,
          padding: "14px 20px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 18px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: "#1E1A12",
                border: "1px solid #D4AF37",
                color: "#D4AF37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="users" size={18} />
            </span>
            <div>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>الكاشير المناوب</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#FFF" }}>{activeCashier}</div>
            </div>
          </div>

          <div style={{ width: 1, height: 28, background: "#252016" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(63, 185, 80, 0.12)",
                color: "#56D364",
                border: "1px solid rgba(63, 185, 80, 0.3)",
                padding: "4px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#3FB950" }} />
              الوردية #{shiftNumber} (نشطة)
            </span>
            <span style={{ fontSize: 12, color: "#888" }}>منذ 09:00 ص</span>
          </div>

          <div style={{ width: 1, height: 28, background: "#252016" }} />

          <button
            type="button"
            className="pending-orders-pill"
            onClick={() => setShowPendingModal(true)}
            title="الطلبات المعلقة (F4)"
          >
            <Icon name="pause" size={15} />
            <span>الطلبات المعلقة:</span>
            <strong style={{ fontFamily: "Inter", fontSize: 14 }}>{heldOrders.length}</strong>
            <kbd>F4</kbd>
          </button>

          {onOpenQueue && (
            <button
              type="button"
              className="pending-orders-pill"
              onClick={onOpenQueue}
              title="عرض شاشة الدور وصالة الانتظار (F6)"
              style={{
                borderColor: "rgba(212, 175, 55, 0.4)",
                color: "#F5C242",
              }}
            >
              <Icon name="users" size={15} />
              <span>شاشة الدور</span>
              <kbd>F6</kbd>
            </button>
          )}

          <button
            type="button"
            className="pending-orders-pill"
            onClick={() => {
              setAdvanceEmpId(barbers[0]?.id || "");
              setAdvanceAmount("");
              setAdvanceReason("");
              setAdvanceNotes("");
              setShowAdvanceModal(true);
            }}
            title="تسجيل سلفة موظف جديدة"
            style={{
              borderColor: "rgba(245, 194, 66, 0.5)",
              color: "#F5C242",
              background: "rgba(245, 194, 66, 0.08)",
            }}
          >
            <Icon name="dollarSign" size={15} />
            <span>سلفة موظف</span>
          </button>
        </div>

        {/* Live Date and Time */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12, color: "#9E9E9E", fontWeight: 600 }}>{currentDate}</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#F5C242",
                fontFamily: "Inter, Cairo",
                direction: "ltr",
              }}
            >
              {currentTime}
            </div>
          </div>

          {/* Quick Shortcuts Cheat Pill */}
          <div
            style={{
              background: "#181818",
              border: "1px solid #2B2519",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              color: "#BBB",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>
              <kbd>F1</kbd> بحث
            </span>
            <span>•</span>
            <span>
              <kbd>F2</kbd> تأكيد
            </span>
            <span>•</span>
            <span>
              <kbd>F3</kbd> تعليق
            </span>
            <span>•</span>
            <span>
              <kbd>F4</kbd> معلقة
            </span>
            <span>•</span>
            <span>
              <kbd>F6</kbd> الدور
            </span>
          </div>
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
                  color: "#888",
                  cursor: "pointer",
                }}
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>

          {/* Services Grid */}
          <div className="services-grid">
            {filteredServices.map((srv) => (
              <div
                key={srv.id}
                className="service-card"
                onClick={() => handleAddService(srv)}
                role="button"
                tabIndex={0}
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
                        color: "#888",
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
                  <div className="service-add-icon">
                    <Icon name="plus" size={16} />
                  </div>
                </div>
              </div>
            ))}

            {filteredServices.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "50px 20px",
                  textAlign: "center",
                  background: "#141414",
                  borderRadius: 14,
                  border: "1px dashed #2A2418",
                  color: "#888",
                }}
              >
                <Icon name="scissors" size={36} style={{ color: "#444", marginBottom: 10 } as React.CSSProperties} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#CCC" }}>
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
              <div style={{ fontSize: 12, color: "#8E8E8E", marginTop: 2 }}>
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
                <Icon name="receipt" size={42} style={{ color: "#333", marginBottom: 12 } as React.CSSProperties} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#999" }}>لم يتم اختيار خدمات بعد</div>
                <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
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
                        <div style={{ fontSize: 12, color: "#888" }}>
                          {item.duration} دقيقة لكل حبة
                        </div>
                      </div>
                      <div className="cart-item-price">
                        {item.price * item.qty}
                        <small style={{ fontSize: 11, marginRight: 2 }}>ج.م</small>
                      </div>
                    </div>

                    {/* Dedicated Barber Selector for EACH service */}
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#9E9E9E",
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
                                ? "#3FB950"
                                : barberStatus === "مشغول"
                                  ? "#FF9F1C"
                                  : "#888",
                          }}
                        >
                          <i
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background:
                                barberStatus === "متاح"
                                  ? "#3FB950"
                                  : barberStatus === "مشغول"
                                    ? "#FF9F1C"
                                    : "#888",
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

                    {/* Quantity Controls & Remove */}
                    <div className="cart-item-bottom">
                      <div className="qty-controls">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleQtyChange(item.serviceId, -1)}
                          title="إنقاص الكمية"
                        >
                          <Icon name="minus" size={13} />
                        </button>
                        <span className="qty-number">{item.qty}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => handleQtyChange(item.serviceId, 1)}
                          title="زيادة الكمية"
                        >
                          <Icon name="plus" size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.serviceId)}
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "#FF8E92",
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
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
              <span style={{ fontSize: 12, color: "#888" }}>مشمولة في الأسعار</span>
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
                style={{ color: "#FF9999", borderColor: "#3D1E1E" }}
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
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: "#CCC", marginBottom: 14 }}>
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
                  background: "#161616",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #2B2519",
                  fontSize: 13,
                  color: "#BBB",
                }}
              >
                <div>إجمالي المبلغ المعلق: <strong style={{ color: "#F5C242" }}>{subtotal} ج.م</strong></div>
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
              <h2 style={{ color: "#FF8E92" }}>تأكيد إلغاء ومسح السلة</h2>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 15, color: "#EEE", lineHeight: 1.5 }}>
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
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              {heldOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
                  <Icon name="pause" size={40} style={{ color: "#444", marginBottom: 10 } as React.CSSProperties} />
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#BBB" }}>لا توجد طلبات معلقة حالياً</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>يمكنك تعليق أي طلب بالضغط على زر F3</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {heldOrders.map((held) => (
                    <div
                      key={held.id}
                      style={{
                        background: "#161616",
                        border: "1px solid #2B2519",
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
                              color: "#FF9F1C",
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
                          <span style={{ fontSize: 13, color: "#888" }}>
                            وقت التعليق: <strong style={{ color: "#DDD" }}>{held.holdTime}</strong>
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#FFF", marginTop: 6 }}>
                          {held.customerNote}
                        </div>
                        <div style={{ fontSize: 13, color: "#AAA", marginTop: 4 }}>
                          {held.items.map((i) => `${i.name} (×${i.qty})`).join("، ")}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 11, color: "#888" }}>المبلغ</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#F5C242", fontFamily: "Inter" }}>
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

      {/* Cashier Add Employee Advance Modal */}
      {showAdvanceModal && (
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
          }}
        >
          <div
            style={{
              background: "#161616",
              border: "1.5px solid #D4AF37",
              borderRadius: 18,
              padding: 28,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(212, 175, 55, 0.15)",
                    border: "1px solid #D4AF37",
                    color: "#F5C242",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="dollarSign" size={20} />
                </span>
                <div>
                  <h3 style={{ margin: 0, color: "#FFF", fontSize: 18, fontWeight: 800 }}>
                    تسجيل سلفة موظف جديدة
                  </h3>
                  <span style={{ fontSize: 12, color: "#888" }}>الطرفية الحالية: {activeCashier}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#888",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Strict Role Policy Warning */}
            <div
              style={{
                background: "rgba(229, 72, 77, 0.12)",
                border: "1px solid rgba(229, 72, 77, 0.35)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: 12,
                color: "#FFA8AB",
                lineHeight: 1.5,
                display: "flex",
                gap: 8,
              }}
            >
              <Icon name="alert" size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>تنبيه الرقابة المالية:</strong> الكاشير يملك صلاحية <u>إضافة السلفة فقط</u>. لا يمكن للكاشير تعديل أو حذف أي سلفة بعد تسجيلها، والتعديل مقتصر على المدير العام.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="form-label">الموظف المستلم *</label>
                <select
                  className="form-input"
                  value={advanceEmpId}
                  onChange={(e) => setAdvanceEmpId(e.target.value)}
                  style={{ background: "#1C180E", borderColor: "#5E4E25", color: "#FFF", fontWeight: 700 }}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.title} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">مبلغ السلفة (ج.م) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="مثال: 300"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  min="1"
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label">سبب السلفة *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: سلفة علاجية، مشتريات شخصية، ظروف عائلية..."
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">ملاحظات إضافية</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ملاحظات تفصيلية أو كود إذن الصرف..."
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveAdvanceFromCashier}
                style={{ flex: 1, height: 44, fontSize: 15 }}
              >
                <Icon name="check" size={17} />
                <span>تأكيد تسجيل وصرف السلفة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                style={{
                  height: 44,
                  padding: "0 18px",
                  background: "#1E1E1E",
                  border: "1px solid #333",
                  color: "#CCC",
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

      {/* Floating Toast Notification */}
      {notification && (
        <div className="toast-bar">
          <Icon name="check" size={18} style={{ color: "#3FB950" } as React.CSSProperties} />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}

