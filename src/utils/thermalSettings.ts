import { secureStorage } from "./secureStorage";
import { getSalonSettings } from "./salonSettings";

export interface ThermalSettings {
  printMode: "services_only" | "services_and_catalog" | "catalog_only";
  paperWidth: "80mm" | "58mm";
  headerTitle: string;
  footerMsg: string;
  shopAddress: string;
  taxId: string;
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
  };

  const stored = secureStorage.getItem<ThermalSettings>(STORAGE_KEY, defaultThermal);
  // Ensure if salon address was updated, it takes effect
  return {
    ...defaultThermal,
    ...stored,
    headerTitle: stored.headerTitle || salon.salonName,
    shopAddress: stored.shopAddress || salon.address,
  };
}

export function saveThermalSettings(settings: ThermalSettings): void {
  secureStorage.setItem(STORAGE_KEY, settings);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("thermal-settings-updated", { detail: settings }));
  }
}
