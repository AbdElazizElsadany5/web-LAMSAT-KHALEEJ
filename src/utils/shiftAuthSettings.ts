import { Barber } from "../types";
import { secureStorage } from "./secureStorage";

export interface ShiftAuthSettings {
  mode: "any_authorized" | "specific_person";
  specificPersonName?: string;
  requirePin?: boolean;
}

const SHIFT_AUTH_KEY = "pos_shift_auth_settings";

export const defaultShiftAuthSettings: ShiftAuthSettings = {
  mode: "any_authorized",
  specificPersonName: "",
  requirePin: false,
};

export function normalizeEmployeeName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();
}

export function getShiftAuthSettings(): ShiftAuthSettings {
  return secureStorage.getItem<ShiftAuthSettings>(SHIFT_AUTH_KEY, defaultShiftAuthSettings);
}

export function saveShiftAuthSettings(settings: Partial<ShiftAuthSettings>): ShiftAuthSettings {
  const current = getShiftAuthSettings();
  const updated: ShiftAuthSettings = { ...current, ...settings };
  secureStorage.setItem(SHIFT_AUTH_KEY, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("shift-auth-settings-changed", { detail: updated }));
  }

  return updated;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  matchedName?: string;
  matchedBarber?: Barber;
  requiresPin?: boolean;
}

export function validateShiftCashier(
  inputName: string,
  inputPin: string = "",
  barbers: Barber[] = [],
  adminPassword?: string
): ValidationResult {
  const trimmed = inputName.trim();
  if (!trimmed) {
    return { valid: false, error: "من فضلك اكتب اسم المسؤول عن الوردية أولاً." };
  }

  const normalizedInput = normalizeEmployeeName(trimmed);
  const authSettings = getShiftAuthSettings();
  const currentAdminPass = adminPassword || secureStorage.getItem<string>("pos_admin_password", "admin123");

  // 1. Check if Admin is logging in directly with Admin Password or Admin Name
  if (
    trimmed === currentAdminPass ||
    normalizedInput === normalizeEmployeeName("المدير") ||
    normalizedInput === normalizeEmployeeName("المدير العام") ||
    normalizedInput === normalizeEmployeeName("ادمن") ||
    normalizedInput === "admin"
  ) {
    if (authSettings.requirePin && inputPin && inputPin !== "1234" && inputPin !== currentAdminPass) {
      return { valid: false, error: "رمز PIN أو كلمة المرور للمدير غير صحيحة!" };
    }
    return { valid: true, matchedName: "المدير العام" };
  }

  // 2. Mode: Specific Person designated exclusively by Admin
  if (authSettings.mode === "specific_person" && authSettings.specificPersonName?.trim()) {
    const designated = authSettings.specificPersonName.trim();
    const normalizedDesignated = normalizeEmployeeName(designated);

    const isMatch =
      normalizedInput === normalizedDesignated ||
      normalizedInput.startsWith(normalizedDesignated) ||
      normalizedDesignated.startsWith(normalizedInput);

    if (!isMatch) {
      return {
        valid: false,
        error: `غير مصرح بهذا الاسم. قامت الإدارة بتحديد «${designated}» حصرياً كمسؤول معتمد لفتح الوردية.`,
      };
    }

    // Find if the designated person is in the employee database to check PIN and status
    const matchedEmployee = barbers.find(
      (b) =>
        normalizeEmployeeName(b.name) === normalizedDesignated ||
        normalizeEmployeeName(b.name).includes(normalizedDesignated)
    );

    if (matchedEmployee && matchedEmployee.canStartShift === false) {
      return {
        valid: false,
        error: `تم إيقاف صلاحية بدء الوردية عن «${matchedEmployee.name}» من لوحة الإدارة.`,
      };
    }

    if (authSettings.requirePin) {
      const expectedPin = matchedEmployee?.pin || "1234";
      if (!inputPin.trim()) {
        return { valid: false, requiresPin: true, error: "من فضلك أدخل رمز PIN السري للمسؤول." };
      }
      if (inputPin.trim() !== expectedPin && inputPin.trim() !== currentAdminPass) {
        return { valid: false, requiresPin: true, error: "رمز PIN السري غير صحيح لهذا المسؤول!" };
      }
    }

    return {
      valid: true,
      matchedName: matchedEmployee ? matchedEmployee.name : designated,
      matchedBarber: matchedEmployee,
    };
  }

  // 3. Mode: Any Authorized Employee from the Admin's team
  const matchedEmployee =
    barbers.find((b) => normalizeEmployeeName(b.name) === normalizedInput) ||
    barbers.find((b) => normalizeEmployeeName(b.name).startsWith(normalizedInput)) ||
    barbers.find((b) => normalizeEmployeeName(b.name).includes(normalizedInput)) ||
    barbers.find((b) => b.username && b.username.toLowerCase() === trimmed.toLowerCase());

  if (!matchedEmployee) {
    return {
      valid: false,
      error: "هذا الاسم غير مسجل في قائمة الموظفين المعتمدة من الإدارة. يرجى مراجعة إدارة الصالون.",
    };
  }

  if (matchedEmployee.canStartShift === false) {
    return {
      valid: false,
      error: `غير مصرح للموظف «${matchedEmployee.name}» ببدء الوردية — يرجى مراجعة الإدارة لتفعيل الصلاحية.`,
    };
  }

  if (authSettings.requirePin) {
    const expectedPin = matchedEmployee.pin || "1234";
    if (!inputPin.trim()) {
      return { valid: false, requiresPin: true, error: "من فضلك أدخل رمز PIN السري للموظف." };
    }
    if (inputPin.trim() !== expectedPin && inputPin.trim() !== currentAdminPass) {
      return { valid: false, requiresPin: true, error: "رمز PIN السري غير صحيح لهذا الموظف!" };
    }
  }

  return {
    valid: true,
    matchedName: matchedEmployee.name,
    matchedBarber: matchedEmployee,
  };
}
