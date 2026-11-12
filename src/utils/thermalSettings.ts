import { secureStorage } from "./secureStorage";
import { getSalonSettings } from "./salonSettings";

export interface ThermalSettings {
  printMode: "services_only" | "services_and_catalog" | "catalog_only";
  paperWidth: "80mm" | "58mm";
  headerTitle: string;
  footerMsg: string;
  shopAddress: string;
  taxId: string;
  printerName?: string;
  silentPrint?: boolean;
}

const STORAGE_KEY = "thermal_settings";

export function getThermalSettings(): ThermalSettings {
  const salon = getSalonSettings();
  const defaultThermal: ThermalSettings = {
    printMode: "services_only",
    paperWidth: "80mm",
    headerTitle: salon.salonName,
    footerMsg: "شكراً لزيارتكم • أناقتك تبدأ من هنا",
    shopAddress: salon.address,
    taxId: `ب.ض: ${salon.taxNumber} • س.ت: ${salon.commercialReg}`,
    printerName: "",
    silentPrint: true,
  };

  const stored = secureStorage.getItem<ThermalSettings>(STORAGE_KEY, defaultThermal);
  const resolvedHeader =
    !stored.headerTitle || stored.headerTitle === "صالون لمسة الفاخر" || stored.headerTitle === "صالون لمسة"
      ? salon.salonName
      : stored.headerTitle;
  const resolvedAddress =
    !stored.shopAddress || stored.shopAddress.includes("التجمع") || stored.shopAddress.includes("التسعين")
      ? salon.address
      : stored.shopAddress;

  return {
    ...defaultThermal,
    ...stored,
    headerTitle: resolvedHeader,
    shopAddress: resolvedAddress,
  };
}

export function saveThermalSettings(settings: ThermalSettings): void {
  secureStorage.setItem(STORAGE_KEY, settings);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("thermal-settings-updated", { detail: settings }));
  }
}
