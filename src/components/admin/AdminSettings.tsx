import { useState, useEffect } from "react";
import { Icon } from "../Icons";
import { getSalonSettings, saveSalonSettings } from "../../utils/salonSettings";
import { getThemeMode, saveThemeMode, ThemeMode } from "../../utils/themeSettings";
import { secureStorage } from "../../utils/secureStorage";
import {
  getPayrollSettings,
  savePayrollSettings,
  calculatePayrollCountdown,
  PayrollCycleType,
  ARABIC_WEEKDAYS,
} from "../../utils/payrollSettings";
import {
  getTelegramSettings,
  saveTelegramSettings,
  sendTelegramMessage,
  sendTelegramDirectMessage,
  fetchTelegramBotUsers,
  checkTelegramForNewStart,
  generateLinkSessionCode,
  getBotDeepLinkUrl,
  TelegramSettings,
  TelegramBotUser,
  TelegramLinkedAccount,
} from "../../utils/telegramSettings";
import {
  getAttendancePolicy,
  saveAttendancePolicy,
  AttendancePolicy,
} from "../../utils/attendancePolicy";
import { sfx } from "../../utils/audio";

const DISMISSED_BOT_USERS_KEY = "telegram_dismissed_bot_users";

function getDismissedBotUsers(): string[] {
  return secureStorage.getItem<string[]>(DISMISSED_BOT_USERS_KEY, []);
}

export function AdminSettings({
  onSaveSettings,
  onShowToast,
  adminPassword,
  onUpdateAdminPassword,
}: {
  onSaveSettings: (settings: Record<string, string>) => void;
  onShowToast: (msg: string) => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (newPass: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"salon" | "telegram" | "general" | "attendance" | "payroll" | "sales" | "security">("salon");
  const [themeMode, setThemeMode] = useState<ThemeMode>(getThemeMode);

  // Telegram Notifications State
  const [telegram, setTelegram] = useState<TelegramSettings>(getTelegramSettings);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [botUsers, setBotUsers] = useState<TelegramBotUser[]>([]);
  const [scanningUsers, setScanningUsers] = useState(false);

  // Link Another Account State (ربط حساب إضافي)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccPhone, setNewAccPhone] = useState("");
  const [newAccChatId, setNewAccChatId] = useState("");
  const [newAccRole, setNewAccRole] = useState("شريك مالك");

  // Auto-Link One-Click Flow State (الربط التلقائي بنقرة واحدة)
  const [autoLinkActive, setAutoLinkActive] = useState(false);
  const [autoLinkSeconds, setAutoLinkSeconds] = useState(60);
  const [autoLinkRole, setAutoLinkRole] = useState("المدير العام (الرئيسي)");
  const [autoLinkSuccessUser, setAutoLinkSuccessUser] = useState<{ name: string; chatId: string } | null>(null);
  const [linkSessionCode, setLinkSessionCode] = useState("");

  // Payroll Cycle Settings
  const initialPayroll = getPayrollSettings();
  const [payrollCycle, setPayrollCycle] = useState<PayrollCycleType>(initialPayroll.cycleType);
  const [monthlyPayDay, setMonthlyPayDay] = useState<number>(initialPayroll.monthlyPayDay);
  const [weeklyPayDay, setWeeklyPayDay] = useState<number>(initialPayroll.weeklyPayDay);

  // Attendance & Late Policy State (سياسة التأخير والخصم الصباحي)
  const [attendancePolicy, setAttendancePolicy] = useState<AttendancePolicy>(getAttendancePolicy);
  const [simulatedDelayMinutes, setSimulatedDelayMinutes] = useState<number>(30);

  // Admin Password Change State
  const [currentAdminPass, setCurrentAdminPass] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [confirmAdminPass, setConfirmAdminPass] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passError, setPassError] = useState("");

  useEffect(() => {
    const syncTheme = (e: Event) => {
      const detail = (e as CustomEvent<ThemeMode>).detail;
      if (detail) setThemeMode(detail);
      else setThemeMode(getThemeMode());
    };
    window.addEventListener("app-theme-changed", syncTheme);
    return () => window.removeEventListener("app-theme-changed", syncTheme);
  }, []);

  // Load existing saved settings
  const initial = getSalonSettings();
  const [salonName, setSalonName] = useState(initial.salonName);
  const [address, setAddress] = useState(initial.address);
  const [phone, setPhone] = useState(initial.phone);
  const [taxNumber, setTaxNumber] = useState(initial.taxNumber);
  const [commercialReg, setCommercialReg] = useState(initial.commercialReg);
  const [qrPortalUrl, setQrPortalUrl] = useState(initial.qrPortalUrl || "https://hassan-obaed.github.io/LAMSAT-KHALEEJI/");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveSalonSettings({
      salonName,
      address,
      phone,
      taxNumber,
      commercialReg,
      qrPortalUrl,
    });

    savePayrollSettings({
      cycleType: payrollCycle,
      monthlyPayDay: Number(monthlyPayDay) || 28,
      weeklyPayDay: Number(weeklyPayDay) || 4,
    });

    saveAttendancePolicy(attendancePolicy);
    saveTelegramSettings(telegram);

    onSaveSettings({
      salonName: updated.salonName,
      address: updated.address,
      phone: updated.phone,
      taxNumber: updated.taxNumber,
      commercialReg: updated.commercialReg,
      qrPortalUrl: updated.qrPortalUrl || "",
    });
    onShowToast("تم حفظ كافة إعدادات النظام وسياسات الحضور وتليجرام بنجاح");
  };

  const handleSaveAttendancePolicy = () => {
    saveAttendancePolicy(attendancePolicy);
    onShowToast("تم حفظ وتطبيق سياسة الحضور والخصومات بنجاح وتحديث مسير الرواتب تلقائياً");
  };

  const handleAddAccount = () => {
    if (!newAccName.trim() || !newAccChatId.trim()) {
      onShowToast("يرجى كتابة اسم صاحب الحساب ومعرف تليجرام (Chat ID)");
      return;
    }
    const cleanId = newAccChatId.trim();
    const existingAccounts = telegram.accounts || [
      { id: telegram.chatId, name: telegram.adminName || "المدير العام", role: "المدير العام (الرئيسي)", isPrimary: true },
    ];

    if (existingAccounts.some((a) => a.id === cleanId)) {
      onShowToast("هذا الحساب مرتبط بالفعل!");
      return;
    }

    const newAcc: TelegramLinkedAccount = {
      id: cleanId,
      name: newAccName.trim(),
      phone: newAccPhone.trim(),
      role: newAccRole,
      isPrimary: false,
      addedAt: new Date().toLocaleDateString("ar-EG"),
    };

    const updatedAccounts = [...existingAccounts, newAcc];
    const updatedIds = Array.from(new Set([...(telegram.authorizedChatIds || []), cleanId]));
    const nextTelegram: TelegramSettings = {
      ...telegram,
      accounts: updatedAccounts,
      authorizedChatIds: updatedIds,
    };

    setTelegram(nextTelegram);
    saveTelegramSettings(nextTelegram);
    setShowAddAccountModal(false);
    setNewAccName("");
    setNewAccPhone("");
    setNewAccChatId("");
    onShowToast(`تم ربط حساب «${newAcc.name}» بنجاح! ستصله جميع الإشعارات من الآن`);

    sendTelegramDirectMessage(
      cleanId,
      `<b>تم ربط حسابك واعتماده في صالون لمسة خليجي</b>\n━━━━━━━━━━━━━━━━\nأهلاً بك <b>${newAcc.name}</b> (${newAcc.role})\nتم تفعيل استلام إشعارات الفواتير، الحضور والانصراف، والدرج المالي على هذا الحساب بنجاح.`
    );
  };

  const handleRemoveAccount = (idToRemove: string) => {
    const existing = telegram.accounts && telegram.accounts.length > 0
      ? telegram.accounts
      : telegram.chatId
        ? [{ id: telegram.chatId, name: telegram.adminName || "المدير العام", role: "المدير العام (الرئيسي)", isPrimary: true }]
        : [];

    const target = existing.find((a) => a.id === idToRemove);
    const targetName = target?.name || `حساب ${idToRemove}`;

    if (existing.length <= 1) {
      if (!window.confirm(`«${targetName}» هو الحساب الوحيد المرتبط بالنظام حالياً.\n\nهل أنت متأكد من حذفه وإلغاء الربط؟ سيتوقف استقبال الإشعارات على تليجرام حتى تقوم بربط حساب جديد.`)) {
        return;
      }
      const nextTelegram: TelegramSettings = {
        ...telegram,
        chatId: "",
        adminName: "",
        accounts: [],
        authorizedChatIds: [],
      };
      setTelegram(nextTelegram);
      saveTelegramSettings(nextTelegram);
      onShowToast(`تم حذف وإلغاء ربط حساب «${targetName}» وتفريغ قائمة الحسابات بنجاح`);
      return;
    }

    if (!window.confirm(`هل أنت متأكد من إلغاء ربط وحذف حساب «${targetName}»؟ لن تصله أي إشعارات بعد الآن.`)) {
      return;
    }

    const updatedAccounts = existing.filter((a) => a.id !== idToRemove);
    const updatedIds = (telegram.authorizedChatIds || []).filter((id) => id !== idToRemove);
    let nextChatId = telegram.chatId;
    let nextAdminName = telegram.adminName;

    if (telegram.chatId === idToRemove || target?.isPrimary) {
      if (updatedAccounts.length > 0) {
        updatedAccounts[0].isPrimary = true;
        nextChatId = updatedAccounts[0].id;
        nextAdminName = updatedAccounts[0].name;
      } else {
        nextChatId = "";
        nextAdminName = "";
      }
    }

    const nextTelegram: TelegramSettings = {
      ...telegram,
      chatId: nextChatId,
      adminName: nextAdminName,
      accounts: updatedAccounts,
      authorizedChatIds: updatedIds,
    };

    setTelegram(nextTelegram);
    saveTelegramSettings(nextTelegram);
    onShowToast(`تم حذف وإلغاء ربط حساب «${targetName}» بنجاح`);
  };

  const handleDismissBotUser = (chatId: string) => {
    const user = botUsers.find((u) => u.chatId === chatId);
    const userName = user ? `${user.firstName} ${user.lastName || ""}`.trim() : chatId;

    const isConnected =
      telegram.chatId === chatId ||
      (telegram.authorizedChatIds || []).includes(chatId) ||
      (telegram.accounts || []).some((a) => a.id === chatId);

    const confirmMsg = isConnected
      ? `حساب «${userName}» متصل حالياً بالنظام.\n\nهل أنت متأكد من حذف الاتصال وإلغاء ربطه وحظره من استلام الإشعارات وإزالته من قائمة التحكم؟`
      : `هل أنت متأكد من حذف حساب «${userName}» وإزالته من قائمة الحسابات التي تواصلت مع البوت؟`;

    if (!window.confirm(confirmMsg)) return;

    if (isConnected) {
      handleRemoveAccount(chatId);
    }

    const currentDismissed = getDismissedBotUsers();
    const updatedDismissed = Array.from(new Set([...currentDismissed, chatId]));
    secureStorage.setItem(DISMISSED_BOT_USERS_KEY, updatedDismissed);

    setBotUsers((prev) => prev.filter((u) => u.chatId !== chatId));
    onShowToast(`تم حذف حساب «${userName}» من القائمة بنجاح`);
  };

  const handleClearAllBotUsers = () => {
    if (botUsers.length === 0) return;
    if (!window.confirm(`هل أنت متأكد من مسح جميع الحسابات المعروضة في قائمة التحكم (${botUsers.length} حساب)؟\n(ملاحظة: الحسابات المعتمدة المرتبطة ستظل في قائمة الإشعارات ما لم تحذفها بشكل منفصل).`)) {
      return;
    }
    const allIds = botUsers.map((u) => u.chatId);
    const currentDismissed = getDismissedBotUsers();
    const updatedDismissed = Array.from(new Set([...currentDismissed, ...allIds]));
    secureStorage.setItem(DISMISSED_BOT_USERS_KEY, updatedDismissed);
    setBotUsers([]);
    onShowToast("تم مسح قائمة الحسابات المعروضة بنجاح");
  };

  const handleTestSpecificAccount = async (account: TelegramLinkedAccount) => {
    onShowToast(`جارٍ إرسال رسالة تجربة لحساب «${account.name}»...`);
    const msg = [
      `<b>تجربة اتصال وإشعار معتمد — صالون لمسة خليجي</b>`,
      `━━━━━━━━━━━━━━━━`,
      `<b>المستلم:</b> ${account.name} (${account.role || "شريك/مدير"})`,
      account.phone ? `<b>رقم الهاتف:</b> <code>${account.phone}</code>` : "",
      `<b>معرف الحساب:</b> <code>${account.id}</code>`,
      `━━━━━━━━━━━━━━━━`,
      `<b>حالة الاتصال:</b> الحساب نشط ومعتمد ومربوط بنظام الإشعارات اللحظية.`,
      `<b>التوقيت:</b> ${new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
      `━━━━━━━━━━━━━━━━`,
      `<i>صالون لمسة خليجي الفاخر</i>`,
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await sendTelegramDirectMessage(account.id, msg);
    if (ok) {
      onShowToast(`تم إرسال رسالة التحقق بنجاح لحساب «${account.name}»`);
    } else {
      onShowToast(`تعذر الإرسال لحساب «${account.name}» — تأكد أنه ضغط /start للبوت`);
    }
  };

  const handleStartAutoLink = (role: string = "المدير العام (الرئيسي)") => {
    const token = telegram.botToken || "9086382022:AAHirhhUEtVxjTF72wMuhQItorstWgtnLbY";
    if (!telegram.botToken) {
      setTelegram((prev) => ({ ...prev, botToken: token }));
    }
    const code = generateLinkSessionCode();
    setLinkSessionCode(code);
    setAutoLinkRole(role);
    setAutoLinkSeconds(90);
    setAutoLinkActive(true);
    setAutoLinkSuccessUser(null);

    // Open Telegram via deep link (triggers Telegram app on Windows / Mobile or Web)
    const botUrl = getBotDeepLinkUrl("lamsat_khaleeji_pos_bot", code);
    try {
      window.open(botUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = botUrl;
    }

    onShowToast("تم فتح تليجرام! اضغط زر Start في البوت ليتم ربط الحساب فوراً تلقائياً");
  };

  // Real-time listener for Telegram /start button click
  useEffect(() => {
    if (!autoLinkActive) return;
    const token = telegram.botToken || "9086382022:AAHirhhUEtVxjTF72wMuhQItorstWgtnLbY";
    const startTimestamp = Math.floor(Date.now() / 1000);
    let isCancelled = false;

    const countdownTimer = setInterval(() => {
      setAutoLinkSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          setAutoLinkActive(false);
          onShowToast("انتهت مهلة الربط التلقائي. يمكنك الضغط مجدداً للبدء");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const poller = setInterval(async () => {
      if (isCancelled) return;
      try {
        const found = await checkTelegramForNewStart(token, startTimestamp, linkSessionCode);
        if (found && !isCancelled) {
          isCancelled = true;
          clearInterval(poller);
          clearInterval(countdownTimer);
          setAutoLinkActive(false);

          const fullName = `${found.firstName} ${found.lastName}`.trim() || found.username || `مستخدم ${found.chatId}`;
          setAutoLinkSuccessUser({ name: fullName, chatId: found.chatId });

          try {
            sfx.playCashRegister();
          } catch {}

          const isPrimary = autoLinkRole.includes("الرئيسي") || autoLinkRole.includes("المدير العام");

          const existingAccounts =
            telegram.accounts && telegram.accounts.length > 0
              ? [...telegram.accounts]
              : [
                  {
                    id: telegram.chatId || found.chatId,
                    name: telegram.adminName || fullName,
                    phone: telegram.adminPhone || "",
                    role: "المدير العام (الرئيسي)",
                    isPrimary: true,
                  },
                ];

          let updatedAccounts: TelegramLinkedAccount[];
          const existingIdx = existingAccounts.findIndex((a) => a.id === found.chatId);

          if (existingIdx >= 0) {
            updatedAccounts = existingAccounts.map((a, idx) =>
              idx === existingIdx
                ? { ...a, name: fullName, role: autoLinkRole, isPrimary: isPrimary ? true : a.isPrimary }
                : isPrimary
                ? { ...a, isPrimary: false }
                : a
            );
          } else {
            if (isPrimary) {
              updatedAccounts = existingAccounts.map((a) => ({ ...a, isPrimary: false }));
              updatedAccounts.unshift({
                id: found.chatId,
                name: fullName,
                role: autoLinkRole,
                isPrimary: true,
                addedAt: new Date().toLocaleDateString("ar-EG"),
              });
            } else {
              updatedAccounts = [
                ...existingAccounts,
                {
                  id: found.chatId,
                  name: fullName,
                  role: autoLinkRole,
                  isPrimary: false,
                  addedAt: new Date().toLocaleDateString("ar-EG"),
                },
              ];
            }
          }

          const authorizedIds = Array.from(new Set([...(telegram.authorizedChatIds || []), found.chatId]));

          const nextTelegram: TelegramSettings = {
            ...telegram,
            enabled: true,
            chatId: isPrimary ? found.chatId : telegram.chatId || found.chatId,
            adminName: isPrimary ? fullName : telegram.adminName || fullName,
            accounts: updatedAccounts,
            authorizedChatIds: authorizedIds,
          };

          setTelegram(nextTelegram);
          saveTelegramSettings(nextTelegram);
          setShowAddAccountModal(false);

          onShowToast(`تم ربط حساب «${fullName}» بنجاح وتفعيل الإشعارات تلقائياً`);

          // Send an immediate welcome message directly to this linked chat
          const welcomeMsg = [
            `<b>تم ربط حسابك بنجاح بنظام صالون لمسة خليجي</b>`,
            `━━━━━━━━━━━━━━━━`,
            `<b>الاسم المعتمد:</b> ${fullName}`,
            `<b>الصفة:</b> ${autoLinkRole}`,
            `<b>معرف الحساب:</b> <code>${found.chatId}</code>`,
            `━━━━━━━━━━━━━━━━`,
            `<b>تم تفعيل الإشعارات المباشرة والمشفرة:</b>`,
            `• إشعارات الفواتير والمبيعات اللحظية`,
            `• إشعارات خروج النقدية وسندات الصرف من الدرج`,
            `• إشعارات حضور وانصراف الحلاقين والورديات`,
            `━━━━━━━━━━━━━━━━`,
            `<b>التوقيت:</b> ${new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
            `<i>صالون لمسة خليجي الفاخر — أهلاً بك</i>`,
          ].join("\n");

          sendTelegramDirectMessage(found.chatId, welcomeMsg);
        }
      } catch (err) {
        console.warn("Auto-link poller error:", err);
      }
    }, 1200);

    return () => {
      isCancelled = true;
      clearInterval(poller);
      clearInterval(countdownTimer);
    };
  }, [autoLinkActive, telegram, linkSessionCode, autoLinkRole]);

  const handleScanBotUsers = async () => {
    if (!telegram.botToken) {
      onShowToast("يرجى إدخال كود البوت أولاً (Bot Token)");
      return;
    }
    setScanningUsers(true);
    try {
      const rawUsers = await fetchTelegramBotUsers(telegram.botToken);
      const dismissed = getDismissedBotUsers();
      const users = rawUsers.filter((u) => !dismissed.includes(u.chatId));
      setBotUsers(users);
      if (users.length === 0) {
        if (rawUsers.length > 0) {
          onShowToast("جميع الحسابات التي فتحت البوت تم حذفها أو إخفاؤها مسبقاً");
        } else {
          onShowToast("لم يتم العثور على محادثات جديدة في البوت — افتح البوت واضغط /start أولاً");
        }
      } else {
        onShowToast(`تم فحص الحسابات المتصلة: وُجد ${users.length} حسابات`);
      }
    } catch {
      onShowToast("تعذر فحص حسابات تليجرام");
    } finally {
      setScanningUsers(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    saveTelegramSettings(telegram);
    const msg = [
      `<b>إشعار تحقق أمني معتمد — صالون لمسة خليجي</b>`,
      `━━━━━━━━━━━━━━━━`,
      `<b>المدير المعتمد:</b> ${telegram.adminName || "المدير العام (Z E)"}`,
      telegram.adminPhone ? `<b>رقم الموبايل المسجل:</b> <code>${telegram.adminPhone}</code>` : "",
      telegram.adminEmail ? `<b>البريد المعتمد:</b> <code>${telegram.adminEmail}</code>` : "",
      `<b>معرف الحساب (Chat ID):</b> <code>${telegram.chatId}</code>`,
      `━━━━━━━━━━━━━━━━`,
      `<b>حالة الأمان والخصوصية:</b>`,
      `تم تفعيل درع الحماية المشفر وقفل الإشعارات على هذا الحساب فقط.`,
      `لن تصل أي فواتير أو نقدية أو تفاصيل رواد الصالون لأي شخص آخر إطلاقاً.`,
      `<b>التوقيت:</b> ${new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
      `━━━━━━━━━━━━━━━━`,
      `<i>نظام لمسة خليجي الفاخر لإدارة الصالونات</i>`,
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await sendTelegramMessage(msg);
    setTestingTelegram(false);
    if (ok) {
      onShowToast("تم إرسال رسالة أمان تجريبية إلى حسابك المعتمد فقط");
    } else {
      onShowToast("تعذر الإرسال! يرجى التأكد من تشغيل البوت والإنترنت");
    }
  };

  const previewCountdown = calculatePayrollCountdown({
    cycleType: payrollCycle,
    monthlyPayDay: Number(monthlyPayDay) || 28,
    weeklyPayDay: Number(weeklyPayDay) || 4,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
            إعدادات وتهيئة النظام
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            تخصيص الهوية التجارية للصالون، القواعد التشغيلية، ومعايير الأمان
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { id: "salon", label: "بيانات الصالون والفرع" },
          { id: "telegram", label: "إشعارات تليجرام الفورية" },
          { id: "general", label: "الإعدادات العامة والعملة" },
          { id: "payroll", label: "مواعيد ودورة صرف الرواتب" },
          { id: "attendance", label: "سياسات الحضور والانصراف" },
          { id: "sales", label: "سياسات الكاشير والمبيعات" },
          { id: "security", label: "الأمان وكلمة مرور الإدارة" },
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
              background: activeTab === tab.id ? "var(--gold-soft)" : "var(--surface-2)",
              border: `1px solid ${activeTab === tab.id ? "var(--gold)" : "var(--border)"}`,
              color: activeTab === tab.id ? "var(--light-gold)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
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

              {/* QR Customer Invoice & Services Portal Configuration */}
              <div
                style={{
                  marginTop: 6,
                  padding: "16px 18px",
                  borderRadius: 12,
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border-gold)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="tag" size={18} style={{ color: "var(--gold)" } as React.CSSProperties} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                      الفاتورة الإلكترونية ورابط رمز الـ QR لجوال العميل:
                    </span>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      const origin = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
                      window.open(`${origin}?view=invoice`, "_blank");
                    }}
                    style={{ height: 32, padding: "0 12px", fontSize: 11.5, gap: 5 }}
                    title="فتح صفحة الفاتورة الإلكترونية وقائمة الخدمات لمعاينتها كأنك عميل يمسح الكود"
                  >
                    <Icon name="eye" size={13} />
                    <span>معاينة صفحة العميل</span>
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    رابط استضافة الصالون العام المضمّن داخل كود الـ QR:
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={qrPortalUrl}
                    onChange={(e) => setQrPortalUrl(e.target.value)}
                    placeholder="https://hassan-obaed.github.io/LAMSAT-KHALEEJI/"
                    style={{ fontFamily: "Inter, monospace", fontSize: 13, direction: "ltr", textAlign: "right" }}
                  />
                </div>

                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--muted)",
                    lineHeight: 1.6,
                    background: "var(--card)",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <strong style={{ color: "var(--light-gold)" }}>كيف تجعل الـ QR يفتح على موبايل أي عميل في المحل؟</strong>
                  <br />
                  1. رمز الـ QR المطبوع على الفاتورة يحمل تفاصيل الفاتورة وقائمة خدمات الصالون ورابط الحجز عبر واتساب.
                  <br />
                  2. عندما يعمل الكاشير على جهاز الكمبيوتر محلياً (Offline أو .exe)، لا تستطيع هواتف العملاء الاتصال بـ <code>localhost</code> عبر باقة الموبايل 4G/5G.
                  <br />
                  3. الحل الموصى به: رفع واجهة التطبيق مجاناً على (Vercel أو Netlify أو GitHub Pages) ووضع الرابط هنا؛ فيفتح الكود فوراً لأي عميل في ثانية واحدة!
                </div>
              </div>

              {/* Salon Payroll Cycle Configuration */}
              <div
                style={{
                  marginTop: 6,
                  padding: "16px 18px",
                  borderRadius: 12,
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border-gold)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="dollarSign" size={18} style={{ color: "var(--gold)" } as React.CSSProperties} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                      نظام ودورة صرف الرواتب للمحل:
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700 }}>
                    {payrollCycle === "monthly" ? "صرف شهري" : payrollCycle === "weekly" ? "صرف أسبوعي" : "صرف يومي"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { id: "monthly" as const, label: "شهري", sub: "راتب كل شهر" },
                    { id: "weekly" as const, label: "أسبوعي", sub: "راتب كل أسبوع" },
                    { id: "daily" as const, label: "يومي (يومية)", sub: "صرف يومي بنهاية الوردية" },
                  ].map((opt) => {
                    const active = payrollCycle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPayrollCycle(opt.id)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 8,
                          border: `1.5px solid ${active ? "var(--gold)" : "var(--border)"}`,
                          background: active ? "var(--gold-soft)" : "var(--card)",
                          color: active ? "var(--light-gold)" : "var(--text)",
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{opt.label}</span>
                        <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {payrollCycle === "monthly" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>يوم القبض الشهري:</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={monthlyPayDay}
                      onChange={(e) => setMonthlyPayDay(Number(e.target.value))}
                      className="form-input"
                      style={{ width: 80, height: 36, padding: "0 8px", textAlign: "center", fontWeight: 700 }}
                    />
                    <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
                      يوم {monthlyPayDay} من كل شهر ميلادي
                    </span>
                  </div>
                )}

                {payrollCycle === "weekly" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>يوم القبض الأسبوعي:</label>
                    <select
                      value={weeklyPayDay}
                      onChange={(e) => setWeeklyPayDay(Number(e.target.value))}
                      className="form-input"
                      style={{ width: 140, height: 36, padding: "0 8px", fontWeight: 700 }}
                    >
                      {ARABIC_WEEKDAYS.map((dayName, idx) => (
                        <option key={idx} value={idx}>
                          كل يوم {dayName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "telegram" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 640 }}>
              {/* Header Status Card */}
              <div
                style={{
                  background: telegram.enabled ? "rgba(46, 204, 113, 0.08)" : "var(--surface-soft)",
                  border: `1.5px solid ${telegram.enabled ? "rgba(46, 204, 113, 0.4)" : "var(--border)"}`,
                  borderRadius: 14,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #0088cc 0%, #006699 100%)",
                      color: "#FFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      boxShadow: "0 4px 14px rgba(0, 136, 204, 0.3)",
                    }}
                  >
                    <Icon name="send" size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>
                      إشعارات بوت تليجرام الفورية (Telegram Live Alerts)
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      ربط إشعارات الحضور، الفواتير، الورديات، وتذكيرات الدرج بحساب صاحب الصالون
                    </div>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={telegram.enabled}
                    onChange={(e) => setTelegram((prev) => ({ ...prev, enabled: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: "var(--gold)" }}
                  />
                  <span style={{ fontWeight: 800, fontSize: 13, color: telegram.enabled ? "var(--success-text)" : "var(--muted)" }}>
                    {telegram.enabled ? "مفعّل ونشط" : "معطل"}
                  </span>
                </label>
              </div>

              {/* Security & Whitelist Protection Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(212, 175, 55, 0.08) 100%)",
                  border: "1.5px solid rgba(46, 204, 113, 0.4)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
                    color: "#FFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 4px 14px rgba(46, 204, 113, 0.3)",
                  }}
                >
                  <Icon name="shield" size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>
                    نظام الحماية الصارمة وحصر الإشعارات على المدير العام فقط (Strict Security Lock)
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6 }}>
                    <strong>البوت مشفر ومقفل على حسابك الخاص:</strong> لا يمكن لأي شخص غريب أو زبون استلام أي إشعارات أو بيانات تخص المحل. تُرسل التقارير والفواتير وحركة الدرج <u>حصرياً</u> إلى رقم الهاتف والبريد والمعرف المسجلين بالأسفل والمعتمدين من قِبلك. أي شخص آخر يفتح البوت يتم حظره وتجاهله فوراً.
                  </div>
                </div>
              </div>

              {/* Success Notification Banner if just linked */}
              {autoLinkSuccessUser && (
                <div
                  style={{
                    background: "rgba(46, 204, 113, 0.15)",
                    border: "2px solid #2ecc71",
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    boxShadow: "0 4px 16px rgba(46, 204, 113, 0.2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "#2ecc71",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="check" size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "var(--text)" }}>
                        تم ربط حسابك في تليجرام بنجاح وتفعيل الإشعارات!
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        الحساب المعتمد: <b>{autoLinkSuccessUser.name}</b> (معرف Chat ID: <code>{autoLinkSuccessUser.chatId}</code>) — تم إرسال رسالة ترحيبية فورية إلى تليجرام.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setAutoLinkSuccessUser(null)}
                    style={{ height: 32, padding: "0 10px", fontSize: 11 }}
                  >
                    إغلاق
                  </button>
                </div>
              )}

              {/* One-Click Auto-Link Hero Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(0, 136, 204, 0.12) 0%, rgba(212, 175, 55, 0.12) 100%)",
                  border: "2px solid #0088cc",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  boxShadow: "0 6px 20px rgba(0, 136, 204, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #0088cc 0%, #00a2ed 100%)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 12px rgba(0, 136, 204, 0.35)",
                      }}
                    >
                      <Icon name="zap" size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)" }}>
                        الربط التلقائي الفوري بنقرة واحدة (One-Click Auto-Link)
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
                        اضغط الزر، وسيفتح تليجرام على جهازك.. فقط اضغط <b>Start</b> داخل المحادثة وسيرتبط حسابك فوراً بدون كتابة أرقام!
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartAutoLink("المدير العام (الرئيسي)")}
                    disabled={autoLinkActive}
                    style={{
                      background: autoLinkActive
                        ? "rgba(0, 136, 204, 0.5)"
                        : "linear-gradient(135deg, #0088cc 0%, #006699 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px 22px",
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: autoLinkActive ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 4px 14px rgba(0, 136, 204, 0.35)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Icon name="send" size={16} />
                    <span>{autoLinkActive ? "جارٍ انتظار الضغط على Start..." : "فتح تليجرام والربط التلقائي"}</span>
                  </button>
                </div>

                {/* Active Listening Animated Box */}
                {autoLinkActive && (
                  <div
                    style={{
                      background: "rgba(0, 136, 204, 0.1)",
                      border: "1.5px dashed #0088cc",
                      borderRadius: 12,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name="radio" size={20} style={{ color: "#0088cc" } as React.CSSProperties} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text)" }}>
                          نافذة تليجرام فُتحت الآن! اضغط زر <b>Start</b> (أو ابدأ) بالأسفل للربط
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                          متبقي من مهلة الاستماع: <b style={{ color: "#0088cc" }}>{autoLinkSeconds}</b> ثانية
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const url = getBotDeepLinkUrl("lamsat_khaleeji_pos_bot", linkSessionCode);
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        style={{
                          background: "#0088cc",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        إعادة فتح تليجرام
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoLinkActive(false)}
                        style={{
                          background: "var(--surface)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bot Credentials & Authorized Manager Profile */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  بيانات المدير العام المعتمد لاستلام الإشعارات (Authorized Admin)
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800 }}>
                      اسم المدير العام المعتمد:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={telegram.adminName || ""}
                      onChange={(e) => setTelegram((prev) => ({ ...prev, adminName: e.target.value }))}
                      placeholder="مثال: المدير العام (Z E)"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 800 }}>
                      رقم موبايل المدير المسجل:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={telegram.adminPhone || ""}
                      onChange={(e) => setTelegram((prev) => ({ ...prev, adminPhone: e.target.value }))}
                      placeholder="مثال: 01012345678 أو +2010..."
                      style={{ direction: "ltr", textAlign: "right" }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>
                    البريد الإلكتروني المعتمد للمدير:
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={telegram.adminEmail || ""}
                    onChange={(e) => setTelegram((prev) => ({ ...prev, adminEmail: e.target.value }))}
                    placeholder="مثال: manager@lamsat-khaleeji.com"
                    style={{ direction: "ltr", textAlign: "right" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                    يُوثق في سجل الأمان وسندات الإدارة لربط هوية المدير بالبوت.
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 800 }}>
                    كود البوت السري (Bot API Token):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={telegram.botToken}
                    onChange={(e) => setTelegram((prev) => ({ ...prev, botToken: e.target.value }))}
                    placeholder="9086382022:AAHirhhUEtVxjTF72wMuhQItorstWgtnLbY"
                    style={{ fontFamily: "Inter, monospace", fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                    البوت المعتمد الحالي: <b>@lamsat_khaleeji_pos_bot</b>
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="form-label" style={{ fontWeight: 800 }}>
                      معرف تليجرام المعتمد للحساب (Chat ID):
                    </label>
                    <button
                      type="button"
                      onClick={handleScanBotUsers}
                      disabled={scanningUsers}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--gold)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon name="search" size={12} />
                      <span>{scanningUsers ? "جارٍ الفحص..." : "فحص الحسابات المتصلة بالبوت"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={telegram.chatId}
                    onChange={(e) => {
                      const id = e.target.value.trim();
                      setTelegram((prev) => ({
                        ...prev,
                        chatId: id,
                        authorizedChatIds: [id],
                      }));
                    }}
                    placeholder="مثال: 8503272906"
                    style={{ fontFamily: "Inter, monospace", fontSize: 13 }}
                  />
                  <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                    معرف حسابك الفعلي المستلم الحصري للإشعارات (حالياً: <b>8503272906</b>).
                  </span>
                </div>

                {/* Scanned Accounts Whitelist Inspector */}
                {botUsers.length > 0 && (
                  <div
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      marginTop: 4,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text)", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>الحسابات التي حاولت التواصل مع البوت (قائمة التحكم بالوصول):</span>
                      <button
                        type="button"
                        onClick={handleClearAllBotUsers}
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "var(--muted)",
                          fontSize: 11,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        مسح القائمة
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {botUsers.map((u) => {
                        const isAuthorized =
                          telegram.chatId === u.chatId ||
                          (telegram.authorizedChatIds || []).includes(u.chatId) ||
                          (telegram.accounts || []).some((a) => a.id === u.chatId);
                        const linkedAcc = (telegram.accounts || []).find((a) => a.id === u.chatId);
                        const isPrimary = telegram.chatId === u.chatId || Boolean(linkedAcc?.isPrimary);

                        return (
                          <div
                            key={u.chatId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "9px 12px",
                              borderRadius: 8,
                              background: isAuthorized ? "rgba(46, 204, 113, 0.08)" : "var(--surface-soft)",
                              border: `1px solid ${isAuthorized ? "rgba(46, 204, 113, 0.4)" : "var(--border-subtle)"}`,
                              fontSize: 12,
                              flexWrap: "wrap",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                                <span>{u.firstName} {u.lastName} {u.username ? `(@${u.username})` : ""}</span>
                                {isAuthorized ? (
                                  <span
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      color: "var(--success-text)",
                                      background: "var(--success-soft)",
                                      padding: "2px 7px",
                                      borderRadius: 5,
                                      border: "1px solid var(--success-border)",
                                    }}
                                  >
                                    {isPrimary ? "المدير الرئيسي" : "متصل ومعتمد"}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      color: "var(--danger-text)",
                                      background: "var(--danger-soft)",
                                      padding: "2px 7px",
                                      borderRadius: 5,
                                      border: "1px solid var(--danger-border)",
                                    }}
                                  >
                                    محظور (لا تصله بيانات)
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "Inter", marginTop: 2 }}>
                                ID: {u.chatId} {u.dateStr ? `• آخر نشاط: ${u.dateStr}` : ""}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {isAuthorized ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAccount(u.chatId)}
                                    className="danger-ghost"
                                    style={{
                                      padding: "4px 10px",
                                      fontSize: 11.5,
                                      borderRadius: 6,
                                      gap: 4,
                                      height: 30,
                                    }}
                                    title="حذف هذا الحساب المتصل وإلغاء ربطه وحظره من استلام الإشعارات"
                                  >
                                    <Icon name="trash" size={13} />
                                    <span>حذف الحساب المتصل</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDismissBotUser(u.chatId)}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: 11,
                                      borderRadius: 6,
                                      background: "transparent",
                                      border: "1px solid var(--border)",
                                      color: "var(--muted)",
                                      cursor: "pointer",
                                      height: 30,
                                    }}
                                    title="إخفاء وحذف من قائمة التحكم"
                                  >
                                    <Icon name="x" size={13} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTelegram((prev) => {
                                        const updatedAccounts = [
                                          ...(prev.accounts || []),
                                          {
                                            id: u.chatId,
                                            name: `${u.firstName} ${u.lastName}`.trim() || `مستخدم ${u.chatId}`,
                                            role: "المدير العام (الرئيسي)",
                                            isPrimary: true,
                                          },
                                        ];
                                        return {
                                          ...prev,
                                          chatId: u.chatId,
                                          authorizedChatIds: Array.from(new Set([...(prev.authorizedChatIds || []), u.chatId])),
                                          adminName: `${u.firstName} ${u.lastName}`.trim(),
                                          accounts: updatedAccounts,
                                        };
                                      });
                                      onShowToast(`تم تعيين ${u.firstName} كمدير معتمد لاستلام الإشعارات`);
                                    }}
                                    style={{
                                      padding: "4px 9px",
                                      fontSize: 11,
                                      borderRadius: 6,
                                      background: "var(--gold-soft)",
                                      border: "1px solid var(--border-gold)",
                                      color: "var(--light-gold)",
                                      cursor: "pointer",
                                      fontWeight: 700,
                                      height: 30,
                                    }}
                                  >
                                    تعيين كمدير
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewAccChatId(u.chatId);
                                      setNewAccName(`${u.firstName} ${u.lastName}`.trim() || `شريك ${u.chatId}`);
                                      setNewAccRole("شريك مالك");
                                      setShowAddAccountModal(true);
                                    }}
                                    className="secondary-btn"
                                    style={{
                                      padding: "4px 9px",
                                      fontSize: 11,
                                      borderRadius: 6,
                                      height: 30,
                                      gap: 4,
                                    }}
                                  >
                                    <Icon name="plus" size={12} />
                                    <span>ربط كشريك</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDismissBotUser(u.chatId)}
                                    className="danger-ghost"
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: 11,
                                      borderRadius: 6,
                                      gap: 4,
                                      height: 30,
                                    }}
                                    title="حذف هذا الحساب من القائمة"
                                  >
                                    <Icon name="trash" size={13} />
                                    <span>حذف</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Linked Accounts Management Card */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  border: "1.5px solid var(--border-gold)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 900, color: "var(--text)" }}>
                      الحسابات المعتمدة المرتبطة بالإشعارات ({((telegram.accounts && telegram.accounts.length > 0) ? telegram.accounts : [{ id: telegram.chatId }]).length})
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      تصل جميع الإشعارات (الفواتير، نقدية الدرج، الحضور، الورديات) إلى كافة الحسابات المسجلة هنا في نفس اللحظة
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      setNewAccName("");
                      setNewAccPhone("");
                      setNewAccChatId("");
                      setNewAccRole("شريك مالك");
                      setShowAddAccountModal(true);
                    }}
                    style={{ height: 36, padding: "0 14px", fontSize: 12.5, gap: 6 }}
                  >
                    <Icon name="plus" size={15} />
                    <span>ربط حساب إضافي</span>
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {((telegram.accounts && telegram.accounts.length > 0)
                    ? telegram.accounts
                    : [
                        {
                          id: telegram.chatId,
                          name: telegram.adminName || "المدير العام (Z E)",
                          phone: telegram.adminPhone || "",
                          role: "المدير العام (الرئيسي)",
                          isPrimary: true,
                        },
                      ]
                  ).map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: acc.isPrimary ? "var(--gold-soft)" : "var(--surface-soft)",
                            color: acc.isPrimary ? "var(--gold)" : "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon name="users" size={18} />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "var(--text)", fontSize: 13.5 }}>{acc.name}</span>
                            <span
                              style={{
                                fontSize: 10.5,
                                padding: "2px 7px",
                                borderRadius: 6,
                                background: acc.isPrimary ? "var(--gold-soft)" : "rgba(46, 204, 113, 0.12)",
                                color: acc.isPrimary ? "var(--light-gold)" : "var(--success-text)",
                                border: `1px solid ${acc.isPrimary ? "var(--border-gold)" : "rgba(46, 204, 113, 0.3)"}`,
                                fontWeight: 700,
                              }}
                            >
                              {acc.role || (acc.isPrimary ? "المدير الرئيسي" : "شريك معتمد")}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontFamily: "Inter, Cairo" }}>
                            معرف تليجرام: <code>{acc.id}</code> {acc.phone ? `• هاتف: ${acc.phone}` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => handleTestSpecificAccount(acc)}
                          style={{ height: 32, padding: "0 10px", fontSize: 11.5, gap: 4 }}
                          title="إرسال رسالة تجربة لهذا الحساب للتحقق من الاتصال"
                        >
                          <Icon name="bell" size={13} />
                          <span>تجربة</span>
                        </button>
                        <button
                          type="button"
                          className="danger-ghost"
                          onClick={() => handleRemoveAccount(acc.id)}
                          style={{ height: 32, padding: "0 10px", fontSize: 11.5, gap: 4 }}
                          title={acc.isPrimary ? "حذف وإلغاء ربط الحساب الرئيسي" : "إلغاء ربط هذا الحساب وإيقاف إرسال الإشعارات له"}
                        >
                          <Icon name="trash" size={13} />
                          <span>{acc.isPrimary ? "حذف الحساب" : "إلغاء الربط"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Types Checklist */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                  اختر الإشعارات التي ترغب في استلامها على تليجرام:
                </div>

                {[
                  {
                    key: "notifyAttendance" as const,
                    title: "حضور وانصراف الموظفين",
                    desc: "إشعار فوري عند تسجيل حضور أو انصراف أي حلاق مع توضيح وقت الوصول وحالة التأخير.",
                  },
                  {
                    key: "notifyShift" as const,
                    title: "بداية وإقفال الورديات",
                    desc: "إشعار عند بدء وردية جديدة، وعند إقفال الوردية مع ملخص المبيعات ونقدية الدرج.",
                  },
                  {
                    key: "notifyInvoice" as const,
                    title: "الفواتير والمبيعات اللحظية",
                    desc: "إشعار فوري بعد طباعة كل فاتورة بقيمة المبلغ والخدمات واسم الحلاق.",
                  },
                  {
                    key: "notifyAdvance" as const,
                    title: "السلف والمصروفات النقدية",
                    desc: "إشعار فوري عند صرف سلفة لحلاق من الدرج مع توثيق المبلغ والسبب.",
                  },
                  {
                    key: "notifyHourly" as const,
                    title: "تقرير وموجز كل ساعة (Hourly Summary)",
                    desc: "تقرير آلي كل ساعة بعدد الفواتير وإجمالي الإيرادات ومقدار الكاش المتواجد بالدرج.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--card)",
                      border: "1px solid var(--border-subtle)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={telegram[item.key]}
                      onChange={(e) => setTelegram((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                      style={{ width: 17, height: 17, marginTop: 2, accentColor: "var(--gold)" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Action Buttons: Test Message + Save */}
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleTestTelegram}
                  disabled={testingTelegram}
                  style={{
                    flex: 1,
                    height: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontWeight: 800,
                  }}
                >
                  <Icon name="bell" size={18} />
                  <span>{testingTelegram ? "جارٍ الإرسال للهاتف..." : "إرسال رسالة أمان تجريبية لحسابي المعتمد فقط"}</span>
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  style={{
                    flex: 1,
                    height: 46,
                    fontWeight: 800,
                    fontSize: 14,
                  }}
                >
                  <Icon name="check" size={18} />
                  <span>حفظ إعدادات تليجرام</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 600 }}>
              <div className="form-group">
                <label className="form-label">مظهر الواجهة (Theme Mode):</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      saveThemeMode("dark");
                      setThemeMode("dark");
                      onShowToast("تم تفعيل الوضع الداكن الفاخر");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      height: 46,
                      borderRadius: 10,
                      border: `1.5px solid ${themeMode === "dark" ? "var(--gold)" : "var(--border)"}`,
                      background: themeMode === "dark" ? "var(--gold-soft)" : "var(--surface-soft)",
                      color: themeMode === "dark" ? "var(--light-gold)" : "var(--text)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="moon" size={16} />
                    <span>الوضع الليلي (Dark Mode)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveThemeMode("light");
                      setThemeMode("light");
                      onShowToast("تم تفعيل الوضع النهاري (Light Mode)");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      height: 46,
                      borderRadius: 10,
                      border: `1.5px solid ${themeMode === "light" ? "var(--gold)" : "var(--border)"}`,
                      background: themeMode === "light" ? "var(--gold-soft)" : "var(--surface-soft)",
                      color: themeMode === "light" ? "var(--light-gold)" : "var(--text)",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="sun" size={16} />
                    <span>الوضع النهاري (Light Mode)</span>
                  </button>
                </div>
              </div>
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
                <span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                  أصوات درج الكاشير، وتنبيهات طابعة الفواتير والعمليات.
                </span>
                <span className="status-pill active">مفعلة وتعمل أوفلاين</span>
              </div>
            </div>
          )}

          {activeTab === "payroll" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 640 }}>
              <div>
                <label className="form-label" style={{ marginBottom: 10, display: "block" }}>
                  تحديد نظام ودورة صرف الرواتب للموظفين:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {(
                    [
                      { id: "monthly" as const, label: "شهري", desc: "كل شهر في يوم محدد" },
                      { id: "weekly" as const, label: "أسبوعي", desc: "كل أسبوع في يوم محدد" },
                      { id: "daily" as const, label: "يومي", desc: "صرف يومي كل وردية" },
                    ]
                  ).map((opt) => {
                    const active = payrollCycle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPayrollCycle(opt.id)}
                        style={{
                          padding: "14px 12px",
                          borderRadius: 12,
                          border: `1.5px solid ${active ? "var(--gold)" : "var(--border)"}`,
                          background: active ? "var(--gold-soft)" : "var(--surface-soft)",
                          color: active ? "var(--light-gold)" : "var(--text)",
                          textAlign: "right",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span>{opt.label}</span>
                          {active && <Icon name="check" size={16} />}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {payrollCycle === "monthly" && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">موعد يوم القبض في الشهر (من 1 إلى 31):</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="form-input"
                      style={{ width: 120, textAlign: "center", fontWeight: 800, fontSize: 16, fontFamily: "Inter" }}
                      value={monthlyPayDay}
                      onChange={(e) => setMonthlyPayDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
                    />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[1, 5, 15, 25, 28, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setMonthlyPayDay(d)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            border: `1px solid ${monthlyPayDay === d ? "var(--gold)" : "var(--border)"}`,
                            background: monthlyPayDay === d ? "var(--gold-soft)" : "var(--surface-2)",
                            color: monthlyPayDay === d ? "var(--light-gold)" : "var(--text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          يوم {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {payrollCycle === "weekly" && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">موعد يوم القبض الأسبوعي:</label>
                  <select
                    className="form-input"
                    value={weeklyPayDay}
                    onChange={(e) => setWeeklyPayDay(Number(e.target.value))}
                  >
                    {ARABIC_WEEKDAYS.map((dayName, idx) => (
                      <option key={idx} value={idx}>
                        كل يوم {dayName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {payrollCycle === "daily" && (
                <div
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  تم تفعيل نظام **الصرف اليومي** — يكون القبض متاحاً يومياً مع تتبع حالة صرف كل عامل بنهاية اليوم.
                </div>
              )}

              {/* Live Preview Box */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border-gold)",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>معاينة حية لبطاقات الرواتب:</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                    النهاردة: {previewCountdown.todayDateStr}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--gold)", marginTop: 2 }}>
                    الدورة المختارة: {previewCountdown.targetDayStr}
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: previewCountdown.isTodayPayDay ? "var(--success-soft)" : "var(--gold-soft)",
                    border: `1px solid ${previewCountdown.isTodayPayDay ? "var(--success-border)" : "var(--gold)"}`,
                    color: previewCountdown.isTodayPayDay ? "var(--success-text)" : "var(--light-gold)",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {previewCountdown.statusLabel}
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
              {/* Header Info */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border-gold)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "var(--light-gold)" }}>
                    سياسة الحضور والانصراف وقواعد احتساب خصومات التأخير
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    تُطبق هذه المعايير تلقائياً وبدقة على شاشات الحضور وقسائم مسير الرواتب لجميع الموظفين
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSaveAttendancePolicy}
                  style={{ height: 38, padding: "0 18px", fontSize: 13, gap: 6 }}
                >
                  <Icon name="check" size={15} />
                  <span>تطبيق وحفظ السياسة</span>
                </button>
              </div>

              {/* Form Inputs Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {/* 1. Grace Minutes */}
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 13, marginBottom: 0 }}>
                      فترة السماح بالتأخير (بالدقائق):
                    </label>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "var(--gold-soft)",
                        color: "var(--light-gold)",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {attendancePolicy.graceMinutes} دقيقة
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    step={1}
                    className="form-input"
                    value={attendancePolicy.graceMinutes}
                    onChange={(e) =>
                      setAttendancePolicy((prev) => ({
                        ...prev,
                        graceMinutes: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 700 }}
                  />
                  <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                    إذا حضر الموظف خلال هذه المدة بعد موعده لا يُعتبر متأخراً ولا يُخصم منه أي مبلغ. (مثال: 15 دقيقة تعني أن الحضور خلال أول ربع ساعة معفي تماماً).
                  </div>
                </div>

                {/* 2. Deduction Per Minute */}
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 13, marginBottom: 0 }}>
                      قيمة الخ خصم عن كل دقيقة تأخير:
                    </label>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "var(--danger-soft)",
                        color: "var(--danger-text)",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {attendancePolicy.deductionPerMinute} ج.م / د
                    </span>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className="form-input"
                      value={attendancePolicy.deductionPerMinute}
                      onChange={(e) =>
                        setAttendancePolicy((prev) => ({
                          ...prev,
                          deductionPerMinute: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                      }
                      style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 700, paddingLeft: 55 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 11.5,
                        color: "var(--muted)",
                        fontWeight: 700,
                      }}
                    >
                      ج.م / د
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                    المبلغ المقتطع تلقائياً من راتب الموظف بمسير الرواتب عن كل دقيقة تأخير بعد انتهاء فترة السماح المقررة.
                  </div>
                </div>

                {/* 3. Default Scheduled Start Time */}
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label className="form-label" style={{ fontWeight: 800, fontSize: 13, marginBottom: 0 }}>
                      موعد الحضور الافتراضي لبدء العمل:
                    </label>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "var(--surface-soft)",
                        color: "var(--text)",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {attendancePolicy.defaultScheduledTime}
                    </span>
                  </div>
                  <input
                    type="time"
                    className="form-input"
                    value={attendancePolicy.defaultScheduledTime}
                    onChange={(e) =>
                      setAttendancePolicy((prev) => ({
                        ...prev,
                        defaultScheduledTime: e.target.value || "09:00",
                      }))
                    }
                    style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 700 }}
                  />
                  <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                    الموعد الافتراضي اليومي لبدء الوردية الصباحية. (يمكن تخصيص موعد فردي لكل حلاق من صفحة فريق العمل).
                  </div>
                </div>

                {/* 4. Clock-in Mode */}
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <label className="form-label" style={{ fontWeight: 800, fontSize: 13, marginBottom: 0 }}>
                    آلية تسجيل حضور الحلاقين:
                  </label>
                  <select className="form-input" defaultValue="direct" style={{ fontSize: 13 }}>
                    <option value="direct">تحضير مباشر من الكاشير (بدون رمز PIN)</option>
                    <option value="pin">تسجيل حضور برمز PIN الموظف السري</option>
                  </select>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>
                    تتيح سرعة تسجيل دخول الحلاقين وبدء احتساب دقائق الحضور تلقائياً.
                  </div>
                </div>
              </div>

              {/* Live Interactive Simulator / Preview Card */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  border: "1.5px solid var(--border-gold)",
                  borderRadius: 14,
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "var(--light-gold)" }}>
                      محاكي حي وحاسبة توضيحية لخصومات التأخير
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      جرّب تغيير دقائق التأخير لترى كيف ستُحسب الخصومات في قسيمة الراتب بناءً على القيم المدخلة
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>تجربة تأخير:</span>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={5}
                      value={simulatedDelayMinutes}
                      onChange={(e) => setSimulatedDelayMinutes(Number(e.target.value))}
                      style={{ width: 130, accentColor: "var(--gold)" }}
                    />
                    <span
                      style={{
                        fontFamily: "Inter",
                        fontWeight: 800,
                        fontSize: 13,
                        color: "var(--gold)",
                        minWidth: 45,
                      }}
                    >
                      {simulatedDelayMinutes} د
                    </span>
                  </div>
                </div>

                {(() => {
                  const grace = attendancePolicy.graceMinutes;
                  const perMin = attendancePolicy.deductionPerMinute;
                  const lateMins = Math.max(0, simulatedDelayMinutes - grace);
                  const totalDeduction = lateMins * perMin;

                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 12,
                        marginTop: 4,
                      }}
                    >
                      <div
                        style={{
                          background: "var(--card)",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>إجمالي التأخير الفعلي</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginTop: 4, fontFamily: "Inter" }}>
                          {simulatedDelayMinutes} دقيقة
                        </div>
                      </div>

                      <div
                        style={{
                          background: "var(--card)",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>سماح معفي من الخصم</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--success-text)", marginTop: 4, fontFamily: "Inter" }}>
                          {Math.min(simulatedDelayMinutes, grace)} دقيقة (معفي)
                        </div>
                      </div>

                      <div
                        style={{
                          background: "var(--card)",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>الدقائق الخاضعة للخصم</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: lateMins > 0 ? "var(--danger-text)" : "var(--muted)", marginTop: 4, fontFamily: "Inter" }}>
                          {lateMins} دقيقة
                        </div>
                      </div>

                      <div
                        style={{
                          background: lateMins > 0 ? "rgba(231, 76, 60, 0.1)" : "var(--card)",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: `1px solid ${lateMins > 0 ? "rgba(231, 76, 60, 0.4)" : "var(--border)"}`,
                        }}
                      >
                        <div style={{ fontSize: 11, color: lateMins > 0 ? "var(--danger-text)" : "var(--muted)" }}>
                          الخصم المقتطع من الراتب
                        </div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: lateMins > 0 ? "var(--danger-text)" : "var(--success-text)",
                            marginTop: 4,
                            fontFamily: "Inter",
                          }}
                        >
                          {lateMins > 0 ? `-${totalDeduction.toLocaleString("ar-EG")} ج.م` : "0 ج.م (بدون خصم)"}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === "sales" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text)" }}>
                <input type="checkbox" defaultChecked />
                <span>إتاحة إضافة إكراميات الحلاقين (Tips) واحتسابها بمسير الرواتب</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text)" }}>
                <input type="checkbox" defaultChecked />
                <span>إظهار زر الدفع عبر «إنستاباي - InstaPay» في الكاشير</span>
              </label>
            </div>
          )}

          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 600 }}>
              {/* Change Admin Password Card */}
              <div
                style={{
                  background: "var(--surface-soft)",
                  padding: 18,
                  borderRadius: 12,
                  border: "1px solid var(--border-gold)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "var(--light-gold)", fontSize: 14.5, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="lock" size={16} />
                    <span>تغيير كلمة مرور صفحة الإدارة</span>
                  </strong>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "var(--muted)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Icon name={showPasswords ? "eyeOff" : "eye"} size={14} />
                    <span>{showPasswords ? "إخفاء" : "إظهار"}</span>
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">كلمة المرور الحالية:</label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    className="form-input"
                    placeholder="أدخل كلمة المرور الحالية..."
                    value={currentAdminPass}
                    onChange={(e) => {
                      setCurrentAdminPass(e.target.value);
                      if (passError) setPassError("");
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">كلمة المرور الجديدة:</label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      className="form-input"
                      placeholder="3 أحرف أو أرقام على الأقل"
                      value={newAdminPass}
                      onChange={(e) => {
                        setNewAdminPass(e.target.value);
                        if (passError) setPassError("");
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">تأكيد كلمة المرور الجديدة:</label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      className="form-input"
                      placeholder="أعد كتابة كلمة المرور"
                      value={confirmAdminPass}
                      onChange={(e) => {
                        setConfirmAdminPass(e.target.value);
                        if (passError) setPassError("");
                      }}
                    />
                  </div>
                </div>

                {passError && (
                  <div
                    style={{
                      background: "var(--danger-soft)",
                      border: "1px solid var(--danger-border)",
                      color: "var(--danger-text)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: 700,
                    }}
                  >
                    {passError}
                  </div>
                )}

                <button
                  type="button"
                  className="primary-btn"
                  style={{ height: 40, alignSelf: "flex-start", padding: "0 20px" }}
                  onClick={() => {
                    const saved = adminPassword ?? secureStorage.getItem<string>("pos_admin_password", "admin123");
                    if (currentAdminPass.trim() !== saved) {
                      setPassError("كلمة المرور الحالية غير صحيحة!");
                      return;
                    }
                    if (newAdminPass.trim().length < 3) {
                      setPassError("كلمة المرور الجديدة يجب أن تكون 3 أحرف أو أرقام على الأقل.");
                      return;
                    }
                    if (newAdminPass.trim() !== confirmAdminPass.trim()) {
                      setPassError("كلمتا المرور الجديدتان غير متطابقتين!");
                      return;
                    }
                    const nextPass = newAdminPass.trim();
                    secureStorage.setItem("pos_admin_password", nextPass);
                    onUpdateAdminPassword?.(nextPass);
                    setCurrentAdminPass("");
                    setNewAdminPass("");
                    setConfirmAdminPass("");
                    setPassError("");
                    onShowToast("تم تغيير كلمة مرور صفحة الإدارة بنجاح");
                  }}
                >
                  <Icon name="check" size={16} />
                  <span>حفظ كلمة مرور الإدارة الجديدة</span>
                </button>
              </div>
            </div>
          )}

          {activeTab !== "security" && (
            <div style={{ marginTop: 24 }}>
              <button type="submit" className="primary-btn" style={{ height: 42, padding: "0 24px" }}>
                <span>حفظ الإعدادات</span>
                <Icon name="check" size={16} />
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Modal: Link Another Account */}
      {showAddAccountModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h2>ربط حساب تليجرام إضافي (شريك / مدير ثانٍ)</h2>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                سيتم اعتماد هذا الحساب وإرسال نسخة فورية له من جميع إشعارات الفواتير، نقدية الدرج، الحضور، وتقفيل الورديات.
              </p>

              {/* One-Click Auto Link option for this account */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(0, 136, 204, 0.08) 0%, rgba(212, 175, 55, 0.08) 100%)",
                  border: "1.5px dashed #0088cc",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text)" }}>
                    الربط السريع بنقرة واحدة (بدون كتابة أرقام):
                  </span>
                  <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>موصى به</span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                  اضغط الزر، وسيفتح تليجرام.. فقط اضغط <b>Start</b> داخل المحادثة وسيرتبط هذا الحساب وتصله رسالة الترحيب تلقائياً!
                </p>
                <button
                  type="button"
                  onClick={() => handleStartAutoLink(newAccRole)}
                  disabled={autoLinkActive}
                  style={{
                    background: "linear-gradient(135deg, #0088cc 0%, #006699 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 16px",
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: autoLinkActive ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0, 136, 204, 0.3)",
                  }}
                >
                  <Icon name="send" size={14} />
                  <span>{autoLinkActive ? "جارٍ الاستماع للضغط على Start في تليجرام..." : "فتح تليجرام والربط التلقائي لهذا الحساب"}</span>
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>أو أدخل البيانات يدوياً</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">اسم صاحب الحساب المستلم *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: الشريك أحمد / مدير الفرع / هاتف المالك 2..."
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الصفة / الصلاحية</label>
                <select
                  className="form-input"
                  value={newAccRole}
                  onChange={(e) => setNewAccRole(e.target.value)}
                >
                  <option value="شريك مالك">شريك مالك</option>
                  <option value="مدير صالون / فرع">مدير صالون / فرع</option>
                  <option value="محاسب مالي">محاسب مالي</option>
                  <option value="مشرف وردية">مشرف وردية</option>
                  <option value="هاتف إضافي للمالك">هاتف إضافي للمالك</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">رقم الموبايل المسجل (اختياري)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: 010xxxxxxxx"
                  value={newAccPhone}
                  onChange={(e) => setNewAccPhone(e.target.value)}
                  style={{ direction: "ltr", textAlign: "right" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">معرف تليجرام (Chat ID) *</label>
                  <button
                    type="button"
                    onClick={handleScanBotUsers}
                    disabled={scanningUsers}
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "var(--gold)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    فحص الحسابات المتصلة
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: 5237251338"
                  value={newAccChatId}
                  onChange={(e) => setNewAccChatId(e.target.value)}
                  style={{ fontFamily: "Inter, monospace" }}
                />
                <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                  يطلب من الشخص فتح <b>@lamsat_khaleeji_pos_bot</b> والضغط على <b>Start</b>، ثم اختيار حسابه أدناه.
                </span>
              </div>

              {/* Quick Pick from Scanned Users */}
              {botUsers.length > 0 && (
                <div>
                  <span style={{ fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                    أو اختر من الحسابات التي فتحت البوت مؤخراً بنقرة واحدة:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {botUsers.map((u) => (
                      <button
                        key={u.chatId}
                        type="button"
                        onClick={() => {
                          setNewAccChatId(u.chatId);
                          if (!newAccName) {
                            setNewAccName(`${u.firstName} ${u.lastName}`.trim() || `مستخدم ${u.chatId}`);
                          }
                        }}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: newAccChatId === u.chatId ? "1.5px solid var(--gold)" : "1px solid var(--border)",
                          background: newAccChatId === u.chatId ? "var(--gold-soft)" : "var(--surface)",
                          color: newAccChatId === u.chatId ? "var(--light-gold)" : "var(--text)",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {u.firstName} {u.lastName} ({u.chatId})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="primary-btn"
                onClick={handleAddAccount}
                style={{ flex: 1, height: 42, fontSize: 14 }}
              >
                <Icon name="check" size={16} />
                <span>تأكيد ربط الحساب واعتماده</span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowAddAccountModal(false)}
                style={{ height: 42 }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

