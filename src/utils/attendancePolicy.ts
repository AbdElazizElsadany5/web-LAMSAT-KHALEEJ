import { AttendanceRecord } from "../types";
import { secureStorage } from "./secureStorage";

export interface AttendancePolicy {
  graceMinutes: number;
  deductionPerMinute: number;
  defaultScheduledTime: string;
}

export const defaultAttendancePolicy: AttendancePolicy = {
  graceMinutes: 0,
  deductionPerMinute: 2,
  defaultScheduledTime: "09:00",
};

const ATTENDANCE_POLICY_KEY = "attendance_policy_settings";

export function getAttendancePolicy(): AttendancePolicy {
  const stored = secureStorage.getItem<Partial<AttendancePolicy>>(
    ATTENDANCE_POLICY_KEY,
    defaultAttendancePolicy
  );
  return {
    graceMinutes:
      typeof stored.graceMinutes === "number" && stored.graceMinutes >= 0
        ? stored.graceMinutes
        : defaultAttendancePolicy.graceMinutes,
    deductionPerMinute:
      typeof stored.deductionPerMinute === "number" && stored.deductionPerMinute >= 0
        ? stored.deductionPerMinute
        : defaultAttendancePolicy.deductionPerMinute,
    defaultScheduledTime:
      typeof stored.defaultScheduledTime === "string" && /^\d{1,2}:\d{2}$/.test(stored.defaultScheduledTime)
        ? stored.defaultScheduledTime
        : defaultAttendancePolicy.defaultScheduledTime,
  };
}

export function saveAttendancePolicy(partial: Partial<AttendancePolicy>): AttendancePolicy {
  const current = getAttendancePolicy();
  const updated: AttendancePolicy = {
    graceMinutes: Math.max(0, Number(partial.graceMinutes ?? current.graceMinutes) || 0),
    deductionPerMinute: Math.max(0, Number(partial.deductionPerMinute ?? current.deductionPerMinute) || 0),
    defaultScheduledTime: partial.defaultScheduledTime || current.defaultScheduledTime,
  };
  secureStorage.setItem(ATTENDANCE_POLICY_KEY, updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("attendance-policy-changed", { detail: updated }));
  }

  return updated;
}

function normalizeArabicDigits(input: string): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return input.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
}

/**
 * Parses either 24h ("09:00", "14:30") or Arabic/English 12h ("09:05 ص", "02:15 م", "9:05 PM")
 * into minutes since midnight. Returns null if not parseable (e.g. "—").
 */
export function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr) return null;
  const cleaned = normalizeArabicDigits(timeStr).trim();
  if (!cleaned || cleaned === "—") return null;

  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const isPM = /(?:^|\s|[\d])(م|PM|pm)(?:\s|$)/.test(cleaned) || cleaned.includes("مساء");
  const isAM = /(?:^|\s|[\d])(ص|AM|am)(?:\s|$)/.test(cleaned) || cleaned.includes("صباح");

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function formatTime24ToArabic12(time24: string | undefined): string {
  if (!time24 || time24 === "—") return "—";
  const mins = parseTimeToMinutes(time24);
  if (mins === null) return time24;
  const totalHours = Math.floor(mins / 60) % 24;
  const remainingMins = mins % 60;
  const suffix = totalHours >= 12 ? "م" : "ص";
  const displayHour = totalHours % 12 === 0 ? 12 : totalHours % 12;
  return `${String(displayHour).padStart(2, "0")}:${String(remainingMins).padStart(2, "0")} ${suffix}`;
}

export function calculateLateMetrics(
  scheduledTime: string | undefined,
  actualTime: string | Date,
  policy: AttendancePolicy
): { lateMinutes: number; lateDeduction: number } {
  const schedMins = parseTimeToMinutes(scheduledTime || policy.defaultScheduledTime);
  if (schedMins === null) return { lateMinutes: 0, lateDeduction: 0 };

  let actualMins: number | null = null;
  if (actualTime instanceof Date) {
    actualMins = actualTime.getHours() * 60 + actualTime.getMinutes();
  } else {
    actualMins = parseTimeToMinutes(actualTime);
  }

  if (actualMins === null) return { lateMinutes: 0, lateDeduction: 0 };

  const diff = actualMins - schedMins;
  const lateMinutes = diff > policy.graceMinutes ? diff - policy.graceMinutes : 0;
  const lateDeduction = Math.round(lateMinutes * Math.max(0, policy.deductionPerMinute));
  return { lateMinutes, lateDeduction };
}

export function getRecordLateMinutes(rec: AttendanceRecord): number {
  return rec.lateMinutes ?? rec.minutesLate ?? 0;
}

export function getRecordLateDeduction(rec: AttendanceRecord, policy: AttendancePolicy): number {
  return Math.round(getRecordLateMinutes(rec) * Math.max(0, policy.deductionPerMinute));
}
