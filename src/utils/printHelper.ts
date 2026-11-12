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

export async function checkThermalPrinterConnection(): Promise<{
  isConnected: boolean;
  isElectron: boolean;
  printerName?: string;
  message: string;
}> {
  const api = getElectronBridge();
  if (!api) {
    return {
      isConnected: false,
      isElectron: false,
      message: "يعمل في وضع الويب/المتصفح (لا يوجد تعريف مباشر لطابعة حرارية بدون نافذة الويندوز)",
    };
  }

  try {
    const printers = await api.getPrinters?.();
    if (!printers || printers.length === 0) {
      return {
        isConnected: false,
        isElectron: true,
        message: "لم يتم العثور على أي طابعة متصلة بالنظام",
      };
    }

    const settings = getThermalSettings();
    if (settings.printerName) {
      const match = printers.find(
        (p) => p.name.toLowerCase() === settings.printerName.toLowerCase()
      );
      if (match) {
        return { isConnected: true, isElectron: true, printerName: match.name, message: "الطابعة متصلة وجاهزة" };
      }
    }

    // Check if any non-virtual physical printer is available
    const physical = printers.find((p) => !isVirtualPdfPrinter(p.name));
    if (physical) {
      return { isConnected: true, isElectron: true, printerName: physical.name, message: "الطابعة متصلة وجاهزة" };
    }

    return {
      isConnected: false,
      isElectron: true,
      message: "لا توجد طابعة إيصالات حرارية متصلة (الطابعات المتوفرة طابعات PDF افتراضية)",
    };
  } catch {
    return {
      isConnected: false,
      isElectron: true,
      message: "تعذر فحص حالة الطابعة",
    };
  }
}

export type PrintExecutionResult = {
  isPrinterConnected: boolean;
  printedSilently: boolean;
  usedDialog: boolean;
  reason?: string;
  printer?: string;
  message: string;
};

export async function executeReceiptPrint(options?: {
  allowDialogOnVirtualPrinter?: boolean;
}): Promise<PrintExecutionResult> {
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
          isPrinterConnected: true,
          printedSilently: true,
          usedDialog: false,
          printer,
          message: printer
            ? `تمت الطباعة المباشرة فوراً على (${printer}) بنجاح!`
            : "تمت الطباعة المباشرة فوراً بنجاح!",
        };
      }

      // Silent print failed (e.g. printer off, disconnected, or virtual PDF)
      if (!options?.allowDialogOnVirtualPrinter) {
        return {
          isPrinterConnected: false,
          printedSilently: false,
          usedDialog: false,
          reason: reason || "printer-offline",
          printer,
          message:
            reason === "virtual-printer"
              ? `الطابعة المحددة (${printer}) طابعة PDF افتراضية ولا تدعم الطباعة الحرارية المباشرة.`
              : "لا توجد طابعة إيصالات حرارية متصلة بالجهاز حالياً!",
        };
      }
    } catch {
      if (!options?.allowDialogOnVirtualPrinter) {
        return {
          isPrinterConnected: false,
          printedSilently: false,
          usedDialog: false,
          reason: "exception",
          message: "تعذر الاتصال بالطابعة الحرارية — تأكد من تشغيل الطابعة وتوصيل الكابل.",
        };
      }
    }
  }

  // If in browser or explicit manual fallback requested
  if (options?.allowDialogOnVirtualPrinter) {
    if (typeof window !== "undefined") {
      window.print();
    }
    return {
      isPrinterConnected: false,
      printedSilently: false,
      usedDialog: true,
      message: api
        ? "تم فتح نافذة الطباعة لاختيار الطابعة يدوياً."
        : "تم فتح نافذة طباعة المتصفح.",
    };
  }

  return {
    isPrinterConnected: false,
    printedSilently: false,
    usedDialog: false,
    reason: "no-thermal-printer",
    message: "لا توجد طابعة إيصالات حرارية متصلة بالجهاز حالياً!",
  };
}
