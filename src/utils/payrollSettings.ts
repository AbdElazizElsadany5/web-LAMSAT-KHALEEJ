import { secureStorage } from "./secureStorage";

export type PayrollCycleType = "monthly" | "weekly" | "daily";

export interface PayrollSettings {
  cycleType: PayrollCycleType;
  monthlyPayDay: number; // 1 to 31 (e.g. 28)
  weeklyPayDay: number; // 0=Sunday, 1=Monday, ..., 4=Thursday, 5=Friday, 6=Saturday
}

export const defaultPayrollSettings: PayrollSettings = {
  cycleType: "monthly",
  monthlyPayDay: 28,
  weeklyPayDay: 4, // Thursday
};

const PAYROLL_SETTINGS_KEY = "payroll_settings";

export function getPayrollSettings(): PayrollSettings {
  return secureStorage.getItem<PayrollSettings>(PAYROLL_SETTINGS_KEY, defaultPayrollSettings);
}

export function convertSalaryBetweenCycles(
  amount: number,
  fromCycle: PayrollCycleType = "monthly",
  toCycle: PayrollCycleType = "monthly"
): number {
  if (fromCycle === toCycle) return amount;
  let monthly = amount;
  if (fromCycle === "daily") monthly = amount * 30;
  else if (fromCycle === "weekly") monthly = amount * 4;

  if (toCycle === "daily") return Math.round(monthly / 30);
  if (toCycle === "weekly") return Math.round(monthly / 4);
  return Math.round(monthly);
}

export function getCycleText(cycle: PayrollCycleType = "monthly"): { title: string; unit: string; desc: string } {
  switch (cycle) {
    case "daily":
      return { title: "القبض اليومي (اليومية)", unit: "يومياً", desc: "صرف يومي بنهاية كل وردية" };
    case "weekly":
      return { title: "الراتب الأسبوعي", unit: "أسبوعياً", desc: "صرف أسبوعي كل أسبوع" };
    case "monthly":
    default:
      return { title: "الراتب الشهري الثابت", unit: "شهرياً", desc: "صرف شهري في موعد محدد كل شهر" };
  }
}

export function savePayrollSettings(settings: Partial<PayrollSettings>): PayrollSettings {
  const current = getPayrollSettings();
  const updated: PayrollSettings = { ...current, ...settings };
  secureStorage.setItem(PAYROLL_SETTINGS_KEY, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("payroll-settings-changed", { detail: updated }));
  }

  return updated;
}

export interface PayrollCountdown {
  cycleType: PayrollCycleType;
  todayDateStr: string;
  todayDayOfMonth: number;
  monthName: string;
  targetDayStr: string;
  daysRemaining: number;
  isTodayPayDay: boolean;
  statusLabel: string;
}

export const ARABIC_WEEKDAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function calculatePayrollCountdown(
  settings: PayrollSettings = getPayrollSettings(),
  now = new Date()
): PayrollCountdown {
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDayOfWeek = now.getDay();

  const todayMidnight = new Date(currentYear, currentMonth, currentDay);
  const todayDateStr = `${ARABIC_WEEKDAYS[currentDayOfWeek]}، ${currentDay} ${ARABIC_MONTHS[currentMonth]} ${currentYear}`;

  if (settings.cycleType === "daily") {
    return {
      cycleType: "daily",
      todayDateStr,
      todayDayOfMonth: currentDay,
      monthName: ARABIC_MONTHS[currentMonth],
      targetDayStr: "يومي (نهاية كل يوم)",
      daysRemaining: 0,
      isTodayPayDay: true,
      statusLabel: "الصرف يومي — اليوم يوم قبض",
    };
  }

  if (settings.cycleType === "weekly") {
    const targetWeekday = settings.weeklyPayDay ?? 4;
    const targetDayName = ARABIC_WEEKDAYS[targetWeekday] || "الخميس";
    let diff = targetWeekday - currentDayOfWeek;
    if (diff < 0) {
      diff += 7;
    }
    const isTodayPayDay = diff === 0;

    const diffWord =
      diff === 0
        ? "اليوم موعد القبض"
        : diff === 1
          ? "باقي يوم واحد"
          : diff === 2
            ? "باقي يومان"
            : diff <= 10
              ? `باقي ${diff} أيام`
              : `باقي ${diff} يوماً`;

    return {
      cycleType: "weekly",
      todayDateStr,
      todayDayOfMonth: currentDay,
      monthName: ARABIC_MONTHS[currentMonth],
      targetDayStr: `أسبوعي (كل ${targetDayName})`,
      daysRemaining: diff,
      isTodayPayDay,
      statusLabel: isTodayPayDay ? "اليوم موعد الصرف الأسبوعي" : diffWord,
    };
  }

  // Monthly
  const targetDay = Math.min(Math.max(1, settings.monthlyPayDay || 28), 31);
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const effectiveTargetDay = Math.min(targetDay, daysInCurrentMonth);

  if (currentDay === effectiveTargetDay) {
    return {
      cycleType: "monthly",
      todayDateStr,
      todayDayOfMonth: currentDay,
      monthName: ARABIC_MONTHS[currentMonth],
      targetDayStr: `شهري (يوم ${targetDay} في الشهر)`,
      daysRemaining: 0,
      isTodayPayDay: true,
      statusLabel: "اليوم موعد صرف الرواتب",
    };
  } else if (currentDay < effectiveTargetDay) {
    const diff = effectiveTargetDay - currentDay;
    const diffWord =
      diff === 1
        ? "باقي يوم واحد"
        : diff === 2
          ? "باقي يومان"
          : diff <= 10
            ? `باقي ${diff} أيام`
            : `باقي ${diff} يوماً`;

    return {
      cycleType: "monthly",
      todayDateStr,
      todayDayOfMonth: currentDay,
      monthName: ARABIC_MONTHS[currentMonth],
      targetDayStr: `شهري (يوم ${targetDay} في الشهر)`,
      daysRemaining: diff,
      isTodayPayDay: false,
      statusLabel: diffWord,
    };
  } else {
    // Past pay day in current month -> Next month
    const nextMonth = (currentMonth + 1) % 12;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const effectiveNextTarget = Math.min(targetDay, daysInNextMonth);
    const nextPayMidnight = new Date(nextYear, nextMonth, effectiveNextTarget);

    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.max(1, Math.round((nextPayMidnight.getTime() - todayMidnight.getTime()) / msPerDay));

    const diffWord =
      diff === 1
        ? "باقي يوم واحد"
        : diff === 2
          ? "باقي يومان"
          : diff <= 10
            ? `باقي ${diff} أيام`
            : `باقي ${diff} يوماً`;

    return {
      cycleType: "monthly",
      todayDateStr,
      todayDayOfMonth: currentDay,
      monthName: ARABIC_MONTHS[currentMonth],
      targetDayStr: `شهري (يوم ${targetDay} في الشهر)`,
      daysRemaining: diff,
      isTodayPayDay: false,
      statusLabel: diffWord,
    };
  }
}

function getCurrentDisbursementStorageKey(settings: PayrollSettings = getPayrollSettings()): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (settings.cycleType === "daily") {
    return `disbursed_daily_${y}_${m}_${d}`;
  }
  if (settings.cycleType === "weekly") {
    // Week anchor: date of the Saturday starting the current week
    const startOfWeek = new Date(y, now.getMonth(), d - ((now.getDay() + 1) % 7));
    return `disbursed_weekly_${startOfWeek.getFullYear()}_${startOfWeek.getMonth() + 1}_${startOfWeek.getDate()}`;
  }
  return `disbursed_monthly_${y}_${m}`;
}

export function getDisbursedEmployeeIds(settings: PayrollSettings = getPayrollSettings()): string[] {
  return secureStorage.getItem<string[]>(getCurrentDisbursementStorageKey(settings), []);
}

export function setDisbursedEmployee(
  barberId: string,
  isPaid: boolean,
  settings: PayrollSettings = getPayrollSettings()
): string[] {
  const key = getCurrentDisbursementStorageKey(settings);
  const current = getDisbursedEmployeeIds(settings);
  let updated: string[];
  if (isPaid) {
    updated = current.includes(barberId) ? current : [...current, barberId];
  } else {
    updated = current.filter((id) => id !== barberId);
  }
  secureStorage.setItem(key, updated);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("payroll-disbursement-changed", { detail: updated }));
  }
  return updated;
}

export function resetDisbursedEmployees(
  settings: PayrollSettings = getPayrollSettings()
): string[] {
  const key = getCurrentDisbursementStorageKey(settings);
  secureStorage.setItem(key, []);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("payroll-disbursement-changed", { detail: [] }));
  }
  return [];
}

