export type UserRole = "admin" | "cashier" | "employee";
export type Page = "pos" | "attendance" | "invoices" | "services" | "inventory" | "admin";

export type BarberAvailability = "متاح" | "مشغول" | "في استراحة" | "غير حاضر" | "منصرف";

export type Barber = {
  id: string;
  name: string;
  title: string;
  avatar: string;
  phone: string;
  status: BarberAvailability;
  checkInTime: string;
  checkOutTime: string;
  pin: string;
  salaryType: "ثابت";
  basicSalary: number;
  completedToday: number;
  revenueToday: number;
  rating: number;
  username?: string;
  password?: string;
  iban?: string;
  // Deprecated/kept optional for backward compatibility
  commissionRate?: number;
  commissionEarned?: number;
};

export type ServiceCategory =
  | "الكل"
  | "قص الشعر"
  | "الذقن"
  | "التسريحات"
  | "العناية بالبشرة"
  | "الباقات"
  | "خدمات أخرى";

export type ServiceItem = {
  id: number;
  name: string;
  category: ServiceCategory;
  price: number;
  duration: number; // in minutes
  iconText: string;
  status: "متاح" | "مشغول" | "معطل";
  commissionRate?: number;
  description?: string;
  includedServices?: string[];
  isPackage?: boolean;
};

export type CartItem = {
  serviceId: number;
  name: string;
  category: ServiceCategory;
  price: number;
  duration: number;
  qty: number;
  barberId: string;
  barberName: string;
};

export type PaymentMethod = "نقداً" | "بطاقة" | "إنستاباي" | "دفع مختلط";

export type InvoiceStatus = "مكتملة" | "معلقة" | "ملغاة" | "مسترجعة";

export type InvoiceItem = {
  name: string;
  barber: string;
  price: number;
  qty: number;
  commission: number;
};

export type Invoice = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  tip: number;
  total: number;
  paymentMethod: PaymentMethod;
  splitDetails?: { cash: number; card: number };
  status: InvoiceStatus;
  cashierName: string;
  shiftId: number;
  reprintCount: number;
  cancellationReason?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  refundReason?: string;
};

export type HeldOrder = {
  id: string;
  holdTime: string;
  customerNote: string;
  items: CartItem[];
  subtotal: number;
};

export type Coupon = {
  id: string;
  code: string;
  discountType: "percentage" | "fixed" | "نسبة" | "مبلغ ثابت";
  discountValue: number;
  minOrderValue?: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usageCount?: number;
  status: "نشط" | "موقوف" | "منتهي";
  // Backwards compatibility aliases
  type?: "percentage" | "fixed" | "نسبة" | "مبلغ ثابت";
  value?: number;
  minOrder?: number;
  maxDiscount?: number;
};

export type ExpenseCategory =
  | "إيجار"
  | "كهرباء ومياه"
  | "ضيافة وعصائر"
  | "ضيافة وبوفيه"
  | "صيانة ومعدات"
  | "صيانة أجهزة"
  | "أدوات حلاقة"
  | "مستلزمات تشغيل"
  | "نظافة وتطهير"
  | "فواتير وخدمات"
  | "أخرى"
  | string;

export type ExpenseRecord = {
  id: string;
  amount: number;
  date: string;
  time: string;
  category: ExpenseCategory;
  description?: string;
  title?: string;
  paymentMethod?: "نقد من الدرج" | "تحويل بنكي" | string;
  paymentSource?: string;
  registeredBy: string;
  receiptAttachment?: string;
  invoicePhotoAttached?: boolean;
  shiftDeduction?: boolean;
  deductedFromDrawer?: boolean;
};

export type AttendanceRecord = {
  id: string;
  barberId: string;
  barberName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours?: number;
  hoursWorked?: number;
  lateMinutes?: number;
  minutesLate?: number;
  status: "حاضر" | "في استراحة" | "منصرف" | "لم يحضر";
  correctionNote?: string;
};

export type ShiftRecord = {
  id: number;
  cashierName: string;
  openTime: string;
  startTime?: string;
  closeTime?: string;
  openingCash: number;
  initialCash?: number;
  cashSales: number;
  cardSales: number;
  totalSales?: number;
  invoiceCount?: number;
  instaPaySales: number;
  instapaySales?: number;
  drawerExpenses: number;
  cashExpenses?: number;
  deposits: number;
  withdrawals: number;
  refunds: number;
  expectedCash: number;
  expectedDrawerCash?: number;
  actualCash?: number;
  difference?: number;
  status: "نشطة" | "مغلقة";
  handoverNotes?: string;
};

export type AuditLog = {
  id: string;
  user: string;
  action: string;
  category: "بيع" | "إلغاء" | "استرجاع" | "كشف رقم عميل" | "تعديل حضور" | "تغيير سعر" | "سلفة أو خصم" | "إغلاق وردية" | "نسخ احتياطي" | string;
  timestamp: string;
  previousValue: string;
  newValue: string;
  reason?: string;
  severity: "عادي" | "حساس" | "حرج";
};

export type InventoryProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  minThreshold: number;
  minAlertStock?: number;
  unitCost: number;
  purchasePrice?: number;
  sellingPrice?: number;
  supplier: string;
  lastPurchaseDate?: string;
  status: "متوفر" | "مخزون منخفض" | "حرج";
  unit?: string;
};

export type PrintMode = "services_only" | "services_and_catalog" | "services_with_catalog" | "catalog_only";

export type AdvanceRecord = {
  id: string;
  barberId: string;
  barberName: string;
  amount: number;
  reason: string;
  date: string;
  time: string;
  registeredBy: string;
  registeredByRole: "cashier" | "admin";
  status: "نشط" | "مسدد" | "جزئي";
  paidAmount?: number;
  notes?: string;
};

