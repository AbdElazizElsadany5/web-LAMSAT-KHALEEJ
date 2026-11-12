import { useState } from "react";
import {
  Invoice,
  Barber,
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
import { AdminEmployees } from "./admin/AdminEmployees";
import { AdminExpenses } from "./admin/AdminExpenses";
import { AdminPayroll } from "./admin/AdminPayroll";
import { AdminAdvances } from "./admin/AdminAdvances";
import { AdminReports } from "./admin/AdminReports";
import { AdminShifts } from "./admin/AdminShifts";
import { AdminThermal } from "./admin/AdminThermal";
import { AdminAudit } from "./admin/AdminAudit";
import { AdminSettings } from "./admin/AdminSettings";
import { AdminBackup } from "./admin/AdminBackup";
import { InvoicesPage } from "./InvoicesPage";
import { ServicesPage } from "./ServicesPage";
import { InventoryPage } from "./InventoryPage";
import { AttendancePage } from "./AttendancePage";

export const ADMIN_SECTIONS: { id: string; label: string; icon: IconName }[] = [
  { id: "نظرة عامة", label: "نظرة عامة", icon: "grid" },
  { id: "الفواتير", label: "الفواتير", icon: "receipt" },
  { id: "الخدمات", label: "الخدمات", icon: "scissors" },
  { id: "المشتريات والمخزون", label: "المشتريات والمخزون", icon: "box" },
  { id: "إدارة الحضور", label: "إدارة الحضور", icon: "clock" },
  { id: "الموظفون", label: "الموظفون", icon: "users" },
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

export function AdminPage({
  invoices,
  barbers,
  expenses,
  shifts,
  auditLogs,
  inventory,
  services,
  advances = [],
  attendanceRecords = [],
  activeUsername = "المدير العام",
  activeSection: controlledSection,
  onSaveEmployee,
  onAddExpense,
  onCloseShift,
  onDeleteShift,
  onSaveSettings,
  onAddAdvance,
  onEditAdvance,
  onDeleteAdvance,
  onCancelInvoice,
  onRefundInvoice,
  onRevealPhone,
  onSaveService,
  onToggleServiceStatus,
  onArchiveService,
  onAddProduct,
  onRecordPurchase,
  onRecordConsumption,
  onDeleteProduct,
  onUpdateBarberStatus,
  onAdminCorrectAttendance,
  onUpdateBarberSchedule,
  onDeleteEmployee,
  adminPassword,
  onUpdateAdminPassword,
}: {
  invoices: Invoice[];
  barbers: Barber[];
  expenses: ExpenseRecord[];
  shifts: ShiftRecord[];
  auditLogs: AuditLog[];
  inventory: InventoryProduct[];
  services: ServiceItem[];
  advances?: AdvanceRecord[];
  attendanceRecords?: AttendanceRecord[];
  activeUsername?: string;
  activeSection?: string;
  onSaveEmployee: (employee: Barber) => void;
  onDeleteEmployee?: (barberId: string) => void;
  onAddExpense: (expense: ExpenseRecord) => void;
  onCloseShift: (shiftId: number, actualCash: number, notes: string) => void;
  onDeleteShift?: (shiftId: number) => void;
  onSaveSettings: (settings: Record<string, string>) => void;
  onAddAdvance?: (advance: AdvanceRecord) => void;
  onEditAdvance?: (advance: AdvanceRecord) => void;
  onDeleteAdvance?: (id: string) => void;
  onCancelInvoice: (invoiceId: string, reason: string) => void;
  onRefundInvoice: (invoiceId: string, reason: string) => void;
  onRevealPhone: (invoiceId: string, reason: string) => void;
  onSaveService: (service: ServiceItem) => void;
  onToggleServiceStatus: (serviceId: number) => void;
  onArchiveService: (serviceId: number) => void;
  onAddProduct: (product: InventoryProduct) => void;
  onRecordPurchase: (supplier: string, invoiceNum: string, itemsDesc: string, totalCost: number) => void;
  onRecordConsumption: (barberId: string, productId: string, qty: number, reason: string) => void;
  onDeleteProduct?: (productId: string) => void;
  onUpdateBarberStatus: (barberId: string, newStatus: Barber["status"], timeStr: string) => void;
  onAdminCorrectAttendance: (recordId: string, newCheckIn: string, newCheckOut: string, reason: string) => void;
  onUpdateBarberSchedule?: (barberId: string, scheduledTime: string) => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (newPass: string) => void;
}) {
  const activeSection = controlledSection || "نظرة عامة";
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

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

      {activeSection === "الفواتير" && (
        <InvoicesPage
          invoices={invoices}
          userRole="admin"
          onCancelInvoice={onCancelInvoice}
          onRefundInvoice={onRefundInvoice}
          onRevealPhone={onRevealPhone}
        />
      )}

      {activeSection === "الخدمات" && (
        <ServicesPage
          services={services}
          onSaveService={onSaveService}
          onToggleServiceStatus={onToggleServiceStatus}
          onArchiveService={onArchiveService}
        />
      )}

      {activeSection === "المشتريات والمخزون" && (
        <InventoryPage
          products={inventory}
          barbers={barbers}
          onAddProduct={onAddProduct}
          onRecordPurchase={onRecordPurchase}
          onRecordConsumption={onRecordConsumption}
          onDeleteProduct={onDeleteProduct}
        />
      )}

      {activeSection === "إدارة الحضور" && (
        <AttendancePage
          barbers={barbers}
          attendanceRecords={attendanceRecords}
          advances={advances}
          userRole="admin"
          activeEmployeeName={activeUsername}
          onUpdateBarberStatus={onUpdateBarberStatus}
          onAdminCorrectAttendance={onAdminCorrectAttendance}
          onUpdateBarberSchedule={onUpdateBarberSchedule}
        />
      )}

      {activeSection === "الموظفون" && (
        <AdminEmployees
          barbers={barbers}
          attendanceRecords={attendanceRecords}
          advances={advances}
          onSaveEmployee={onSaveEmployee}
          onDeleteEmployee={onDeleteEmployee}
          onShowToast={showToast}
        />
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
          attendanceRecords={attendanceRecords}
          onShowToast={showToast}
          onAddExpense={onAddExpense}
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
          onDeleteShift={onDeleteShift}
          onShowToast={showToast}
          invoices={invoices}
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
          adminPassword={adminPassword}
          onUpdateAdminPassword={onUpdateAdminPassword}
        />
      )}

      {activeSection === "النسخ الاحتياطي" && (
        <AdminBackup onShowToast={showToast} />
      )}

      {/* Local Toast notification */}
      {toastMsg && (
        <div className="toast-bar">
          <Icon name="check" size={17} style={{ color: "var(--success-text)" } as any} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
