import { useState, useMemo, useEffect } from "react";
import {
  UserRole,
  Page,
  Barber,
  ServiceItem,
  Invoice,
  Coupon,
  ExpenseRecord,
  ShiftRecord,
  AuditLog,
  InventoryProduct,
  CartItem,
} from "./types";
import {
  initialBarbers,
  initialServices,
  initialInvoices,
  initialCoupons,
  initialExpenses,
  initialShift,
  initialAuditLogs,
  initialInventory,
  initialAttendance,
} from "./data/initialData";
import { Icon, IconName } from "./components/Icons";
import { DesktopTitlebar } from "./components/DesktopTitlebar";
import { LoginScreen } from "./components/LoginScreen";
import { PosPage } from "./components/PosPage";
import { PaymentModal } from "./components/PaymentModal";
import { AttendancePage } from "./components/AttendancePage";
import { InvoicesPage } from "./components/InvoicesPage";
import { ServicesPage } from "./components/ServicesPage";
import { InventoryPage } from "./components/InventoryPage";
import { AdminPage } from "./components/AdminPage";
import { QueueScreenModal } from "./components/QueueScreenModal";
import { sfx } from "./utils/audio";
import { secureStorage } from "./utils/secureStorage";
import { getSalonSettings, saveSalonSettings, SalonSettings } from "./utils/salonSettings";

export default function App() {
  // Authentication & Session
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("admin");
  const [currentUsername, setCurrentUsername] = useState("كريم عادل");
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [lockPin, setLockPin] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);

  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>("pos");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Unified Salon Brand & Settings (Synced & Encrypted)
  const [salonSettings, setSalonSettings] = useState<SalonSettings>(getSalonSettings);

  useEffect(() => {
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) {
        setSalonSettings(e.detail);
      }
    };
    window.addEventListener("salon-settings-changed", handleSettingsUpdate);
    return () => window.removeEventListener("salon-settings-changed", handleSettingsUpdate);
  }, []);

  // Application Data State with AES-style Encrypted Storage
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [barbers, setBarbers] = useState<Barber[]>(() =>
    secureStorage.getItem<Barber[]>("pos_barbers_data", initialBarbers)
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    secureStorage.getItem<Invoice[]>("pos_invoices_data", initialInvoices)
  );
  const [coupons, setCoupons] = useState<Coupon[]>(() =>
    secureStorage.getItem<Coupon[]>("pos_coupons_data", initialCoupons)
  );
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() =>
    secureStorage.getItem<ExpenseRecord[]>("pos_expenses_data", initialExpenses)
  );
  const [shifts, setShifts] = useState<ShiftRecord[]>(() =>
    secureStorage.getItem<ShiftRecord[]>("pos_shifts_data", [initialShift])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    secureStorage.getItem<AuditLog[]>("pos_audit_data", initialAuditLogs)
  );
  const [inventory, setInventory] = useState<InventoryProduct[]>(() =>
    secureStorage.getItem<InventoryProduct[]>("pos_inventory_data", initialInventory)
  );
  const [attendanceRecords, setAttendanceRecords] = useState(() =>
    secureStorage.getItem("pos_attendance_data", initialAttendance)
  );

  // Background Auto-Save with Secure Encryption
  useEffect(() => {
    secureStorage.setItem("pos_barbers_data", barbers);
  }, [barbers]);

  useEffect(() => {
    secureStorage.setItem("pos_invoices_data", invoices);
  }, [invoices]);

  useEffect(() => {
    secureStorage.setItem("pos_coupons_data", coupons);
  }, [coupons]);

  useEffect(() => {
    secureStorage.setItem("pos_expenses_data", expenses);
  }, [expenses]);

  useEffect(() => {
    secureStorage.setItem("pos_shifts_data", shifts);
  }, [shifts]);

  useEffect(() => {
    secureStorage.setItem("pos_audit_data", auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    secureStorage.setItem("pos_inventory_data", inventory);
  }, [inventory]);

  useEffect(() => {
    secureStorage.setItem("pos_attendance_data", attendanceRecords);
  }, [attendanceRecords]);

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [pendingCheckoutCart, setPendingCheckoutCart] = useState<CartItem[]>([]);
  const [pendingCheckoutTotal, setPendingCheckoutTotal] = useState(0);

  // Global Toast
  const [globalToast, setGlobalToast] = useState("");
  const showToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(""), 3500);
  };

  const handleMuteToggle = () => {
    sfx.enabled = !sfx.enabled;
    setIsMuted(!sfx.enabled);
    showToast(sfx.enabled ? "تم تفعيل الأصوات التنبيهية" : "تم كتم أصوات النظام");
  };

  // Helper to add audit log
  const addAuditLog = (
    action: string,
    category: AuditLog["category"],
    prevVal: string,
    newVal: string,
    reason = "",
    severity: AuditLog["severity"] = "عادي",
  ) => {
    const newLog: AuditLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user: currentUsername,
      action,
      category,
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      previousValue: prevVal,
      newValue: newVal,
      reason,
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Login handler
  const handleLogin = (role: UserRole, username: string, matchedBarber?: Barber) => {
    setCurrentUserRole(role);
    if (role === "admin") {
      setCurrentUsername("كريم عادل (المدير العام)");
      setCurrentPage("pos");
    } else if (role === "cashier") {
      setCurrentUsername("حسام حسن (كاشير)");
      setCurrentPage("pos");
    } else {
      const empName = matchedBarber ? `${matchedBarber.name} (${matchedBarber.title})` : `${username} (موظف)`;
      setCurrentUsername(empName);
      setCurrentPage("attendance");
    }
    setIsLoggedIn(true);
    setIsScreenLocked(false);
  };

  // Logout handler
  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsScreenLocked(false);
  };

  // Navigation Items allowed per role
  const navItems = useMemo(() => {
    const allNav: { id: Page; label: string; icon: IconName; shortcut?: string }[] = [
      { id: "pos", label: "الكاشير", icon: "grid", shortcut: "F1" },
      { id: "attendance", label: "الحضور", icon: "clock" },
      { id: "invoices", label: "الفواتير", icon: "receipt" },
      { id: "services", label: "الخدمات", icon: "scissors" },
      { id: "inventory", label: "المشتريات", icon: "box" },
      { id: "admin", label: "الأدمن", icon: "shield" },
    ];

    if (currentUserRole === "employee") {
      return [{ id: "attendance" as Page, label: "صفحة الموظف", icon: "clock" as IconName }];
    }
    if (currentUserRole === "cashier") {
      return allNav.filter((n) => n.id === "pos" || n.id === "attendance" || n.id === "invoices");
    }
    return allNav;
  }, [currentUserRole]);

  // Handle Checkout Open from POS
  const handleOpenCheckout = (cart: CartItem[], total: number) => {
    setPendingCheckoutCart(cart);
    setPendingCheckoutTotal(total);
    setCheckoutModalOpen(true);
  };

  // Handle Payment Complete
  const handlePaymentSuccess = (newInvoice: Invoice) => {
    setInvoices((prev) => [newInvoice, ...prev]);
    // update shift cash
    setShifts((prev) => {
      const active = prev.find((s) => s.status === "نشطة");
      if (!active) return prev;
      let newCash = active.cashSales;
      let newCard = active.cardSales;
      if (newInvoice.paymentMethod === "نقداً") {
        newCash += newInvoice.total;
      } else if (newInvoice.paymentMethod === "بطاقة") {
        newCard += newInvoice.total;
      } else if (newInvoice.paymentMethod === "دفع مختلط" && newInvoice.splitDetails) {
        newCash += newInvoice.splitDetails.cash;
        newCard += newInvoice.splitDetails.card;
      }
      return prev.map((s) =>
        s.id === active.id
          ? {
              ...s,
              cashSales: newCash,
              cardSales: newCard,
              expectedCash: s.openingCash + newCash - s.drawerExpenses,
            }
          : s,
      );
    });

    addAuditLog(
      `إصدار فاتورة جديدة #${newInvoice.id}`,
      "بيع",
      "—",
      `${newInvoice.total} ج.م (${newInvoice.paymentMethod})`,
      "",
      "عادي",
    );
  };

  // Barber Status Update (Punch in/out/break)
  const handleUpdateBarberStatus = (barberId: string, newStatus: Barber["status"], timeStr: string) => {
    setBarbers((prev) =>
      prev.map((b) =>
        b.id === barberId
          ? {
              ...b,
              status: newStatus,
              checkInTime: newStatus === "متاح" && b.checkInTime === "—" ? timeStr : b.checkInTime,
              checkOutTime: newStatus === "منصرف" ? timeStr : b.checkOutTime,
            }
          : b,
      ),
    );

    const b = barbers.find((x) => x.id === barberId);
    if (b) {
      addAuditLog(
        `تحديث حالة الحضور للحلاق ${b.name}`,
        "تعديل حضور",
        b.status,
        newStatus,
        `في تمام الساعة ${timeStr}`,
        "عادي",
      );
    }
  };

  // Admin Attendance Correction
  const handleAdminCorrectAttendance = (
    recordId: string,
    newCheckIn: string,
    newCheckOut: string,
    reason: string,
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              checkIn: newCheckIn,
              checkOut: newCheckOut,
              correctionNote: reason,
            }
          : r,
      ),
    );
    addAuditLog(
      `تصحيح سجل حضور ${recordId}`,
      "تعديل حضور",
      "قيمة سابقة",
      `${newCheckIn} - ${newCheckOut}`,
      reason,
      "حساس",
    );
  };

  // Cancel Invoice
  const handleCancelInvoice = (invoiceId: string, reason: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "ملغاة", cancellationReason: reason }
          : inv,
      ),
    );
    addAuditLog(
      `إلغاء الفاتورة ${invoiceId}`,
      "إلغاء",
      "مكتملة",
      "ملغاة",
      reason,
      "حرج",
    );
  };

  // Refund Invoice
  const handleRefundInvoice = (invoiceId: string, reason: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: "مسترجعة", refundReason: reason }
          : inv,
      ),
    );
    addAuditLog(
      `استرجاع الفاتورة ${invoiceId}`,
      "استرجاع",
      "مكتملة",
      "مسترجعة",
      reason,
      "حرج",
    );
  };

  // Reveal Phone Audit
  const handleRevealPhone = (invoiceId: string, reason: string) => {
    addAuditLog(
      `كشف رقم الهاتف الكامل للفاتورة ${invoiceId}`,
      "كشف رقم عميل",
      "050****891",
      "رقم كامل",
      reason || "كشف بواسطة الأدمن بعد إدخال كلمة المرور",
      "حساس",
    );
  };

  // Services
  const handleSaveService = (service: ServiceItem) => {
    setServices((prev) => {
      const idx = prev.findIndex((s) => s.id === service.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = service;
        return next;
      }
      return [service, ...prev];
    });
    addAuditLog(
      `حفظ وتحديث الخدمة «${service.name}»`,
      "تغيير سعر",
      "—",
      `${service.price} ج.م`,
      "تحديث دليل الخدمات",
      "حساس",
    );
  };

  const handleToggleServiceStatus = (serviceId: number) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? { ...s, status: s.status === "متاح" ? "معطل" : "متاح" }
          : s,
      ),
    );
  };

  const handleArchiveService = (serviceId: number) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  // Inventory & Purchases
  const handleAddProduct = (prod: InventoryProduct) => {
    setInventory((prev) => [prod, ...prev]);
  };

  const handleRecordPurchase = (
    supplier: string,
    invoiceNum: string,
    itemsDesc: string,
    totalCost: number,
  ) => {
    addAuditLog(
      `تسجيل فاتورة توريد من ${supplier}`,
      "بيع",
      "—",
      `${totalCost} ج.م (#${invoiceNum})`,
      itemsDesc,
      "عادي",
    );
  };

  const handleRecordConsumption = (
    barberId: string,
    productId: string,
    qty: number,
    reason: string,
  ) => {
    setInventory((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock: Math.max(0, p.stock - qty) } : p,
      ),
    );
    const b = barbers.find((x) => x.id === barberId);
    const p = inventory.find((x) => x.id === productId);
    addAuditLog(
      `صرف مستلزمات للحلاق ${b?.name || ""}`,
      "بيع",
      "—",
      `${qty} عبوة من ${p?.name || ""}`,
      reason,
      "عادي",
    );
  };

  // Expenses
  const handleAddExpense = (exp: ExpenseRecord) => {
    setExpenses((prev) => [exp, ...prev]);
    if (exp.shiftDeduction) {
      setShifts((prev) =>
        prev.map((s) =>
          s.status === "نشطة"
            ? {
                ...s,
                drawerExpenses: s.drawerExpenses + exp.amount,
                expectedCash: s.expectedCash - exp.amount,
              }
            : s,
        ),
      );
    }
  };

  // Close Shift
  const handleCloseShift = (shiftId: number, actualCash: number, notes: string) => {
    setShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              closeTime: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
              actualCash,
              difference: actualCash - s.expectedCash,
              status: "مغلقة",
              handoverNotes: notes,
            }
          : s,
      ),
    );
    addAuditLog(
      `إغلاق الوردية #${shiftId} وتسليم الدرج`,
      "إغلاق وردية",
      "نشطة",
      `فعلي: ${actualCash} ج.م`,
      notes || "إغلاق روتيني وطباعة تقرير Z",
      "حرج",
    );
  };

  // Screen Title & Subtitle
  const pageTitles: Record<Page, [string, string]> = {
    pos: ["نقطة البيع (POS)", "اختر الخدمات وأسند الحلاق وأكمل الطلب بسرعة"],
    attendance: ["الحضور والانصراف", "متابعة كراسي الحلاقة والورديات بالرمز السري"],
    invoices: ["سجل الفواتير والمبيعات", "إدارة الفواتير، إعادة الطباعة، والإلغاء والاسترجاع"],
    services: ["دليل الخدمات والباقات", "إدارة قوائم الحلاقة والأسعار والعمولات المحفوظة"],
    inventory: ["المستودع والمشتريات", "متابعة أرصدة الشامبوهات والمستهلكات وتنبيهات النفاد"],
    admin: ["مركز الإدارة والتحكم", "لوحة القيادة والمتابعة الشاملة لصالون لمسة"],
  };

  // Not Logged In View
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} barbers={barbers} />;
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "nav-collapsed" : ""}`}>
      {/* 1. Custom Windows Desktop Titlebar */}
      <DesktopTitlebar
        activeCashier={currentUsername}
        userRole={currentUserRole}
        currentPage={currentPage}
        isLocked={isScreenLocked}
        onLockToggle={() => setIsScreenLocked(!isScreenLocked)}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        onOpenQueue={() => setShowQueueModal(true)}
      />

      {/* 2. Fixed Right Sidebar in Arabic RTL */}
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand" style={{ cursor: "pointer" }} onClick={() => setCurrentPage("pos")}>
            <div className="brand-mark">
              <Icon name="scissors" size={isSidebarCollapsed ? 20 : 24} />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <strong>{salonSettings.salonName}</strong>
                <span>{salonSettings.brandSub}</span>
                <small>{salonSettings.address.slice(0, 32)}</small>
              </div>
            )}
          </div>

          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            <Icon name={isSidebarCollapsed ? "chevron" : "chevron"} size={16} />
          </button>
        </div>

        {/* Current User Card */}
        {!isSidebarCollapsed && (
          <div className="sidebar-user">
            <div className="user-avatar-wrap">
              <img
                src={
                  currentUserRole === "admin"
                    ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                    : currentUserRole === "cashier"
                      ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
                      : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
                }
                alt="user"
                className="user-avatar"
              />
              <span className="user-online-dot" />
            </div>
            <div className="user-meta">
              <div className="user-name">{currentUsername}</div>
              <span className="user-role-pill">
                {currentUserRole === "admin"
                  ? "السوبر أدمن • المدير العام"
                  : currentUserRole === "cashier"
                    ? "كاشير مناوب"
                    : "الموظف المعتمد"}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${currentPage === item.id ? "active" : ""}`}
              onClick={() => setCurrentPage(item.id)}
              title={item.label}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={20} />
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.shortcut && <kbd>{item.shortcut}</kbd>}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
            title="تسجيل الخروج"
          >
            <Icon name="logout" size={17} />
            {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
          </button>
          {!isSidebarCollapsed && (
            <div className="app-version-tag">
              لمسة خليجي v4.0 Desktop Build
            </div>
          )}
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <main className="main-content">
        {/* Streamlined Top Header: Hidden for POS to maximize workspace and eliminate duplicate headers */}
        {currentPage !== "pos" && (
          <div className="topbar" style={{ marginBottom: 16, padding: "4px 0" }}>
            <div className="topbar-titles">
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{pageTitles[currentPage][0]}</h1>
              <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>{pageTitles[currentPage][1]}</p>
            </div>
          </div>
        )}

        {/* Screen Content Render */}
        {currentPage === "pos" && (
          <PosPage
            services={services}
            barbers={barbers}
            onCheckout={handleOpenCheckout}
            activeCashier={currentUsername}
            onOpenQueue={() => setShowQueueModal(true)}
          />
        )}

        {currentPage === "attendance" && (
          <AttendancePage
            barbers={barbers}
            attendanceRecords={attendanceRecords}
            userRole={currentUserRole}
            activeEmployeeName={currentUsername}
            onUpdateBarberStatus={handleUpdateBarberStatus}
            onAdminCorrectAttendance={handleAdminCorrectAttendance}
          />
        )}

        {currentPage === "invoices" && (
          <InvoicesPage
            invoices={invoices}
            userRole={currentUserRole}
            onCancelInvoice={handleCancelInvoice}
            onRefundInvoice={handleRefundInvoice}
            onRevealPhone={handleRevealPhone}
          />
        )}

        {currentPage === "services" && currentUserRole === "admin" && (
          <ServicesPage
            services={services}
            onSaveService={handleSaveService}
            onToggleServiceStatus={handleToggleServiceStatus}
            onArchiveService={handleArchiveService}
          />
        )}

        {currentPage === "inventory" && currentUserRole === "admin" && (
          <InventoryPage
            products={inventory}
            barbers={barbers}
            onAddProduct={handleAddProduct}
            onRecordPurchase={handleRecordPurchase}
            onRecordConsumption={handleRecordConsumption}
          />
        )}

        {currentPage === "admin" && currentUserRole === "admin" && (
          <AdminPage
            invoices={invoices}
            barbers={barbers}
            coupons={coupons}
            expenses={expenses}
            shifts={shifts}
            auditLogs={auditLogs}
            inventory={inventory}
            services={services}
            onSaveCoupon={(c) => {
              setCoupons((prev) => {
                const idx = prev.findIndex((x) => x.id === c.id);
                if (idx > -1) {
                  const next = [...prev];
                  next[idx] = c;
                  return next;
                }
                return [c, ...prev];
              });
            }}
            onSaveEmployee={(emp) => {
              setBarbers((prev) => {
                const idx = prev.findIndex((x) => x.id === emp.id);
                if (idx > -1) {
                  const next = [...prev];
                  next[idx] = emp;
                  return next;
                }
                return [emp, ...prev];
              });
            }}
            onAddExpense={handleAddExpense}
            onCloseShift={handleCloseShift}
            onSaveSettings={(s) => {
              const updated = saveSalonSettings({
                salonName: s.salonName,
                address: s.address,
                phone: s.phone,
                taxNumber: s.taxNumber,
                commercialReg: s.commercialReg,
              });
              setSalonSettings(updated);
              showToast("✅ تم تحديث وتطبيق إعدادات الصالون في جميع الشاشات بنجاح");
            }}
          />
        )}
      </main>

      {/* Payment / Checkout Modal */}
      {checkoutModalOpen && (
        <PaymentModal
          cart={pendingCheckoutCart}
          subtotal={pendingCheckoutTotal}
          onClose={() => setCheckoutModalOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
          coupons={coupons}
          activeCashier={currentUsername}
          shiftId={104}
        />
      )}

      {/* Queue Screen Modal */}
      {showQueueModal && (
        <QueueScreenModal
          barbers={barbers}
          onClose={() => setShowQueueModal(false)}
        />
      )}

      {/* Screen Lock Overlay */}
      {isScreenLocked && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(11, 11, 11, 0.95)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#161616",
              border: "1.5px solid #D4AF37",
              borderRadius: 18,
              padding: 36,
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(212, 175, 55, 0.15)",
                border: "2px solid #D4AF37",
                color: "#D4AF37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Icon name="lock" size={28} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#FFF", margin: "0 0 6px" }}>
              شاشة الطرفية مقفلة
            </h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              أدخل كلمة المرور أو رمز PIN لفتح قفل الشاشة ومتابعة العمل
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (lockPin === "1234" || lockPin === "admin123") {
                  setIsScreenLocked(false);
                  setLockPin("");
                  showToast("تم فتح قفل الشاشة بنجاح");
                } else {
                  alert("كلمة المرور غير صحيحة! جرب: 1234 أو admin123");
                }
              }}
            >
              <input
                type="password"
                className="form-input"
                placeholder="أدخل رمز إلغاء القفل (تجريبي: 1234)"
                value={lockPin}
                onChange={(e) => setLockPin(e.target.value)}
                style={{ textAlign: "center", fontSize: 18, letterSpacing: 6, marginBottom: 16 }}
                autoFocus
              />

              <button type="submit" className="primary-btn" style={{ width: "100%", height: 46 }}>
                <span>إلغاء قفل الشاشة</span>
                <Icon name="unlock" size={17} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {globalToast && (
        <div className="toast-bar">
          <Icon name="check" size={18} style={{ color: "#3FB950" } as React.CSSProperties} />
          <span>{globalToast}</span>
        </div>
      )}
    </div>
  );
}
