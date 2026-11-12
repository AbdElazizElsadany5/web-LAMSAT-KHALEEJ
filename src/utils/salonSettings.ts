import { secureStorage } from "./secureStorage";

export interface SalonSettings {
  salonName: string;
  brandSub: string;
  address: string;
  phone: string;
  taxNumber: string;
  commercialReg: string;
  qrPortalUrl?: string;
}

export const defaultSalonSettings: SalonSettings = {
  salonName: "لمسة خليجي",
  brandSub: "LAMSAT KHALEEJI",
  address: "مساكن الجيش-بجوار بنك ناصر-بجوار سنترال حوده فون",
  phone: "01040734582",
  taxNumber: "412890331",
  commercialReg: "204910",
  qrPortalUrl: "https://web-lamsat-khaleej.vercel.app/",
};

const SALON_SETTINGS_KEY = "salon_settings";

export function getSalonSettings(): SalonSettings {
  const stored = secureStorage.getItem<SalonSettings>(SALON_SETTINGS_KEY, defaultSalonSettings);
  let needsResave = false;
  const updated = { ...stored };

  if (updated.salonName === "صالون لمسة الفاخر" || updated.salonName === "صالون لمسة") {
    updated.salonName = "لمسة خليجي";
    needsResave = true;
  }
  if (!updated.address || updated.address.includes("التجمع") || updated.address.includes("التسعين")) {
    updated.address = defaultSalonSettings.address;
    needsResave = true;
  }
  if (!updated.phone || updated.phone === "01099887766" || updated.phone.startsWith("010xxxx")) {
    updated.phone = defaultSalonSettings.phone;
    needsResave = true;
  }
  if (!updated.qrPortalUrl || updated.qrPortalUrl.includes("hassan-obaed.github.io")) {
    updated.qrPortalUrl = defaultSalonSettings.qrPortalUrl;
    needsResave = true;
  }

  if (needsResave) {
    secureStorage.setItem(SALON_SETTINGS_KEY, updated);
  }

  return updated;
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

