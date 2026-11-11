import { secureStorage } from "./secureStorage";

export interface SalonSettings {
  salonName: string;
  brandSub: string;
  address: string;
  phone: string;
  taxNumber: string;
  commercialReg: string;
}

export const defaultSalonSettings: SalonSettings = {
  salonName: "صالون لمسة الفاخر",
  brandSub: "LAMSAT KHALEEJI",
  address: "القاهرة الجديدة - التجمع الخامس (شارع التسعين)",
  phone: "01099887766",
  taxNumber: "412890331",
  commercialReg: "204910",
};

const SALON_SETTINGS_KEY = "salon_settings";

export function getSalonSettings(): SalonSettings {
  return secureStorage.getItem<SalonSettings>(SALON_SETTINGS_KEY, defaultSalonSettings);
}

export function saveSalonSettings(settings: Partial<SalonSettings>): SalonSettings {
  const current = getSalonSettings();
  const updated: SalonSettings = { ...current, ...settings };
  secureStorage.setItem(SALON_SETTINGS_KEY, updated);

  // Sync with thermal receipt settings as well
  try {
    const rawThermal = localStorage.getItem("lamsat_sec_thermal_settings") || localStorage.getItem("thermal_settings");
    let thermalObj = rawThermal ? JSON.parse(rawThermal) : {};
    thermalObj = {
      ...thermalObj,
      headerTitle: updated.salonName,
      shopAddress: updated.address,
      taxId: `ب.ض: ${updated.taxNumber} • س.ت: ${updated.commercialReg}`,
    };
    secureStorage.setItem("thermal_settings", thermalObj);
  } catch {}

  // Dispatch global custom event for instant live UI updates without reloading
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("salon-settings-changed", { detail: updated }));
  }

  return updated;
}

