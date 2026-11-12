import { useState, useMemo } from "react";
import { ServiceItem, ServiceCategory } from "../types";
import { Icon } from "./Icons";

export function ServicesPage({
  services,
  onSaveService,
  onToggleServiceStatus,
  onArchiveService,
}: {
  services: ServiceItem[];
  onSaveService: (service: ServiceItem) => void;
  onToggleServiceStatus: (serviceId: number) => void;
  onArchiveService: (serviceId: number) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<ServiceCategory>("قص الشعر");
  const [formPrice, setFormPrice] = useState<number>(80);
  const [formDuration, setFormDuration] = useState<number>(30);
  const [formCommission, setFormCommission] = useState<number>(35);
  const [formDescription, setFormDescription] = useState("");
  const [formIsPackage, setFormIsPackage] = useState(false);

  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const categories: ServiceCategory[] = [
    "الكل",
    "قص الشعر",
    "الذقن",
    "التسريحات",
    "العناية بالبشرة",
    "الباقات",
    "خدمات أخرى",
  ];

  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchCat = selectedCategory === "الكل" || srv.category === selectedCategory;
      const matchSearch =
        srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (srv.description && srv.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  // Open Add Modal
  const handleOpenAddModal = (isPkg = false) => {
    setEditingService(null);
    setFormName("");
    setFormCategory(isPkg ? "الباقات" : "قص الشعر");
    setFormPrice(isPkg ? 250 : 80);
    setFormDuration(isPkg ? 60 : 30);
    setFormCommission(isPkg ? 40 : 35);
    setFormDescription("");
    setFormIsPackage(isPkg);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (srv: ServiceItem) => {
    setEditingService(srv);
    setFormName(srv.name);
    setFormCategory(srv.category);
    setFormPrice(srv.price);
    setFormDuration(srv.duration);
    setFormCommission(srv.commissionRate || 35);
    setFormDescription(srv.description || "");
    setFormIsPackage(!!srv.isPackage);
    setModalOpen(true);
  };

  // Submit Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("الرجاء إدخال اسم الخدمة");
      return;
    }

    const newService: ServiceItem = {
      id: editingService ? editingService.id : Math.max(0, ...services.map((s) => s.id)) + 1,
      name: formName.trim(),
      category: formCategory,
      price: Number(formPrice),
      duration: Number(formDuration),
      iconText: formName.slice(0, 2),
      status: editingService ? editingService.status : "متاح",
      commissionRate: Number(formCommission),
      description: formDescription.trim(),
      isPackage: formIsPackage,
    };

    onSaveService(newService);
    setModalOpen(false);
    showToast(`تم حفظ الخدمة «${newService.name}» بنجاح`);
  };

  return (
    <div>
      {/* Top Header */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>دليل الخدمات والباقات والأسعار</h2>
            <p>إدارة قوائم الحلاقة، الباقات الملكية، مدد التنفيذ، والأسعار المعتمدة</p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => handleOpenAddModal(true)}
            >
              <Icon name="tag" size={16} />
              <span>+ إضافة باقة متكاملة</span>
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={() => handleOpenAddModal(false)}
            >
              <Icon name="plus" size={17} />
              <span>+ إضافة خدمة جديدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div className="category-tabs" style={{ marginBottom: 0 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-btn ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="search-bar-wrap" style={{ maxWidth: 300 }}>
            <span className="search-icon">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="search-input"
              style={{ height: 40 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الخدمات..."
            />
          </div>
        </div>

        {/* View Switcher */}
        <div
          style={{
            background: "var(--surface-soft)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 3,
            display: "flex",
            gap: 3,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: viewMode === "cards" ? "var(--gold)" : "transparent",
              color: viewMode === "cards" ? "#111" : "var(--text-secondary)",
              border: 0,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            بطاقات
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: viewMode === "table" ? "var(--gold)" : "transparent",
              color: viewMode === "table" ? "#111" : "var(--text-secondary)",
              border: 0,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            جدول بيانات
          </button>
        </div>
      </div>

      {/* Content: Cards View */}
      {viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: srv.isPackage ? "var(--warning-text)" : "var(--muted)",
                      background: srv.isPackage ? "rgba(255, 159, 28, 0.15)" : "var(--surface-soft)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    {srv.category} {srv.isPackage && "• باقة خاصة"}
                  </span>

                  <button
                    type="button"
                    onClick={() => onToggleServiceStatus(srv.id)}
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title={srv.status === "متاح" ? "إيقاف الخدمة مؤقتاً" : "تفعيل الخدمة"}
                  >
                    <span className={`badge ${srv.status === "متاح" ? "success" : "neutral"}`}>
                      <i />
                      {srv.status}
                    </span>
                  </button>
                </div>

                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
                  {srv.name}
                </div>

                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12, minHeight: 38, lineHeight: 1.4 }}>
                  {srv.description || "خدمة راقية مقدمة بأفضل معايير العناية"}
                </div>

                {srv.includedServices && srv.includedServices.length > 0 && (
                  <div
                    style={{
                      background: "var(--surface-deep)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      marginBottom: 12,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>تشمل الباقة: </span>
                    {srv.includedServices.join(" + ")}
                  </div>
                )}
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    borderTop: "1px solid var(--border-subtle)",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>المدة التقديرية</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "Inter" }}>
                      {srv.duration} دقيقة
                    </div>
                  </div>

                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>السعر النهائي</span>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "var(--light-gold)", fontFamily: "Inter" }}>
                      {srv.price} <small style={{ fontSize: 12, fontFamily: "Cairo" }}>ج.م</small>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ flex: 1, height: 36, fontSize: 12 }}
                    onClick={() => handleOpenEditModal(srv)}
                  >
                    <Icon name="edit" size={14} />
                    <span>تعديل</span>
                  </button>

                  <button
                    type="button"
                    className="danger-ghost"
                    style={{ height: 36, padding: "0 10px" }}
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف خدمة «${srv.name}» نهائياً من قائمة الحلاقة؟`)) {
                        onArchiveService(srv.id);
                        showToast(`تم حذف خدمة «${srv.name}» بنجاح وتحديث النظام`);
                      }
                    }}
                    title="حذف الخدمة"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Content: Data Table View */
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>اسم الخدمة</th>
                <th>التصنيف</th>
                <th>السعر</th>
                <th>المدة</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((srv) => (
                <tr key={srv.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: "var(--text)" }}>{srv.name}</div>
                    {srv.description && (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{srv.description}</div>
                    )}
                  </td>
                  <td>
                    <span style={{ padding: "3px 8px", borderRadius: 6, background: "var(--card-hover)", fontSize: 12 }}>
                      {srv.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800, fontSize: 17, color: "var(--light-gold)", fontFamily: "Inter" }}>
                    {srv.price} ج.م
                  </td>
                  <td style={{ fontFamily: "Inter" }}>{srv.duration} دقيقة</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onToggleServiceStatus(srv.id)}
                      style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}
                    >
                      <span className={`badge ${srv.status === "متاح" ? "success" : "neutral"}`}>
                        <i />
                        {srv.status}
                      </span>
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                        onClick={() => handleOpenEditModal(srv)}
                      >
                        <Icon name="edit" size={13} />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        className="danger-ghost"
                        style={{ height: 32, padding: "0 8px" }}
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف خدمة «${srv.name}» نهائياً من قائمة الحلاقة؟`)) {
                            onArchiveService(srv.id);
                            showToast(`تم حذف خدمة «${srv.name}» بنجاح وتحديث النظام`);
                          }
                        }}
                        title="حذف الخدمة"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-head">
              <h2>{editingService ? "تعديل بيانات الخدمة" : formIsPackage ? "إضافة باقة متكاملة جديدة" : "إضافة خدمة جديدة"}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "var(--muted)", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم الخدمة أو الباقة:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثلاً: تدريج ملكي VIP"
                    autoFocus
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">التصنيف:</label>
                    <select
                      className="form-select"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as ServiceCategory)}
                    >
                      {categories
                        .filter((c) => c !== "الكل")
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">السعر (شامل الضريبة):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      placeholder="ج.م"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">المدة التقديرية (بالدقائق):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      placeholder="30"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الوصف والمكونات:</label>
                  <textarea
                    className="form-textarea"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="أدخل وصفاً تفصيلياً للخدمة أو الخدمات المشمولة في الباقة..."
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                >
                  <Icon name="check" size={17} />
                  <span>حفظ الخدمة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="toast-bar">
          <Icon name="check" size={18} style={{ color: "var(--success-text)" } as React.CSSProperties} />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

