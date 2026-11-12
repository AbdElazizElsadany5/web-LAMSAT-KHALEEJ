import { useState, useMemo, useEffect } from "react";
import {
  UserRole,
  Page,
  Barber,
  ServiceItem,
  Invoice,
  ExpenseRecord,
  ShiftRecord,
  AuditLog,
  InventoryProduct,
  CartItem,
  HeldOrder,
  AdvanceRecord,
  AttendanceRecord,
  CashOutPayload,
} from "./types";
import {
  initialBarbers,
  initialServices,
  initialInvoices,
  initialExpenses,
  initialShift,
  initialAuditLogs,
  initialInventory,
  initialAttendance,
  initialAdvances,
} from "./data/initialData";
import { Icon, IconName } from "./components/Icons";
import { DesktopTitlebar } from "./components/DesktopTitlebar";
import { ShiftStartScreen } from "./components/ShiftStartScreen";
import { AdminPasswordGate } from "./components/AdminPasswordGate";
import { PosPage } from "./components/PosPage";
import { PaymentModal } from "./components/PaymentModal";
import { AttendancePage } from "./components/AttendancePage";
import { AdminPage, ADMIN_SECTIONS } from "./components/AdminPage";
import { QueueScreenModal } from "./components/QueueScreenModal";
import { CustomerInvoiceView } from "./components/CustomerInvoiceView";
import { decodeInvoiceFromQrUrl } from "./utils/qrInvoiceHelper";
import { sfx } from "./utils/audio";
import { secureStorage } from "./utils/secureStorage";
import { getSalonSettings, saveSalonSettings, SalonSettings } from "./utils/salonSettings";
import { applyThemeMode, getThemeMode, saveThemeMode, ThemeMode } from "./utils/themeSettings";
import {
  getAttendancePolicy,
  calculateLateMetrics,
  parseTimeToMinutes,
} from "./utils/attendancePolicy";
import {
  sendTelegramInvoice,
  sendTelegramShiftStart,
  sendTelegramShiftClose,
  sendTelegramAttendance,
  sendTelegramAdvance,
  sendTelegramCashOut,
  sendTelegramHourlyDigest,
  getTelegramSettings,
} from "./utils/telegramSettings";

type ActiveShiftSession = {
  shiftId: number;
  cashierName: string;
  startTimestamp: number;
  openingCash: number;
};

function formatShiftDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function App() {
  // Shift & Admin Gate Session
  const [activeShiftSession, setActiveShiftSession] = useState<ActiveShiftSession | null>(() =>
    secureStorage.getItem<ActiveShiftSession | null>("pos_active_shift_session", null)
  );
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState<string>(() =>
    secureStorage.getItem<string>("pos_admin_password", "admin123")
  );
  const [shiftElapsedSeconds, setShiftElapsedSeconds] = useState<number>(() =>
    activeShiftSession ? Math.max(0, Math.floor((Date.now() - activeShiftSession.startTimestamp) / 1000)) : 0
  );
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);

  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [lockPin, setLockPin] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);

  const currentUserRole: UserRole = isAdminUnlocked ? "admin" : "cashier";
  const currentUsername = activeShiftSession?.cashierName || "مسؤول الوردية";

  // Navigation State
  const [currentPage, setCurrentPage] = useState<Page>("pos");
  const [adminSection, setAdminSection] = useState<string>("نظرة عامة");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemeMode);

  // Auto-dismiss open modals when switching between pages
  useEffect(() => {
    setShowQueueModal(false);
  }, [currentPage]);

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    const syncTheme = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      setThemeMode(detail || getThemeMode());
    };
    window.addEventListener("app-theme-changed", syncTheme);
    return () => window.removeEventListener("app-theme-changed", syncTheme);
  }, []);

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
  const [services, setServices] = useState<ServiceItem[]>(() =>
    secureStorage.getItem<ServiceItem[]>("pos_services_data", initialServices)
  );
  const [barbers, setBarbers] = useState<Barber[]>(() =>
    secureStorage.getItem<Barber[]>("pos_barbers_data", initialBarbers)
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    secureStorage.getItem<Invoice[]>("pos_invoices_data", initialInvoices)
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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    secureStorage.getItem<AttendanceRecord[]>("pos_attendance_data", initialAttendance)
  );
  const [advances, setAdvances] = useState<AdvanceRecord[]>(() =>
    secureStorage.getItem<AdvanceRecord[]>("pos_advances_data", initialAdvances)
  );

  // Background Auto-Save with Secure Encryption
  useEffect(() => {
    secureStorage.setItem("pos_services_data", services);
  }, [services]);

  useEffect(() => {
    secureStorage.setItem("pos_barbers_data", barbers);
  }, [barbers]);

  useEffect(() => {
    secureStorage.setItem("pos_invoices_data", invoices);
  }, [invoices]);

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

  useEffect(() => {
    secureStorage.setItem("pos_advances_data", advances);
  }, [advances]);

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [pendingCheckoutCart, setPendingCheckoutCart] = useState<CartItem[]>([]);
  const [pendingCheckoutTotal, setPendingCheckoutTotal] = useState(0);
  const [clearCartSignal, setClearCartSignal] = useState(0);
  const [isPosIsolated, setIsPosIsolated] = useState(false);

  // Held Orders & Sidebar Quick Action Signals
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() =>
    secureStorage.getItem<HeldOrder[]>("pos_held_orders_data", [])
  );

  useEffect(() => {
    secureStorage.setItem("pos_held_orders_data", heldOrders);
  }, [heldOrders]);
  const [openPendingSignal, setOpenPendingSignal] = useState(0);
  const [openAdvanceSignal, setOpenAdvanceSignal] = useState(0);
  const [openCashOutSignal, setOpenCashOutSignal] = useState(0);

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

  useEffect(() => {
    if (activeShiftSession) {
      secureStorage.setItem("pos_active_shift_session", activeShiftSession);
    } else {
      secureStorage.removeItem("pos_active_shift_session");
    }
  }, [activeShiftSession]);

  useEffect(() => {
    if (!activeShiftSession) {
      setShiftElapsedSeconds(0);
      return;
    }
    const syncElapsed = () => {
      setShiftElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - activeShiftSession.startTimestamp) / 1000)),
      );
    };
    syncElapsed();
    const timer = window.setInterval(syncElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [activeShiftSession]);

  // Hourly Telegram Digest / Summary Interval
  useEffect(() => {
    let lastSentHour = -1;
    const interval = window.setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      // Send once per hour at top of the hour (or on hour change while app is active)
      if (currentHour !== lastSentHour && now.getMinutes() >= 0) {
        lastSentHour = currentHour;
        const config = getTelegramSettings();
        if (config.enabled && config.notifyHourly && activeShiftSession) {
          const hourFormatted = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
          const currentShift = shifts.find((s) => s.status === "نشطة");
          const drawerCash =
            (currentShift?.openingCash || 0) + (currentShift?.cashSales || 0) - (currentShift?.drawerExpenses || 0);
          const totalToday = invoices.reduce((sum, i) => sum + (i.subtotal || 0), 0);

          sendTelegramHourlyDigest({
            hourStr: hourFormatted,
            hourlyCount: Math.min(invoices.length, 5),
            hourlyRevenue: Math.round(totalToday / Math.max(1, currentHour || 1)),
            totalToday,
            cashInDrawer: drawerCash,
          });
        }
      }
    }, 60000);

    return () => window.clearInterval(interval);
  }, [invoices, shifts, activeShiftSession]);

  // Start Shift handler (replaces Login)
  const handleStartShift = (cashierName: string, openingCash: number) => {
    const now = Date.now();
    const timeStr = new Date(now).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const nextShiftId = Math.max(104, ...shifts.map((s) => s.id)) + 1;

    const newShift: ShiftRecord = {
      id: nextShiftId,
      cashierName,
      openTime: timeStr,
      startTime: timeStr,
      startTimestamp: now,
      startDate: new Date(now).toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      openingCash,
      initialCash: openingCash,
      cashSales: 0,
      cardSales: 0,
      instaPaySales: 0,
      instapaySales: 0,
      totalSales: 0,
      invoiceCount: 0,
      drawerExpenses: 0,
      cashExpenses: 0,
      deposits: 0,
      withdrawals: 0,
      refunds: 0,
      expectedCash: openingCash,
      expectedDrawerCash: openingCash,
      status: "نشطة",
    };

    setShifts((prev) => [
      newShift,
      ...prev.map((s) =>
        s.status === "نشطة"
          ? {
              ...s,
              status: "مغلقة" as const,
              closeTime: s.closeTime || timeStr,
            }
          : s,
      ),
    ]);

    setActiveShiftSession({
      shiftId: nextShiftId,
      cashierName,
      startTimestamp: now,
      openingCash,
    });
    setIsAdminUnlocked(false);
    setIsScreenLocked(false);
    setCurrentPage("pos");
    sfx.playClick();
    showToast(`تم بدء الوردية #${nextShiftId} باسم ${cashierName}`);
    sendTelegramShiftStart(nextShiftId, cashierName, timeStr);

    const newLog: AuditLog = {
      id: `LOG-${Math.floor(100 + Math.random() * 900)}`,
      user: cashierName,
      action: `بدء وردية عمل جديدة #${nextShiftId}`,
      category: "بيع",
      timestamp: new Date(now).toISOString().replace("T", " ").slice(0, 19),
      previousValue: "—",
      newValue: `افتتاحي: ${openingCash} ج.م`,
      reason: "فتح وردية من الشاشة الرئيسية",
      severity: "عادي",
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handle Checkout Open from POS
  const handleOpenCheckout = (cart: CartItem[], total: number) => {
    setPendingCheckoutCart(cart);
    setPendingCheckoutTotal(total);
    setCheckoutModalOpen(true);
  };

  // Handle Payment Complete
  const handlePaymentSuccess = (newInvoice: Invoice) => {
    setInvoices((prev) => [newInvoice, ...prev]);
    setClearCartSignal((s) => s + 1);
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
              expectedDrawerCash: s.openingCash + newCash - s.drawerExpenses,
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
    sendTelegramInvoice(newInvoice, activeShiftSession?.cashierName);
  };

  // Barber Status Update (Punch in/out/break)
  // Update Barber Attendance & Automatic Late Deduction Calculation
  const handleUpdateBarberStatus = (barberId: string, newStatus: Barber["status"], timeStr: string) => {
    const targetBarber = barbers.find((x) => x.id === barberId);
    if (!targetBarber) return;

    const isFreshCheckIn =
      newStatus === "متاح" && (targetBarber.status === "غير حاضر" || targetBarber.status === "منصرف");
    const policy = getAttendancePolicy();
    const scheduledTime = targetBarber.scheduledStartTime || policy.defaultScheduledTime;
    const nowDate = new Date();
    const todayDateStr = nowDate.toLocaleDateString("ar-EG", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const lateMetrics = isFreshCheckIn
      ? calculateLateMetrics(scheduledTime, nowDate, policy)
      : { lateMinutes: 0, lateDeduction: 0 };

    setBarbers((prev) =>
      prev.map((b) => {
        if (b.id !== barberId) return b;
        return {
          ...b,
          status: newStatus,
          checkInTime: isFreshCheckIn ? timeStr : b.checkInTime,
          checkOutTime: isFreshCheckIn ? "—" : newStatus === "منصرف" ? timeStr : b.checkOutTime,
        };
      }),
    );

    const recordStatus: AttendanceRecord["status"] =
      newStatus === "في استراحة"
        ? "في استراحة"
        : newStatus === "منصرف"
          ? "منصرف"
          : newStatus === "غير حاضر"
            ? "لم يحضر"
            : "حاضر";

    setAttendanceRecords((prev) => {
      const todayIdx = prev.findIndex(
        (r) => r.barberId === barberId && r.date === todayDateStr
      );

      if (isFreshCheckIn) {
        const newRec: AttendanceRecord = {
          id: `att-${Date.now()}`,
          barberId,
          barberName: targetBarber.name,
          date: todayDateStr,
          scheduledTime,
          checkIn: timeStr,
          checkOut: "—",
          status: "حاضر",
          hoursWorked: 0,
          workingHours: 0,
          lateMinutes: lateMetrics.lateMinutes,
          minutesLate: lateMetrics.lateMinutes,
          lateDeduction: lateMetrics.lateDeduction,
        };
        if (todayIdx > -1) {
          const next = [...prev];
          next[todayIdx] = newRec;
          return next;
        }
        return [newRec, ...prev];
      }

      if (todayIdx > -1) {
        const next = [...prev];
        const existing = next[todayIdx];
        let workingHours = existing.workingHours ?? existing.hoursWorked ?? 0;
        if (newStatus === "منصرف") {
          const inMins = parseTimeToMinutes(existing.checkIn);
          const outMins = nowDate.getHours() * 60 + nowDate.getMinutes();
          if (inMins !== null && outMins >= inMins) {
            workingHours = Number(((outMins - inMins) / 60).toFixed(1));
          }
        }
        next[todayIdx] = {
          ...existing,
          checkOut: newStatus === "منصرف" ? timeStr : existing.checkOut,
          status: recordStatus,
          workingHours,
          hoursWorked: workingHours,
        };
        return next;
      }

      return prev;
    });

    const lateDesc =
      isFreshCheckIn && lateMetrics.lateMinutes > 0
        ? ` — تأخير ${lateMetrics.lateMinutes} دقيقة (خصم ${lateMetrics.lateDeduction} ج.م)`
        : "";

    addAuditLog(
      `تحديث حالة الحضور للحلاق ${targetBarber.name}`,
      "تعديل حضور",
      targetBarber.status,
      newStatus,
      `في تمام الساعة ${timeStr}${lateDesc}`,
      lateMetrics.lateMinutes > 0 ? "حساس" : "عادي",
    );

    if (newStatus === "متاح" && isFreshCheckIn) {
      sendTelegramAttendance(targetBarber.name, "حضور", timeStr, lateMetrics.lateMinutes > 0, lateMetrics.lateMinutes);
    } else if (newStatus === "منصرف") {
      sendTelegramAttendance(targetBarber.name, "انصراف", timeStr);
    }
  };

  // Admin Updates Next-Day / Scheduled Arrival Time for an Employee
  const handleUpdateBarberSchedule = (barberId: string, scheduledTime: string) => {
    const target = barbers.find((b) => b.id === barberId);
    setBarbers((prev) =>
      prev.map((b) =>
        b.id === barberId ? { ...b, scheduledStartTime: scheduledTime } : b
      )
    );
    if (target) {
      addAuditLog(
        `تحديد ميعاد حضور الغد للموظف ${target.name}`,
        "تعديل حضور",
        target.scheduledStartTime || "09:00",
        scheduledTime,
        "تحديد موعد الحضور لليوم التالي بواسطة الإدارة",
        "عادي",
      );
    }
  };

  // Admin Attendance Correction (recalculates delay & deduction cleanly)
  const handleAdminCorrectAttendance = (
    recordId: string,
    newCheckIn: string,
    newCheckOut: string,
    reason: string,
  ) => {
    const policy = getAttendancePolicy();
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        if (r.id !== recordId) return r;
        const linkedBarber = barbers.find((b) => b.id === r.barberId);
        const sched = r.scheduledTime || linkedBarber?.scheduledStartTime || policy.defaultScheduledTime;
        const metrics = calculateLateMetrics(sched, newCheckIn, policy);
        return {
          ...r,
          scheduledTime: sched,
          checkIn: newCheckIn,
          checkOut: newCheckOut,
          lateMinutes: metrics.lateMinutes,
          minutesLate: metrics.lateMinutes,
          lateDeduction: metrics.lateDeduction,
          correctionNote: reason,
        };
      }),
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

  // Advances & Loans Handlers
  const handleAddAdvance = (newAdvance: AdvanceRecord) => {
    setAdvances((prev) => [newAdvance, ...prev]);
    addAuditLog(
      `تسجيل سلفة جديدة للموظف ${newAdvance.barberName}`,
      "سلفة أو خصم",
      "—",
      `${newAdvance.amount} ج.م (${newAdvance.reason})`,
      `المسجل: ${newAdvance.registeredBy} (${newAdvance.registeredByRole})`,
      "حساس"
    );
    sendTelegramAdvance(
      newAdvance.barberName,
      newAdvance.amount,
      newAdvance.reason,
      newAdvance.registeredBy || "الكاشير",
    );
  };

  const handleEditAdvance = (updatedAdvance: AdvanceRecord) => {
    setAdvances((prev) =>
      prev.map((a) => (a.id === updatedAdvance.id ? updatedAdvance : a))
    );
    addAuditLog(
      `تعديل سلفة للموظف ${updatedAdvance.barberName} (#${updatedAdvance.id})`,
      "سلفة أو خصم",
      "قيمة سابقة",
      `${updatedAdvance.amount} ج.م (الحالة: ${updatedAdvance.status})`,
      updatedAdvance.notes || "تعديل إداري",
      "حساس"
    );
  };

  const handleDeleteAdvance = (id: string) => {
    const target = advances.find((a) => a.id === id);
    setAdvances((prev) => prev.filter((a) => a.id !== id));
    if (target) {
      addAuditLog(
        `حذف سلفة للموظف ${target.barberName} (#${id})`,
        "سلفة أو خصم",
        `${target.amount} ج.م`,
        "محذوفة نهائياً",
        "حذف بواسطة المدير العام",
        "حرج"
      );
    }
  };

  // Cash Out Handler (خروج وصرف نقدية من الدرج)
  const handleCashOut = async (payload: CashOutPayload) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const activeShift = shifts.find((s) => s.status === "نشطة");
    const shiftId = activeShift ? activeShift.id : (activeShiftSession?.shiftId || 104);

    // 1. Deduct immediately from active shift drawer cash
    setShifts((prev) =>
      prev.map((s) =>
        s.status === "نشطة"
          ? {
              ...s,
              drawerExpenses: (s.drawerExpenses || 0) + payload.amount,
              cashExpenses: ((s.cashExpenses ?? s.drawerExpenses) || 0) + payload.amount,
              expectedCash: (s.expectedCash || 0) - payload.amount,
              expectedDrawerCash: ((s.expectedDrawerCash ?? s.expectedCash) || 0) - payload.amount,
            }
          : s
      )
    );

    // 2. If employee advance: also record as AdvanceRecord for payroll deduction
    if (payload.category === "سلفة موظف") {
      const targetBarber = barbers.find((b) => b.id === payload.barberId || b.name === payload.recipient);
      const newAdvance: AdvanceRecord = {
        id: `ADV-${Date.now()}`,
        barberId: targetBarber?.id || payload.barberId || "unknown",
        barberName: targetBarber?.name || payload.recipient,
        amount: payload.amount,
        reason: payload.reason,
        date: dateStr,
        time: timeStr,
        registeredBy: activeShiftSession?.cashierName || "الكاشير",
        registeredByRole: "cashier",
        status: "نشط",
        notes: payload.notes ? `كاشير (درج): ${payload.notes}` : `صرف نقدية من الدرج (وردية #${shiftId})`,
      };
      setAdvances((prev) => [newAdvance, ...prev]);
    } else {
      // 3. Otherwise: record as ExpenseRecord with shiftDeduction
      const newExpense: ExpenseRecord = {
        id: `EXP-${Date.now()}`,
        category: payload.category === "مسحوبات إدارة" ? "مسحوبات" : "تشغيلية ونثريات",
        amount: payload.amount,
        date: dateStr,
        time: timeStr,
        paymentMethod: "نقد من الدرج",
        registeredBy: activeShiftSession?.cashierName || "الكاشير",
        shiftDeduction: true,
        deductedFromDrawer: true,
        description: `${payload.category} — مستلم: ${payload.recipient} — السبب: ${payload.reason}${payload.notes ? ` (${payload.notes})` : ""}`,
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }

    // 4. Record in Audit Log
    addAuditLog(
      `خروج نقدية من الدرج (${payload.category}) بمبلغ ${payload.amount} ج.م`,
      "صرف نقدية",
      `المستلم: ${payload.recipient}`,
      `${payload.amount} ج.م (${payload.reason})`,
      `الكاشير: ${activeShiftSession?.cashierName || "الكاشير"} (وردية #${shiftId})`,
      "حساس"
    );

    // 5. Calculate remaining cash in drawer for Telegram
    const remainingCash =
      (activeShift?.openingCash || 0) +
      (activeShift?.cashSales || 0) -
      ((activeShift?.drawerExpenses || 0) + payload.amount);

    // 6. Send instant Telegram Notification
    sendTelegramCashOut({
      amount: payload.amount,
      category: payload.category,
      recipient: payload.recipient,
      reason: payload.reason,
      cashierName: activeShiftSession?.cashierName || "الكاشير",
      shiftId: shiftId,
      remainingCash: Math.max(0, remainingCash),
    });

    return { ok: true };
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

  const handleDeleteEmployee = (barberId: string) => {
    const target = barbers.find((b) => b.id === barberId);
    setBarbers((prev) => prev.filter((b) => b.id !== barberId));
    addAuditLog(
      `حذف الموظف «${target?.name || barberId}» نهائياً من قاعدة البيانات`,
      "حذف موظف",
      target?.name || barberId,
      "—",
      "إدارة الموظفين",
      "حرج",
    );
    showToast(`تم حذف الموظف «${target?.name || ""}» بنجاح وتحديث قاعدة البيانات`);
  };

  const handleDeleteProduct = (productId: string) => {
    const target = inventory.find((p) => p.id === productId);
    setInventory((prev) => prev.filter((p) => p.id !== productId));
    addAuditLog(
      `حذف الصنف «${target?.name || productId}» من المستودع`,
      "حذف صنف",
      target?.name || productId,
      "—",
      "المستودع والمشتريات",
      "حرج",
    );
    showToast(`تم حذف المنتج «${target?.name || ""}» بنجاح وتحديث المخزون`);
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
                cashExpenses: (s.cashExpenses ?? s.drawerExpenses) + exp.amount,
                expectedCash: s.expectedCash - exp.amount,
                expectedDrawerCash: (s.expectedDrawerCash ?? s.expectedCash) - exp.amount,
              }
            : s,
        ),
      );
    }
  };

  const activeShiftDurationText = formatShiftDuration(shiftElapsedSeconds);
  const currentActiveShift = shifts.find((s) => s.id === activeShiftSession?.shiftId) || shifts.find((s) => s.status === "نشطة");

  // Close Shift
  const handleCloseShift = (shiftId: number, actualCash: number, notes: string, durationOverride?: string) => {
    const durationText = durationOverride || activeShiftDurationText;
    setShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              closeTime: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
              closeDate: new Date().toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              closeTimestamp: Date.now(),
              durationText,
              actualCash,
              difference: actualCash - s.expectedCash,
              status: "مغلقة",
              handoverNotes: notes,
            }
          : s,
      ),
    );
    addAuditLog(
      `إغلاق الوردية #${shiftId} وتسليم الدرج (المدة: ${durationText})`,
      "إغلاق وردية",
      "نشطة",
      `فعلي: ${actualCash} ج.م`,
      notes || "إغلاق الوردية وتسليم العهدة",
      "حرج",
    );

    const targetShift = shifts.find((s) => s.id === shiftId);
    const totalSales =
      (targetShift?.cashSales || 0) + (targetShift?.cardSales || 0) + (targetShift?.instaPaySales || 0);
    sendTelegramShiftClose(
      shiftId,
      activeShiftSession?.cashierName || targetShift?.cashierName || "مسؤول الوردية",
      durationText,
      actualCash,
      totalSales,
    );

    if (activeShiftSession && activeShiftSession.shiftId === shiftId) {
      setActiveShiftSession(null);
      setIsAdminUnlocked(false);
      setIsScreenLocked(false);
      setCloseShiftModalOpen(false);
    }
  };

  const handleOpenCloseShiftModal = () => {
    setCloseShiftModalOpen(true);
  };

  const handleConfirmCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShiftSession) return;
    const expected = currentActiveShift?.expectedDrawerCash ?? currentActiveShift?.expectedCash ?? 0;
    handleCloseShift(activeShiftSession.shiftId, expected, "", activeShiftDurationText);
    sfx.playClick();
  };

  // Screen Title & Subtitle
  const pageTitles: Record<Page, [string, string]> = {
    pos: ["الكاشير", "نقطة البيع وإدارة الطلبات"],
    attendance: ["الحضور والانصراف", "متابعة كراسي الحلاقة والورديات بالرمز السري"],
    invoices: ["سجل الفواتير والمبيعات", "إدارة الفواتير، إعادة الطباعة، والإلغاء والاسترجاع"],
    services: ["دليل الخدمات والباقات", "إدارة قوائم الحلاقة والأسعار والعمولات المحفوظة"],
    inventory: ["المستودع والمشتريات", "متابعة أرصدة الشامبوهات والمستهلكات وتنبيهات النفاد"],
    admin: [isAdminUnlocked ? adminSection : "صفحة الإدارة", "لوحة الإدارة والتحكم والتقارير المحمية بكلمة مرور"],
  };

  // Customer Digital Invoice & Services Menu View (Triggered when QR is scanned by customer)
  const rawSearch = typeof window !== "undefined" ? window.location.search : "";
  const rawHash = typeof window !== "undefined" ? window.location.hash : "";
  const searchOrHash = rawSearch || rawHash;
  const isQrCustomerView =
    typeof window !== "undefined" &&
    (searchOrHash.includes("view=invoice") || searchOrHash.includes("d="));

  if (isQrCustomerView) {
    const queryPart = rawSearch
      ? rawSearch
      : rawHash.includes("?")
        ? "?" + rawHash.split("?")[1]
        : "?" + rawHash.replace(/^#\/?/, "");
    const urlParams = new URLSearchParams(queryPart);
    const dParam = urlParams.get("d");
    const decodedInvoice = dParam ? decodeInvoiceFromQrUrl(dParam) : null;
    return (
      <CustomerInvoiceView
        invoiceData={decodedInvoice}
        onBackToApp={() => {
          window.location.href = window.location.pathname;
        }}
      />
    );
  }

  // Shift Start Screen (replaces LoginScreen)
  if (!activeShiftSession) {
    return <ShiftStartScreen barbers={barbers} onStartShift={handleStartShift} />;
  }

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? "nav-collapsed" : ""} ${
        isPosIsolated && currentPage === "pos" ? "pos-isolated" : ""
      }`}
    >
      {/* 1. Custom Windows Desktop Titlebar */}
      <DesktopTitlebar currentPage={currentPage} />

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

        {/* Current Shift User Card (Text-only, no photo avatar) */}
        {!isSidebarCollapsed && (
          <div className="sidebar-user">
            <div className="user-meta" style={{ width: "100%" }}>
              <div className="user-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#3FB950",
                    boxShadow: "0 0 8px rgba(63, 185, 80, 0.7)",
                    flexShrink: 0,
                  }}
                />
                <span>{activeShiftSession.cashierName}</span>
              </div>
              <span className="user-role-pill">
                وردية #{activeShiftSession.shiftId} • جارية الآن
              </span>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${currentPage === "pos" ? "active" : ""}`}
            onClick={() => setCurrentPage("pos")}
            title="الكاشير (F1)"
          >
            <span className="nav-icon">
              <Icon name="grid" size={20} />
            </span>
            {!isSidebarCollapsed && (
              <>
                <span style={{ flex: 1 }}>الكاشير</span>
                <kbd>F1</kbd>
              </>
            )}
          </button>

          <button
            type="button"
            className={`nav-item ${currentPage === "attendance" ? "active" : ""}`}
            onClick={() => setCurrentPage("attendance")}
            title="الحضور والانصراف"
          >
            <span className="nav-icon">
              <Icon name="clock" size={20} />
            </span>
            {!isSidebarCollapsed && (
              <span style={{ flex: 1 }}>الحضور والانصراف</span>
            )}
          </button>

          {/* Quick Operational Actions inside Sidebar (Right Under Attendance) */}
          <div
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {!isSidebarCollapsed && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--muted)",
                  padding: "2px 10px 4px",
                }}
              >
                إجراءات الكاشير السريعة
              </div>
            )}

            <button
              type="button"
              className="nav-item"
              onClick={() => {
                setCurrentPage("pos");
                setOpenPendingSignal((s) => s + 1);
              }}
              title="الطلبات المعلقة (F4)"
              style={{
                color: heldOrders.length > 0 ? "var(--warning-text)" : undefined,
              }}
            >
              <span className="nav-icon">
                <Icon name="pause" size={18} />
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span style={{ flex: 1 }}>الطلبات المعلقة</span>
                  {heldOrders.length > 0 && (
                    <span
                      style={{
                        fontFamily: "Inter",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "1px 7px",
                        borderRadius: 20,
                        background: "var(--warning-soft)",
                        border: "1px solid var(--warning-border)",
                        color: "var(--warning-text)",
                      }}
                    >
                      {heldOrders.length}
                    </span>
                  )}
                  <kbd>F4</kbd>
                </>
              )}
            </button>


            <button
              type="button"
              className="nav-item"
              onClick={() => {
                setCurrentPage("pos");
                setOpenCashOutSignal((s) => s + 1);
              }}
              title="خروج وصرف نقدية من الدرج (سلفة، مصاريف ونثريات، مسحوبات) - F7"
            >
              <span className="nav-icon" style={{ color: "var(--danger-text)" }}>
                <Icon name="dollarSign" size={18} />
              </span>
              {!isSidebarCollapsed && (
                <>
                  <span style={{ flex: 1, color: "var(--danger-text)", fontWeight: 700 }}>خروج نقدية من الدرج</span>
                  <kbd style={{ color: "var(--danger-text)", borderColor: "var(--danger-border)" }}>F7</kbd>
                </>
              )}
            </button>
          </div>

          {/* Admin Page Navigation Button */}
          <div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              className={`nav-item ${currentPage === "admin" ? "active" : ""}`}
              onClick={() => setCurrentPage("admin")}
              title="صفحة الإدارة"
            >
              <span className="nav-icon">
                <Icon name="shield" size={20} />
              </span>
              {!isSidebarCollapsed && (
                <span style={{ flex: 1 }}>صفحة الإدارة</span>
              )}
            </button>
          </div>

          {/* Admin Sections inside Sidebar when Admin Page is Unlocked */}
          {currentPage === "admin" && isAdminUnlocked && (
            <div
              style={{
                marginTop: 6,
                paddingTop: 10,
                borderTop: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {!isSidebarCollapsed && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--muted)",
                    padding: "2px 10px 6px",
                  }}
                >
                  أقسام الإدارة
                </div>
              )}
              {ADMIN_SECTIONS.map((sec) => {
                const isActive = adminSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    className={`nav-item ${isActive ? "active" : ""}`}
                    onClick={() => setAdminSection(sec.id)}
                    title={sec.label}
                    style={{
                      height: 38,
                      fontSize: 13.5,
                      padding: isSidebarCollapsed ? "0 12px" : "0 14px",
                      gap: 10,
                    }}
                  >
                    <span className="nav-icon">
                      <Icon name={sec.icon} size={17} />
                    </span>
                    {!isSidebarCollapsed && <span style={{ flex: 1 }}>{sec.label}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Sidebar Footer: System Utilities, Live Shift Timer & Close Shift Button */}
        <div className="sidebar-footer">
          {/* Quick Utilities Strip (Theme / Sound / Lock Screen) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSidebarCollapsed ? "1fr" : "repeat(3, 1fr)",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <button
              type="button"
              onClick={() => {
                const next = saveThemeMode(themeMode === "dark" ? "light" : "dark");
                setThemeMode(next);
              }}
              title={themeMode === "light" ? "التبديل إلى الوضع الداكن" : "التبديل إلى الوضع النهاري (Light Mode)"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--border-gold)",
                background: "var(--gold-soft)",
                color: "var(--light-gold)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={themeMode === "light" ? "moon" : "sun"} size={13} />
              {!isSidebarCollapsed && <span>{themeMode === "light" ? "داكن" : "نهاري"}</span>}
            </button>

            <button
              type="button"
              onClick={handleMuteToggle}
              title={isMuted ? "تشغيل أصوات النظام" : "كتم أصوات النظام"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${isMuted ? "var(--danger-border)" : "var(--border)"}`,
                background: isMuted ? "var(--danger-soft)" : "var(--surface-soft)",
                color: isMuted ? "var(--danger-text)" : "var(--text-secondary)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={isMuted ? "volumeX" : "volume"} size={13} />
              {!isSidebarCollapsed && <span>{isMuted ? "صامت" : "صوت"}</span>}
            </button>

            <button
              type="button"
              onClick={() => setIsScreenLocked(!isScreenLocked)}
              title={isScreenLocked ? "إلغاء قفل الشاشة" : "قفل الشاشة السريع"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${isScreenLocked ? "var(--warning-border)" : "var(--border)"}`,
                background: isScreenLocked ? "var(--warning-soft)" : "var(--surface-soft)",
                color: isScreenLocked ? "var(--warning-text)" : "var(--text-secondary)",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={isScreenLocked ? "lock" : "unlock"} size={13} />
              {!isSidebarCollapsed && <span>{isScreenLocked ? "مقفول" : "قفل"}</span>}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div
              style={{
                background: "rgba(63, 185, 80, 0.08)",
                border: "1px solid rgba(63, 185, 80, 0.28)",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Icon name="clock" size={12} />
                <span>مؤقت الوردية الحالية</span>
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--success-text)",
                  fontFamily: "Inter",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: 1.5,
                }}
              >
                {activeShiftDurationText}
              </div>
            </div>
          )}

          <button
            type="button"
            className="logout-btn"
            onClick={handleOpenCloseShiftModal}
            title={`قفل الوردية (${activeShiftDurationText})`}
          >
            <Icon name="lock" size={17} />
            {!isSidebarCollapsed && <span>قفل الوردية</span>}
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
          <div className="topbar" style={{ marginBottom: 16, padding: "4px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="topbar-titles">
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{pageTitles[currentPage][0]}</h1>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>{pageTitles[currentPage][1]}</p>
            </div>
            {currentPage === "admin" && isAdminUnlocked && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setIsAdminUnlocked(false);
                  showToast("تم قفل شاشة الإدارة");
                }}
                style={{ height: 36, padding: "0 14px", fontSize: 12.5 }}
              >
                <Icon name="lock" size={15} />
                <span>قفل شاشة الإدارة</span>
              </button>
            )}
          </div>
        )}

        {/* Screen Content Render */}
        {currentPage === "pos" && (
          <PosPage
            services={services}
            barbers={barbers}
            onCheckout={handleOpenCheckout}
            activeCashier={activeShiftSession.cashierName}
            shiftNumber={activeShiftSession.shiftId}
            onOpenQueue={() => setShowQueueModal(true)}
            onAddAdvance={handleAddAdvance}
            onCashOut={handleCashOut}
            drawerCash={
              (shifts.find((s) => s.status === "نشطة")?.openingCash || 0) +
              (shifts.find((s) => s.status === "نشطة")?.cashSales || 0) -
              (shifts.find((s) => s.status === "نشطة")?.drawerExpenses || 0)
            }
            heldOrders={heldOrders}
            onHeldOrdersChange={setHeldOrders}
            openPendingSignal={openPendingSignal}
            openAdvanceSignal={openAdvanceSignal}
            openCashOutSignal={openCashOutSignal}
            clearCartSignal={clearCartSignal}
            isIsolated={isPosIsolated}
            onToggleIsolated={() => setIsPosIsolated((v) => !v)}
          />
        )}

        {currentPage === "attendance" && (
          <AttendancePage
            barbers={barbers}
            attendanceRecords={attendanceRecords}
            advances={advances}
            userRole="cashier"
            activeEmployeeName={currentUsername}
            onUpdateBarberStatus={handleUpdateBarberStatus}
            onAdminCorrectAttendance={handleAdminCorrectAttendance}
          />
        )}

        {currentPage === "admin" && !isAdminUnlocked && (
          <AdminPasswordGate
            expectedPassword={adminPassword}
            onUnlock={() => {
              setIsAdminUnlocked(true);
              sfx.playClick();
              showToast("تم فتح صفحة الإدارة بنجاح");
            }}
          />
        )}

        {currentPage === "admin" && isAdminUnlocked && (
          <AdminPage
            invoices={invoices}
            barbers={barbers}
            expenses={expenses}
            shifts={shifts}
            auditLogs={auditLogs}
            inventory={inventory}
            services={services}
            advances={advances}
            attendanceRecords={attendanceRecords}
            activeUsername={currentUsername}
            activeSection={adminSection}
            adminPassword={adminPassword}
            onUpdateAdminPassword={(newPass) => {
              setAdminPassword(newPass);
              secureStorage.setItem("pos_admin_password", newPass);
            }}
            onAddAdvance={handleAddAdvance}
            onEditAdvance={handleEditAdvance}
            onDeleteAdvance={handleDeleteAdvance}
            onCancelInvoice={handleCancelInvoice}
            onRefundInvoice={handleRefundInvoice}
            onRevealPhone={handleRevealPhone}
            onSaveService={handleSaveService}
            onToggleServiceStatus={handleToggleServiceStatus}
            onArchiveService={handleArchiveService}
            onAddProduct={handleAddProduct}
            onRecordPurchase={handleRecordPurchase}
            onRecordConsumption={handleRecordConsumption}
            onDeleteProduct={handleDeleteProduct}
            onUpdateBarberStatus={handleUpdateBarberStatus}
            onAdminCorrectAttendance={handleAdminCorrectAttendance}
            onUpdateBarberSchedule={handleUpdateBarberSchedule}
            onDeleteEmployee={handleDeleteEmployee}
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
              showToast("تم تحديث وتطبيق إعدادات الصالون في جميع الشاشات بنجاح");
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
          activeCashier={activeShiftSession.cashierName}
          shiftId={activeShiftSession.shiftId}
        />
      )}

      {/* Close Shift Confirmation Modal */}
      {closeShiftModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440, borderRadius: 20, overflow: "hidden" }}>
            <div className="modal-head" style={{ padding: "18px 22px", background: "var(--surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.06) 100%)",
                    border: "1.5px solid var(--border-gold)",
                    color: "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 10px rgba(212, 175, 55, 0.15)",
                  }}
                >
                  <Icon name="lock" size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "var(--text)" }}>
                      إقفال الوردية
                    </h2>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "var(--surface-soft)",
                        border: "1px solid var(--border-gold)",
                        color: "var(--gold)",
                        fontFamily: "Inter, monospace",
                        direction: "ltr",
                        display: "inline-block",
                      }}
                    >
                      #{activeShiftSession.shiftId}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>
                    إنهاء الجلسة وتسجيل ساعات العمل وتصفية المبيعات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCloseShiftModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
                title="إغلاق النافذة"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmCloseShift} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
              <div className="modal-body" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Confirmation Prompt Banner */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(212, 175, 55, 0.08)",
                    border: "1px solid rgba(212, 175, 55, 0.35)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: "rgba(212, 175, 55, 0.16)",
                      color: "var(--gold)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="alert" size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text)" }}>
                      هل أنت متأكد من إنهاء وإقفال الوردية الحالية؟
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                      سيتم احتساب ساعات العمل وتوثيق الإيرادات بالسجل المحاسبي فوراً.
                    </div>
                  </div>
                </div>

                {/* Shift Details Luxury Card */}
                <div
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {/* Cashier Row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: 10,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
                      <Icon name="scissors" size={16} style={{ color: "var(--gold)" } as React.CSSProperties} />
                      <span>مسؤول الوردية:</span>
                    </div>
                    <strong style={{ color: "var(--text)", fontSize: 14, fontWeight: 800 }}>
                      {activeShiftSession.cashierName}
                    </strong>
                  </div>

                  {/* Duration / Timer Row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 13 }}>
                      <Icon name="clock" size={16} style={{ color: "var(--gold)" } as React.CSSProperties} />
                      <span>ساعات عمل الوردية:</span>
                    </div>
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border-gold)",
                        padding: "4px 12px",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--gold)",
                          boxShadow: "0 0 8px rgba(212, 175, 55, 0.6)",
                        }}
                      />
                      <strong
                        style={{
                          color: "var(--gold)",
                          fontFamily: "Inter, monospace",
                          fontSize: 15,
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: 1,
                          direction: "ltr",
                        }}
                      >
                        {activeShiftDurationText}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div
                className="modal-foot"
                style={{
                  padding: "14px 22px",
                  background: "var(--surface)",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setCloseShiftModalOpen(false)}
                  style={{
                    minWidth: 100,
                    height: 44,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13.5,
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Icon name="lock" size={16} />
                  <span>تأكيد إقفال الوردية</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
              background: "var(--card)",
              border: "1.5px solid var(--gold)",
              borderRadius: 18,
              padding: 36,
              maxWidth: 400,
              width: "100%",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "var(--gold-soft)",
                border: "2px solid var(--gold)",
                color: "var(--gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Icon name="lock" size={28} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 6px" }}>
              شاشة الطرفية مقفلة
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              أدخل كلمة المرور أو رمز PIN لفتح قفل الشاشة ومتابعة العمل
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (lockPin === "1234" || lockPin === adminPassword) {
                  setIsScreenLocked(false);
                  setLockPin("");
                  showToast("تم فتح قفل الشاشة بنجاح");
                } else {
                  alert("كلمة المرور غير صحيحة!");
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
