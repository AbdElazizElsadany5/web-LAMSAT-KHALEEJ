import { secureStorage } from "./secureStorage";
import { Invoice } from "../types";

export interface TelegramLinkedAccount {
  id: string; // telegram chatId
  name: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
  addedAt?: string;
}

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
  adminName?: string;
  adminPhone?: string;
  adminEmail?: string;
  authorizedChatIds?: string[];
  accounts?: TelegramLinkedAccount[];
  notifyAttendance: boolean;
  notifyShift: boolean;
  notifyInvoice: boolean;
  notifyAdvance: boolean;
  notifyHourly: boolean;
}

export const defaultTelegramSettings: TelegramSettings = {
  enabled: true,
  botToken: "9086382022:AAHirhhUEtVxjTF72wMuhQItorstWgtnLbY",
  chatId: "8503272906",
  adminName: "المدير العام (Z E)",
  adminPhone: "01040734582",
  adminEmail: "",
  authorizedChatIds: ["8503272906"],
  accounts: [
    {
      id: "8503272906",
      name: "المدير العام (Z E)",
      phone: "01040734582",
      role: "المدير العام (الرئيسي)",
      isPrimary: true,
      addedAt: "12/11/2026",
    },
  ],
  notifyAttendance: true,
  notifyShift: true,
  notifyInvoice: true,
  notifyAdvance: true,
  notifyHourly: true,
};

const TELEGRAM_SETTINGS_KEY = "telegram_settings";

export function getTelegramSettings(): TelegramSettings {
  return secureStorage.getItem<TelegramSettings>(TELEGRAM_SETTINGS_KEY, defaultTelegramSettings);
}

export function saveTelegramSettings(settings: Partial<TelegramSettings>): TelegramSettings {
  const current = getTelegramSettings();
  const updated: TelegramSettings = { ...current, ...settings };
  secureStorage.setItem(TELEGRAM_SETTINGS_KEY, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("telegram-settings-changed", { detail: updated }));
  }

  return updated;
}

export interface TelegramBotUser {
  chatId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  lastMessage?: string;
  dateStr?: string;
}

/**
 * Inspect bot getUpdates to detect which user accounts recently opened the bot
 */
export async function fetchTelegramBotUsers(botToken: string): Promise<TelegramBotUser[]> {
  if (!botToken) return [];
  try {
    const url = `https://api.telegram.org/bot${botToken.trim()}/getUpdates`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.ok || !Array.isArray(data.result)) return [];

    const usersMap = new Map<string, TelegramBotUser>();

    for (const update of data.result) {
      const msg = update.message || update.edited_message || update.callback_query?.message;
      if (!msg?.from?.id) continue;
      const idStr = String(msg.from.id);
      usersMap.set(idStr, {
        chatId: idStr,
        firstName: msg.from.first_name || "",
        lastName: msg.from.last_name || "",
        username: msg.from.username || "",
        lastMessage: msg.text || (msg.entities ? "أمر / تفاعل" : ""),
        dateStr: msg.date
          ? new Date(msg.date * 1000).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
          : undefined,
      });
    }

    return Array.from(usersMap.values());
  } catch (err) {
    console.warn("Failed to fetch Telegram bot updates:", err);
    return [];
  }
}

export function generateLinkSessionCode(): string {
  return "link_" + Math.random().toString(36).substring(2, 8);
}

export function getBotDeepLinkUrl(botUsername: string = "lamsat_khaleeji_pos_bot", code?: string): string {
  const c = code || generateLinkSessionCode();
  return `https://t.me/${botUsername}?start=${c}`;
}

/**
 * Poll Telegram getUpdates to detect when the user presses Start
 */
export async function checkTelegramForNewStart(
  botToken: string,
  startTimeSeconds: number,
  sessionCode?: string
): Promise<TelegramBotUser | null> {
  if (!botToken) return null;
  try {
    const url = `https://api.telegram.org/bot${botToken.trim()}/getUpdates?offset=-10`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.result)) return null;

    const reversed = [...data.result].reverse();
    for (const update of reversed) {
      const msg = update.message || update.edited_message;
      if (!msg || !msg.from?.id) continue;

      const msgDate = msg.date || 0;
      const text = (msg.text || "").trim();

      // If the message contains our specific session code, it's 100% our user's click!
      const hasSessionCode = sessionCode && text.includes(sessionCode);
      // Or if it's within the session window (with 60 seconds tolerance for clock skew)
      const isRecent = msgDate >= (startTimeSeconds - 60);

      if (hasSessionCode || (isRecent && (text.startsWith("/start") || text.length > 0))) {
        return {
          chatId: String(msg.from.id),
          firstName: msg.from.first_name || "",
          lastName: msg.from.last_name || "",
          username: msg.from.username || "",
          lastMessage: text,
          dateStr: new Date(msgDate * 1000).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        };
      }
    }
    return null;
  } catch (err) {
    console.warn("Error checking Telegram for start:", err);
    return null;
  }
}

interface QueuedTelegramMessage {
  id: string;
  recipients: string[];
  text: string;
  timestamp: number;
}

const OUTBOX_KEY = "telegram_outbox_queue";

function getOutboxQueue(): QueuedTelegramMessage[] {
  return secureStorage.getItem<QueuedTelegramMessage[]>(OUTBOX_KEY, []);
}

function addToOutboxQueue(recipients: string[], text: string) {
  const queue = getOutboxQueue();
  // Keep up to 50 recent offline notifications safely on disk
  const updated = [
    ...queue.slice(-49),
    { id: `Q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, recipients, text, timestamp: Date.now() },
  ];
  secureStorage.setItem(OUTBOX_KEY, updated);
}

/**
 * Automatically flush and send pending offline notifications once internet is back
 */
export async function flushTelegramOutbox(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return 0;
  }
  const queue = getOutboxQueue();
  if (queue.length === 0) return 0;

  const config = getTelegramSettings();
  if (!config.enabled || !config.botToken) return 0;
  const token = config.botToken.trim();

  let sentCount = 0;
  const remaining: QueuedTelegramMessage[] = [];

  for (const item of queue) {
    let itemSuccess = true;
    for (const cid of item.recipients) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            chat_id: cid,
            text: `${item.text}\n<i>[وصل هذا الإشعار تلقائياً بعد عودة اتصال الإنترنت]</i>`,
            parse_mode: "HTML",
          }),
        });
        const data = await res.json();
        if (!data.ok) itemSuccess = false;
      } catch {
        itemSuccess = false;
      }
    }
    if (itemSuccess) {
      sentCount++;
    } else {
      remaining.push(item);
    }
  }

  secureStorage.setItem(OUTBOX_KEY, remaining);
  return sentCount;
}

// Background listener: Automatically flush outbox when device gets online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushTelegramOutbox();
  });
  setInterval(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      flushTelegramOutbox();
    }
  }, 25000);
}

/**
 * Send arbitrary HTML message to a specific Telegram chat ID directly
 */
export async function sendTelegramDirectMessage(chatId: string, text: string): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.enabled || !config.botToken || !chatId) {
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${config.botToken.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: "HTML",
      }),
    });
    const data = await response.json();
    return !!data.ok;
  } catch (err) {
    console.warn(`Failed to send Telegram direct message to ${chatId}:`, err);
    return false;
  }
}

/**
 * Send arbitrary HTML message STRICTLY to ALL authorized Telegram accounts
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.enabled || !config.botToken) {
    return false;
  }

  // Strict whitelist: Combine primary chatId + authorizedChatIds + accounts
  const accountIds = (config.accounts || []).map((a) => a.id);
  const rawList = [config.chatId, ...(config.authorizedChatIds || []), ...accountIds];
  const recipients = Array.from(
    new Set(
      rawList
        .map((id) => (id ? String(id).trim() : ""))
        .filter(Boolean)
    )
  );

  if (recipients.length === 0) {
    return false;
  }

  let anySuccess = false;
  const token = config.botToken.trim();

  for (const cid of recipients) {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          chat_id: cid,
          text,
          parse_mode: "HTML",
        }),
      });

      const data = await response.json();
      if (data.ok) {
        anySuccess = true;
      }
    } catch (err) {
      console.warn(`Failed to send Telegram notification to ${cid}:`, err);
    }
  }

  // If offline or network failed: queue in outbox to auto-send when internet reconnects!
  if (!anySuccess) {
    addToOutboxQueue(recipients, text);
  }

  return anySuccess;
}

/**
 * 1. Attendance Notification (Check-in / Check-out)
 */
export async function sendTelegramAttendance(
  barberName: string,
  type: "حضور" | "انصراف",
  time: string,
  isLate: boolean = false,
  lateMinutes: number = 0,
): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.notifyAttendance) return false;

  const lateNote = isLate
    ? `\n<b>تنبيه تأخير:</b> متأخر ${lateMinutes} دقيقة عن موعده المجدول`
    : `\n<b>الانضباط:</b> في الموعد المحدد تماماً`;

  const msg = [
    `<b>تسجيل ${type} لموظف — صالون لمسة خليجي</b>`,
    `━━━━━━━━━━━━━━━━`,
    `<b>الموظف:</b> ${barberName}`,
    `<b>التوقيت:</b> ${time}`,
    lateNote,
    `━━━━━━━━━━━━━━━━`,
    `<i>صالون لمسة خليجي — نظام الإدارة الفاخر</i>`,
  ].join("\n");

  return sendTelegramMessage(msg);
}

/**
 * 2. Shift Start Notification
 */
export async function sendTelegramShiftStart(
  shiftId: number,
  cashierName: string,
  time: string,
): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.notifyShift) return false;

  const msg = [
    `<b>بدء وردية كاشير جديدة #${shiftId}</b>`,
    `━━━━━━━━━━━━━━━━`,
    `<b>المسؤول:</b> ${cashierName}`,
    `<b>وقت البدء:</b> ${time}`,
    `تم تفعيل الكاشير واحتساب ساعات العمل فوراً.`,
    `━━━━━━━━━━━━━━━━`,
    `<i>صالون لمسة خليجي</i>`,
  ].join("\n");

  return sendTelegramMessage(msg);
}

/**
 * 3. Shift Close Notification
 */
export async function sendTelegramShiftClose(
  shiftId: number,
  cashierName: string,
  durationText: string,
  actualCash: number,
  salesTotal: number,
): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.notifyShift) return false;

  const msg = [
    `<b>تم إقفال الوردية #${shiftId} وتسليم الدرج</b>`,
    `━━━━━━━━━━━━━━━━`,
    `<b>المسؤول:</b> ${cashierName}`,
    `<b>مدة العمل:</b> ${durationText}`,
    `<b>إجمالي مبيعات الوردية:</b> ${salesTotal.toLocaleString("ar-EG")} ج.م`,
    `<b>النقدية المستلمة بالدرج:</b> ${actualCash.toLocaleString("ar-EG")} ج.م`,
    `━━━━━━━━━━━━━━━━`,
    `<i>تم توثيق إحصائيات الوردية في سجلات الإدارة.</i>`,
  ].join("\n");

  return sendTelegramMessage(msg);
}

/**
 * 4. New Invoice Notification
 */
export async function sendTelegramInvoice(
  invoice: Invoice,
  cashierName?: string,
): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.notifyInvoice) return false;

  const itemsList = invoice.items
    .map((it) => `• ${it.name} (${it.price} ج.م) — الحلاق: ${it.barber}`)
    .join("\n");

  const msg = [
    `<b>فاتورة جديدة #${invoice.id}</b>`,
    `━━━━━━━━━━━━━━━━`,
    `<b>الإجمالي:</b> <b>${invoice.subtotal.toLocaleString("ar-EG")} ج.م</b> (${invoice.paymentMethod})`,
    `<b>العميل:</b> ${invoice.customerName || "عميل بدون تسجيل"}`,
    `<b>الخدمات:</b>\n${itemsList}`,
    cashierName ? `<b>الكاشير:</b> ${cashierName}` : "",
    `<b>التاريخ والوقت:</b> ${invoice.date} - ${invoice.time}`,
    `━━━━━━━━━━━━━━━━`,
    `<i>صالون لمسة خليجي</i>`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * 5. Advance Request / Cash Payout Notification
 */
export async function sendTelegramAdvance(
  barberName: string,
  amount: number,
  reason: string,
  approvedBy: string = "الكاشير",
): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.notifyAdvance) return false;

  const msg = [
    `<b>صرف سلفة نقدية لموظف</b>`,
    `━━━━━━━━━━━━━━━━`,
    `<b>الموظف:</b> ${barberName}`,
    `<b>المبلغ:</b> <b>${amount.toLocaleString("ar-EG")} ج.م</b>`,
    `<b>السبب:</b> ${reason}`,
    `<b>تم الصرف بواسطة:</b> ${approvedBy}`,
    `━━━━━━━━━━━━━━━━`,
    `<i>تم قيد السلفة وتحديث صافي مستحقات الراتب تلقائياً.</i>`,
  ].join("\n");

  return sendTelegramMessage(msg);
}

/**
 * 7. Cash Out / Drawer Withdrawal Notification
 */
export async function sendTelegramCashOut(details: {
  amount: number;
  category: string;
  recipient: string;
  reason: string;
  cashierName: string;
  shiftId?: number;
  remainingCash?: number;
}): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.enabled) return false;

  const msg = [
    `<b>خروج نقدية من الدرج (Cash Out)</b>`,
    `━━━━━━━━━━━━━━━━`,
    `<b>المبلغ المنصرف:</b> <b>${details.amount.toLocaleString("ar-EG")} ج.م</b>`,
    `<b>البند / التصنيف:</b> ${details.category}`,
    `<b>خرج لمين (المستلم):</b> ${details.recipient}`,
    `<b>السبب والبيان:</b> ${details.reason}`,
    `<b>الكاشير المسجل:</b> ${details.cashierName}${details.shiftId ? ` (وردية #${details.shiftId})` : ""}`,
    details.remainingCash !== undefined
      ? `<b>النقدية المتبقية بالدرج:</b> ${details.remainingCash.toLocaleString("ar-EG")} ج.م`
      : "",
    `<b>التوقيت:</b> ${new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`,
    `━━━━━━━━━━━━━━━━`,
    `<i>تم خصم المبلغ من درج الوردية وتوثيقه في السجل المالي فوراً.</i>`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

export async function sendTelegramHourlyDigest(stats: {
  hourStr: string;
  hourlyCount: number;
  hourlyRevenue: number;
  totalToday: number;
  cashInDrawer: number;
}): Promise<boolean> {
  const config = getTelegramSettings();
  if (!config.notifyHourly) return false;

  const msg = [
    `<b>تقرير الصالون الدوري — الساعة ${stats.hourStr}</b>`,
    `━━━━━━━━━━━━━━━━`,
    `<b>فواتير الساعة الماضية:</b> ${stats.hourlyCount} فاتورة`,
    `<b>إيرادات الساعة:</b> ${stats.hourlyRevenue.toLocaleString("ar-EG")} ج.م`,
    `<b>إجمالي مبيعات اليوم حتى الآن:</b> ${stats.totalToday.toLocaleString("ar-EG")} ج.م`,
    `<b>النقدية المتواجدة بالدرج حالياً:</b> ${stats.cashInDrawer.toLocaleString("ar-EG")} ج.م`,
    `━━━━━━━━━━━━━━━━`,
    `<i>تقرير آلي من نظام لمسة خليجي</i>`,
  ].join("\n");

  return sendTelegramMessage(msg);
}

