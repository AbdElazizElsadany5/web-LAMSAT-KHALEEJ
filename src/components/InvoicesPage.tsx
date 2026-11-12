import { useState, useMemo } from "react";
import { Invoice, UserRole, PaymentMethod, InvoiceStatus } from "../types";
import { Icon } from "./Icons";

export function InvoicesPage({
  invoices,
  userRole,
  onCancelInvoice,
  onRefundInvoice,
  onRevealPhone,
}: {
  invoices: Invoice[];
  userRole: UserRole;
  onCancelInvoice: (invoiceId: string, reason: string) => void;
  onRefundInvoice: (invoiceId: string, reason: string) => void;
  onRevealPhone: (invoiceId: string, reason: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("الكل");
  const [statusFilter, setStatusFilter] = useState<string>("الكل");
  const [dateFilter, setDateFilter] = useState<string>("الكل");

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [revealReasonInput, setRevealReasonInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerPhone.includes(searchQuery);

      const matchMethod = methodFilter === "الكل" || inv.paymentMethod === methodFilter;
      const matchStatus = statusFilter === "الكل" || inv.status === statusFilter;

      return matchSearch && matchMethod && matchStatus;
    });
  }, [invoices, searchQuery, methodFilter, statusFilter, dateFilter]);

  // KPIs
  const totalSales = useMemo(() => {
    return invoices
      .filter((i) => i.status === "مكتملة")
      .reduce((acc, i) => acc + i.total, 0);
  }, [invoices]);

  const completedCount = invoices.filter((i) => i.status === "مكتملة").length;
  const avgTicket = completedCount > 0 ? Math.round(totalSales / completedCount) : 0;
  const refundedCount = invoices.filter((i) => i.status === "مسترجعة" || i.status === "ملغاة").length;

  // Mask phone number
  const getMaskedPhone = (phone: string, invId: string) => {
    if (revealedPhones[invId]) return phone;
    if (phone.length <= 4) return "****";
    return phone.slice(0, 3) + "****" + phone.slice(-3);
  };

  // Handle Reveal Phone Click
  const handleRequestRevealPhone = () => {
    setAdminPasswordInput("");
    setRevealReasonInput("");
    setPasswordError("");
    setPasswordModalOpen(true);
  };

  const handleConfirmAdminPassword = () => {
    if (adminPasswordInput !== "admin123") {
      setPasswordError("كلمة مرور الأدمن غير صحيحة!");
      return;
    }
    if (!revealReasonInput.trim()) {
      setPasswordError("يجب ذكر سبب كشف رقم هاتف العميل لتوثيقه أمنياً!");
      return;
    }
    if (selectedInvoice) {
      setRevealedPhones({ ...revealedPhones, [selectedInvoice.id]: true });
      onRevealPhone(selectedInvoice.id, revealReasonInput.trim());
      setPasswordModalOpen(false);
      showToast(`تم كشف رقم الهاتف الكامل للعميل وتوثيق الإجراء والسبب في سجل التدقيق`);
    }
  };

  // Execute Cancellation
  const handleConfirmCancel = () => {
    if (!selectedInvoice || !reasonInput.trim()) {
      alert("الرجاء كتابة سبب إلغاء الفاتورة");
      return;
    }
    onCancelInvoice(selectedInvoice.id, reasonInput);
    setCancelModalOpen(false);
    setSelectedInvoice(null);
    setReasonInput("");
    showToast(`تم إلغاء الفاتورة بنجاح وتعديل رصيد الخزينة`);
  };

  // Execute Refund
  const handleConfirmRefund = () => {
    if (!selectedInvoice || !reasonInput.trim()) {
      alert("الرجاء كتابة سبب استرجاع الفاتورة");
      return;
    }
    onRefundInvoice(selectedInvoice.id, reasonInput);
    setRefundModalOpen(false);
    setSelectedInvoice(null);
    setReasonInput("");
    showToast(`تم استرجاع الفاتورة بنجاح وخصم المسترد من الوردية`);
  };

  return (
    <div>
      {/* Top Header KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">إجمالي مبيعات اليوم</div>
            <div className="kpi-value gold">{totalSales.toLocaleString()} <small style={{ fontSize: 14 }}>ج.م</small></div>
            <div className="kpi-hint positive">
              <Icon name="trendingUp" size={13} />
              <span>مبيعات الوردية النشطة</span>
            </div>
          </div>
          <div className="kpi-icon-wrap">
            <Icon name="wallet" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">عدد الفواتير الصادرة</div>
            <div className="kpi-value">{invoices.length} <small style={{ fontSize: 14 }}>فاتورة</small></div>
            <div className="kpi-hint">
              <span>{completedCount} مكتملة • {refundedCount} مسترجعة/ملغاة</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#F5C242", borderColor: "#554215" }}>
            <Icon name="receipt" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">متوسط قيمة الفاتورة</div>
            <div className="kpi-value">{avgTicket} <small style={{ fontSize: 14 }}>ج.م</small></div>
            <div className="kpi-hint">
              <span>لكل عميل زائر</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#3FB950", borderColor: "#1A4522" }}>
            <Icon name="chart" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">المسترجعات والإلغاء</div>
            <div className="kpi-value" style={{ color: refundedCount > 0 ? "#FF8E92" : "#999" }}>
              {refundedCount} <small style={{ fontSize: 14 }}>عملية</small>
            </div>
            <div className="kpi-hint" style={{ color: refundedCount > 0 ? "#FF8E92" : "#888" }}>
              <span>تتطلب اعتماد الأدمن بكلمة المرور</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#E5484D", borderColor: "#5A1E20" }}>
            <Icon name="alert" size={20} />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>سجل الفواتير وعمليات البيع</h2>
            <p>بحث، تدقيق، إعادة طباعة الإيصالات، وإجراءات الإلغاء والاسترجاع</p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => showToast("تم تصدير تقرير الفواتير إلى ملف Excel بنجاح")}
            >
              <Icon name="download" size={15} />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            background: "#181818",
            border: "1px solid #2B2519",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 12,
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div className="search-bar-wrap">
            <span className="search-icon">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="search-input"
              style={{ height: 40 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة أو اسم العميل أو الهاتف..."
            />
          </div>

          {/* Payment Method */}
          <div>
            <select
              className="form-select"
              style={{ height: 40 }}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="الكل">كل طرق الدفع</option>
              <option value="نقداً">نقداً</option>
              <option value="بطاقة">بطاقة</option>
              <option value="إنستاباي">إنستاباي</option>
              <option value="دفع مختلط">دفع مختلط</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="form-select"
              style={{ height: 40 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="الكل">كل الحالات</option>
              <option value="مكتملة">مكتملة</option>
              <option value="ملغاة">ملغاة</option>
              <option value="مسترجعة">مسترجعة</option>
            </select>
          </div>

          {/* Date Presets */}
          <div>
            <select
              className="form-select"
              style={{ height: 40 }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="الكل">كل الفترات (اليوم)</option>
              <option value="أمس">أمس</option>
              <option value="هذا الأسبوع">هذا الأسبوع</option>
              <option value="هذا الشهر">هذا الشهر</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>التاريخ والوقت</th>
                <th>الخدمات المنفذة</th>
                <th>الحلاقون</th>
                <th>الإجمالي</th>
                <th>طريقة الدفع</th>
                <th>الحالة</th>
                <th>الكاشير</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 800, color: "#F5C242", fontFamily: "Inter" }}>
                    {inv.id}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{inv.customerName}</div>
                    <div style={{ fontSize: 11, color: "#888", fontFamily: "Inter", direction: "ltr", textAlign: "right" }}>
                      {getMaskedPhone(inv.customerPhone, inv.id)}
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "#AAA" }}>
                    <div>{inv.date}</div>
                    <div style={{ fontSize: 11, color: "#777", fontFamily: "Inter" }}>{inv.time}</div>
                  </td>
                  <td style={{ fontSize: 13, maxWidth: 200 }}>
                    {inv.items.map((i) => i.name).join("، ")}
                  </td>
                  <td style={{ fontSize: 13, color: "#D4AF37" }}>
                    {[...new Set(inv.items.map((i) => i.barber))].join("، ")}
                  </td>
                  <td style={{ fontWeight: 800, fontSize: 16, color: "#F5C242", fontFamily: "Inter" }}>
                    {inv.total} <small style={{ fontSize: 11, fontFamily: "Cairo" }}>ج.م</small>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "#1E1E1E",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#DDD",
                      }}
                    >
                      {inv.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        inv.status === "مكتملة"
                          ? "success"
                          : inv.status === "مسترجعة"
                            ? "warning"
                            : "danger"
                      }`}
                    >
                      <i />
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: "#AAA" }}>{inv.cashierName}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <Icon name="eye" size={13} />
                      <span>عرض وتفاصيل</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
                    لا توجد فواتير مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* INVOICE DETAILS MODAL */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-box wide">
            <div className="modal-head">
              <div>
                <h2>تفاصيل الفاتورة {selectedInvoice.id}</h2>
                <p>
                  بتاريخ {selectedInvoice.date} في تمام الساعة {selectedInvoice.time} • الوردية #{selectedInvoice.shiftId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Top Banner: Status & Customer Info */}
              <div
                style={{
                  background: "#181818",
                  border: "1px solid #2B2519",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#888" }}>بيانات العميل:</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF", marginTop: 2 }}>
                    {selectedInvoice.customerName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontFamily: "Inter", color: "#DDD" }}>
                      الهاتف: {getMaskedPhone(selectedInvoice.customerPhone, selectedInvoice.id)}
                    </span>

                    {/* Unmask Phone Button (Requires Admin Password) */}
                    {!revealedPhones[selectedInvoice.id] && (
                      <button
                        type="button"
                        onClick={handleRequestRevealPhone}
                        style={{
                          background: "#221C11",
                          border: "1px solid #D4AF37",
                          color: "#F5C242",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Icon name="lock" size={11} />
                        <span>كشف الرقم الكامل</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#888" }}>حالة الفاتورة وطريقة الدفع:</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                    <span
                      className={`badge ${
                        selectedInvoice.status === "مكتملة"
                          ? "success"
                          : selectedInvoice.status === "مسترجعة"
                            ? "warning"
                            : "danger"
                      }`}
                    >
                      <i />
                      {selectedInvoice.status}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#DDD" }}>
                      طريقة الدفع: {selectedInvoice.paymentMethod}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    الكاشير: <strong style={{ color: "#FFF" }}>{selectedInvoice.cashierName}</strong>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#AAA", marginBottom: 10 }}>
                  الخدمات المقدمة وتفاصيل الفاتورة:
                </div>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الخدمة</th>
                        <th>الحلاق المنفذ</th>
                        <th>الكمية</th>
                        <th>سعر الخدمة</th>
                        <th>الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{it.name}</td>
                          <td style={{ color: "#D4AF37" }}>{it.barber}</td>
                          <td style={{ fontFamily: "Inter" }}>{it.qty}</td>
                          <td style={{ fontFamily: "Inter" }}>{it.price} ج.م</td>
                          <td style={{ fontWeight: 800, fontFamily: "Inter", color: "#F5C242" }}>
                            {it.price * it.qty} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div
                style={{
                  background: "#161616",
                  border: "1px solid #28241B",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#AAA" }}>
                  <span>المجموع الفرعي:</span>
                  <span className="num">{selectedInvoice.subtotal} ج.م</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#56D364" }}>
                    <span>الخصم المطبق ({selectedInvoice.couponCode}):</span>
                    <span className="num">-{selectedInvoice.discount} ج.م</span>
                  </div>
                )}
                {selectedInvoice.tip > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#FF9F1C" }}>
                    <span>إكرامية الحلاق:</span>
                    <span className="num">+{selectedInvoice.tip} ج.م</span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#FFF",
                    borderTop: "1px dashed #333",
                    paddingTop: 8,
                  }}
                >
                  <span>المبلغ المسدد بالكامل:</span>
                  <span style={{ color: "#F5C242", fontSize: 24, fontFamily: "Inter" }}>
                    {selectedInvoice.total} ج.م
                  </span>
                </div>
              </div>

              {selectedInvoice.cancellationReason && (
                <div
                  style={{
                    marginTop: 14,
                    background: "rgba(229, 72, 77, 0.12)",
                    border: "1px solid #E5484D",
                    color: "#FF8E92",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <strong>سبب الإلغاء:</strong> {selectedInvoice.cancellationReason}
                </div>
              )}

              {selectedInvoice.refundReason && (
                <div
                  style={{
                    marginTop: 14,
                    background: "rgba(255, 159, 28, 0.12)",
                    border: "1px solid #FF9F1C",
                    color: "#FFAE42",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <strong>سبب الاسترجاع:</strong> {selectedInvoice.refundReason}
                </div>
              )}
            </div>

            <div className="modal-foot">
              <div style={{ marginRight: 0, marginLeft: "auto", display: "flex", gap: 10 }}>
                {userRole === "admin" && selectedInvoice.status === "مكتملة" && (
                  <>
                    <button
                      type="button"
                      className="danger-ghost"
                      onClick={() => setCancelModalOpen(true)}
                    >
                      <Icon name="x" size={14} />
                      <span>إلغاء الفاتورة</span>
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ color: "#FFAE42", borderColor: "#553810" }}
                      onClick={() => setRefundModalOpen(true)}
                    >
                      <Icon name="refresh" size={14} />
                      <span>استرجاع الفاتورة</span>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  showToast(`تم إرسال أمر إعادة طباعة الفاتورة (${selectedInvoice.id}) موسومة بعلامة «نسخة»`);
                }}
              >
                <Icon name="printer" size={15} />
                <span>إعادة طباعة (نسخة)</span>
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() => setSelectedInvoice(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD PROMPT MODAL FOR REVEALING PHONE */}
      {passwordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 440 }}>
            <div className="modal-head">
              <h2>التحقق الأمني: كشف رقم العميل</h2>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "#CCC", lineHeight: 1.5, marginBottom: 14 }}>
                حماية لخصوصية العملاء، يتطلب كشف رقم الهاتف الكامل إدخال كلمة مرور الأدمن. سيتم توثيق هذا الإجراء واسم القائم به في سجل العمليات والتدقيق تلقائياً.
              </p>
              <div className="form-group">
                <label className="form-label">كلمة مرور الأدمن:</label>
                <input
                  type="password"
                  className="form-input"
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="أدخل كلمة المرور (تجريبي: admin123)"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#FFAE42" }}>
                  سبب كشف رقم الهاتف (إلزامي للتوثيق):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={revealReasonInput}
                  onChange={(e) => {
                    setRevealReasonInput(e.target.value);
                    setPasswordError("");
                  }}
                  placeholder="مثال: التحقق من موعد أو شكوى متعلقة بالخدمة..."
                />
                {passwordError && (
                  <div style={{ fontSize: 12, color: "#FF8E92", marginTop: 4, fontWeight: 600 }}>
                    {passwordError}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPasswordModalOpen(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmAdminPassword}
              >
                تأكيد وكشف الرقم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL INVOICE MODAL */}
      {cancelModalOpen && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h2 style={{ color: "#FF8E92" }}>إلغاء الفاتورة {selectedInvoice.id}</h2>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "#CCC", marginBottom: 14 }}>
                سيتم إلغاء الفاتورة وعكس تأثيرها المالي على رصيد الصندوق، وتوثيق ذلك في سجل العمليات.
              </p>
              <div className="form-group">
                <label className="form-label" style={{ color: "#FF8E92" }}>
                  سبب الإلغاء (إلزامي):
                </label>
                <textarea
                  className="form-textarea"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="اكتب سبب إلغاء الفاتورة..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCancelModalOpen(false)}
              >
                تراجع
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={handleConfirmCancel}
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND INVOICE MODAL */}
      {refundModalOpen && selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h2 style={{ color: "#FFAE42" }}>استرجاع الفاتورة {selectedInvoice.id}</h2>
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "#CCC", marginBottom: 14 }}>
                سيتم استرجاع المبلغ ({selectedInvoice.total} ج.م) للعميل وخصمه من مبيعات الوردية وتوثيق العملية في سجل العمليات.
              </p>
              <div className="form-group">
                <label className="form-label" style={{ color: "#FFAE42" }}>
                  سبب الاسترجاع (إلزامي):
                </label>
                <textarea
                  className="form-textarea"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="اكتب سبب استرجاع المبلغ للعميل..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setRefundModalOpen(false)}
              >
                تراجع
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirmRefund}
              >
                تأكيد الاسترجاع والصرف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="toast-bar">
          <Icon name="check" size={18} style={{ color: "#3FB950" } as React.CSSProperties} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

