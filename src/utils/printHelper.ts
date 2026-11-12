import { getThermalSettings } from "./thermalSettings";

export type SystemPrinterInfo = {
  name: string;
  displayName?: string;
  isDefault?: boolean;
};

type SilentPrintResponse =
  | boolean
  | {
      ok: boolean;
      reason?: string;
      printer?: string;
    };

type ElectronBridge = {
  getPrinters?: () => Promise<SystemPrinterInfo[]>;
  printSilent?: (deviceName?: string) => Promise<SilentPrintResponse>;
};

function getElectronBridge(): ElectronBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { electronAPI?: ElectronBridge }).electronAPI;
}

export function isVirtualPdfPrinter(name?: string): boolean {
  if (!name) return false;
  return /microsoft print to pdf|foxit.*pdf|xps document writer|onenote|fax/i.test(name);
}

export async function getAvailablePrinters(): Promise<SystemPrinterInfo[]> {
  const api = getElectronBridge();
  if (!api?.getPrinters) return [];
  try {
    return (await api.getPrinters()) || [];
  } catch {
    return [];
  }
}

export async function executeReceiptPrint(options?: {
  allowDialogOnVirtualPrinter?: boolean;
}): Promise<{
  printedSilently: boolean;
  usedDialog: boolean;
  reason?: string;
  printer?: string;
  message: string;
}> {
  const settings = getThermalSettings();
  const api = getElectronBridge();
  const useSilent = settings.silentPrint !== false;

  if (api?.printSilent && useSilent) {
    try {
      const rawRes = await api.printSilent(settings.printerName || undefined);
      const ok = typeof rawRes === "boolean" ? rawRes : Boolean(rawRes?.ok);
      const reason = typeof rawRes === "object" ? rawRes?.reason : undefined;
      const printer = typeof rawRes === "object" ? rawRes?.printer : settings.printerName;

      if (ok) {
        return {
          printedSilently: true,
          usedDialog: false,
          printer,
          message: printer
            ? `تمت الطباعة المباشرة فوراً على (${printer}) بدون نافذة الويندوز!`
            : "تمت الطباعة المباشرة فوراً بنجاح!",
        };
      }

      if (!options?.allowDialogOnVirtualPrinter) {
        return {
          printedSilently: false,
          usedDialog: false,
          reason,
          printer,
          message:
            reason === "virtual-printer"
              ? `الطابعة الحالية (${printer}) طابعة PDF افتراضية ولا تدعم الطباعة المباشرة بدون نافذة — وصّل طابعة كاشير حرارية واخترها من الإدارة ← الطباعة الحرارية.`
              : "تعذّر العثور على طابعة حرارية متصلة للطباعة المباشرة (اضغط إعادة طباعة لفتح نافذة الطابعة).",
        };
      }
    } catch {
      if (!options?.allowDialogOnVirtualPrinter) {
        return {
          printedSilently: false,
          usedDialog: false,
          reason: "exception",
          message: "تعذّرت الطباعة المباشرة — اضغط إعادة طباعة لفتح نافذة الطباعة.",
        };
      }
    }
  }

  window.print();
  return {
    printedSilently: false,
    usedDialog: true,
    message: api
      ? "تم فتح نافذة طباعة الجهاز لاختيار الطابعة."
      : "تم فتح نافذة طباعة المتصفح (للطباعة المباشرة بدون نافذة افتح برنامج سطح المكتب).",
  };
}

