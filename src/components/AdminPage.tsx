import { useState } from "react";
import {
  Invoice,
  Barber,
  Coupon,
  ExpenseRecord,
  ShiftRecord,
  AuditLog,
  InventoryProduct,
  ServiceItem,
  AdvanceRecord,
  AttendanceRecord,
} from "../types";
import { Icon, IconName } from "./Icons";

// Modular Admin Subcomponents
import { AdminOverview } from "./admin/AdminOverview";
import { AdminCoupons } from "./admin/AdminCoupons";
import { AdminEmployees } from "./admin/AdminEmployees";
import { AdminUsers } from "./admin/AdminUsers";
import { AdminExpenses } from "./admin/AdminExpenses";
import { AdminPayroll } from "./admin/AdminPayroll";
import { AdminAdvances } from "./admin/AdminAdvances";
import { AdminReports } from "./admin/AdminReports";
import { AdminShifts } from "./admin/AdminShifts";
import { AdminThermal } from "./admin/AdminThermal";
import { AdminAudit } from "./admin/AdminAudit";
import { AdminSettings } from "./admin/AdminSettings";
import { AdminBackup } from "./admin/AdminBackup";

export function AdminPage({
  invoices,
  barbers,
  coupons,
  expenses,
  shifts,
  auditLogs,
  inventory,
  services,
  advances = [],
  attendanceRecords = [],
  onSaveCoupon,
  onSaveEmployee,
  onAddExpense,
  onCloseShift,
  onSaveSettings,
  onAddAdvance,
  onEditAdvance,
  onDeleteAdvance,
}: {
  invoices: Invoice[];
  barbers: Barber[];
  coupons: Coupon[];
  expenses: ExpenseRecord[];
  shifts: ShiftRecord[];
  auditLogs: AuditLog[];
  inventory: InventoryProduct[];
  services: ServiceItem[];
  advances?: AdvanceRecord[];
  attendanceRecords?: AttendanceRecord[];
  onSaveCoupon: (coupon: Coupon) => void;
  onSaveEmployee: (employee: Barber) => void;
  onAddExpense: (expense: ExpenseRecord) => void;
  onCloseShift: (shiftId: number, actualCash: number, notes: string) => void;
  onSaveSettings: (settings: Record<string, string>) => void;
  onAddAdvance?: (advance: AdvanceRecord) => void;
  onEditAdvance?: (advance: AdvanceRecord) => void;
  onDeleteAdvance?: (id: string) => void;
}) {
  const [activeSection, setActiveSection] = useState<string>("نظرة عامة");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const adminSections: { id: string; label: string; icon: IconName }[] = [
    { id: "نظرة عامة", label: "نظرة عامة", icon: "grid" },
    { id: "الكوبونات", label: "الكوبونات", icon: "tag" },
    { id: "الموظفون", label: "الموظفون", icon: "users" },
    { id: "المستخدمون", label: "المستخدمون", icon: "key" },
    { id: "المصروفات", label: "المصروفات", icon: "wallet" },
    { id: "السلف والخصومات", label: "السلف والخصومات", icon: "dollarSign" },
    { id: "الرواتب والمستحقات", label: "الرواتب والمستحقات", icon: "users" },
    { id: "التقارير", label: "التقارير", icon: "chart" },
    { id: "الورديات والخزينة", label: "الورديات والخزينة", icon: "receipt" },
    { id: "الطباعة الحرارية", label: "الطباعة الحرارية", icon: "printer" },
    { id: "سجل العمليات", label: "سجل العمليات", icon: "shield" },
    { id: "الإعدادات", label: "الإعدادات", icon: "settings" },
    { id: "النسخ الاحتياطي", label: "النسخ الاحتياطي", icon: "backup" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 12 Tabs Internal Navigation Strip */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
          borderBottom: "1px solid #201B12",
          scrollbarWidth: "none",
        }}
      >
        {adminSections.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? "#F5C242" : "#A0A0A0",
                background: isActive
                  ? "linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)"
                  : "#121212",
                border: `1px solid ${isActive ? "#D4AF37" : "#262015"}`,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Icon name={sec.icon} size={15} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Subcomponent */}
      {activeSection === "نظرة عامة" && (
        <AdminOverview
          invoices={invoices}
          expenses={expenses}
          barbers={barbers}
          services={services}
          auditLogs={auditLogs}
          onShowToast={showToast}
        />
      )}

      {activeSection === "الكوبونات" && (
        <AdminCoupons
          coupons={coupons}
          onSaveCoupon={onSaveCoupon}
          onShowToast={showToast}
        />
      )}

      {activeSection === "الموظفون" && (
        <AdminEmployees
          barbers={barbers}
          attendanceRecords={attendanceRecords}
          advances={advances}
          onSaveEmployee={onSaveEmployee}
          onShowToast={showToast}
        />
      )}

      {activeSection === "المستخدمون" && (
        <AdminUsers onShowToast={showToast} />
      )}

      {activeSection === "المصروفات" && (
        <AdminExpenses
          expenses={expenses}
          onAddExpense={onAddExpense}
          onShowToast={showToast}
        />
      )}

      {activeSection === "السلف والخصومات" && (
        <AdminAdvances
          advances={advances}
          barbers={barbers}
          onAdd={onAddAdvance || (() => {})}
          onEdit={onEditAdvance || (() => {})}
          onDelete={onDeleteAdvance || (() => {})}
          currentUser="المدير العام"
        />
      )}

      {activeSection === "الرواتب والمستحقات" && (
        <AdminPayroll
          barbers={barbers}
          advances={advances}
          onShowToast={showToast}
        />
      )}

      {activeSection === "التقارير" && (
        <AdminReports
          invoices={invoices}
          onShowToast={showToast}
        />
      )}

      {activeSection === "الورديات والخزينة" && (
        <AdminShifts
          shifts={shifts}
          onCloseShift={onCloseShift}
          onShowToast={showToast}
        />
      )}

      {activeSection === "الطباعة الحرارية" && (
        <AdminThermal onShowToast={showToast} />
      )}

      {activeSection === "سجل العمليات" && (
        <AdminAudit
          auditLogs={auditLogs}
          onShowToast={showToast}
        />
      )}

      {activeSection === "الإعدادات" && (
        <AdminSettings
          onSaveSettings={onSaveSettings}
          onShowToast={showToast}
        />
      )}

      {activeSection === "النسخ الاحتياطي" && (
        <AdminBackup onShowToast={showToast} />
      )}

      {/* Local Toast notification */}
      {toastMsg && (
        <div className="toast-bar">
          <Icon name="check" size={17} style={{ color: "#3FB950" } as any} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
