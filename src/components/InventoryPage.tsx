import { useState, useMemo } from "react";
import { InventoryProduct, Barber } from "../types";
import { Icon } from "./Icons";

export function InventoryPage({
  products,
  barbers,
  onAddProduct,
  onRecordPurchase,
  onRecordConsumption,
}: {
  products: InventoryProduct[];
  barbers: Barber[];
  onAddProduct: (product: InventoryProduct) => void;
  onRecordPurchase: (supplier: string, invoiceNum: string, itemsDesc: string, totalCost: number) => void;
  onRecordConsumption: (barberId: string, productId: string, qty: number, reason: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [searchQuery, setSearchQuery] = useState("");

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [consumptionModalOpen, setConsumptionModalOpen] = useState(false);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);

  // New Purchase Form
  const [purchaseSupplier, setPurchaseSupplier] = useState("شركة النزيه لمستحضرات التجميل");
  const [purchaseInvoiceNum, setPurchaseInvoiceNum] = useState("");
  const [purchaseItemsDesc, setPurchaseItemsDesc] = useState("");
  const [purchaseTotalCost, setPurchaseTotalCost] = useState<number>(1200);

  // Consumption Form
  const [consumeBarberId, setConsumeBarberId] = useState(barbers[0]?.id || "");
  const [consumeProductId, setConsumeProductId] = useState(products[0]?.id || "");
  const [consumeQty, setConsumeQty] = useState<number>(2);
  const [consumeReason, setConsumeReason] = useState("صرف دوري لمستهلكات كراسي الحلاقة");

  // New Product Form
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("مستحضرات الشعر");
  const [newStock, setNewStock] = useState<number>(20);
  const [newMinThreshold, setNewMinThreshold] = useState<number>(5);
  const [newUnitCost, setNewUnitCost] = useState<number>(50);
  const [newSupplier, setNewSupplier] = useState("شركة النزيه لمستحضرات التجميل");

  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const categories = [
    "الكل",
    "مستحضرات الشعر",
    "العناية بالذقن",
    "مستحضرات البشرة",
    "مستهلكات وشفرات",
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "الكل" || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.supplier.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Inventory valuation
  const totalValue = useMemo(() => {
    return products.reduce((acc, p) => {
      const cost = Number(p.unitCost ?? p.purchasePrice ?? 0);
      const qty = Number(p.stock ?? 0);
      const val = isNaN(cost) || isNaN(qty) ? 0 : cost * qty;
      return acc + val;
    }, 0);
  }, [products]);

  const lowStockCount = products.filter((p) => {
    const min = Number(p.minThreshold ?? p.minAlertStock ?? 5);
    return Number(p.stock ?? 0) <= min;
  }).length;

  // Handle Save Purchase
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseSupplier.trim() || !purchaseItemsDesc.trim()) {
      alert("الرجاء استكمال بيانات فاتورة المشتريات");
      return;
    }
    onRecordPurchase(
      purchaseSupplier,
      purchaseInvoiceNum || `PUR-${Math.floor(1000 + Math.random() * 9000)}`,
      purchaseItemsDesc,
      Number(purchaseTotalCost),
    );
    setPurchaseModalOpen(false);
    showToast(`تم تسجيل فاتورة المشتريات وتحديث المخزون بنجاح`);
  };

  // Handle Save Consumption
  const handleSaveConsumption = (e: React.FormEvent) => {
    e.preventDefault();
    onRecordConsumption(consumeBarberId, consumeProductId, Number(consumeQty), consumeReason);
    setConsumptionModalOpen(false);
    showToast(`تم تسجيل صرف المستلزمات وخصمها من المخزون`);
  };

  // Handle Save New Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert("الرجاء إدخال اسم المنتج");
      return;
    }
    const product: InventoryProduct = {
      id: `p-${Date.now()}`,
      sku: newSku.trim() || `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: newName.trim(),
      category: newCategory,
      stock: Number(newStock),
      minThreshold: Number(newMinThreshold),
      unitCost: Number(newUnitCost),
      supplier: newSupplier.trim(),
      lastPurchaseDate: new Date().toISOString().split("T")[0],
      status: Number(newStock) <= Number(newMinThreshold) ? "مخزون منخفض" : "متوفر",
    };
    onAddProduct(product);
    setAddProductModalOpen(false);
    showToast(`تمت إضافة منتج «${product.name}» إلى المخزون`);
  };

  return (
    <div>
      {/* Top Header KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">إجمالي أصناف المخزون</div>
            <div className="kpi-value gold">{products.length} <small style={{ fontSize: 14 }}>صنف</small></div>
            <div className="kpi-hint positive">
              <Icon name="check" size={13} />
              <span>متابعة آلية للرصيد الفعلي</span>
            </div>
          </div>
          <div className="kpi-icon-wrap">
            <Icon name="box" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">القيمة الإجمالية للمخزون</div>
            <div className="kpi-value">{totalValue.toLocaleString()} <small style={{ fontSize: 14 }}>ج.م</small></div>
            <div className="kpi-hint">
              <span>بسعر التكلفة الإجمالي</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#F5C242", borderColor: "#554215" }}>
            <Icon name="wallet" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">تنبيهات انخفاض المخزون</div>
            <div className="kpi-value" style={{ color: lowStockCount > 0 ? "#FF8E92" : "#56D364" }}>
              {lowStockCount} <small style={{ fontSize: 14 }}>أصناف حرجة</small>
            </div>
            <div className="kpi-hint" style={{ color: lowStockCount > 0 ? "#FF8E92" : "#888" }}>
              <span>أقل من حد إعادة الطلب الأدنى</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#E5484D", borderColor: "#5A1E20" }}>
            <Icon name="alert" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">مشتريات الشهر الحالي</div>
            <div className="kpi-value">8,400 <small style={{ fontSize: 14 }}>ج.م</small></div>
            <div className="kpi-hint">
              <span>شامل فواتير الموردين</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#3FB950", borderColor: "#1A4522" }}>
            <Icon name="receipt" size={20} />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>إدارة المستودع والمشتريات والمستهلكات</h2>
            <p>متابعة رصيد الشامبوهات والزيوت وشفرات الحلاقة وفواتير التوريد وصرف الحلاقين</p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setConsumptionModalOpen(true)}
            >
              <Icon name="logout" size={15} />
              <span>تسجيل صرف مستلزمات</span>
            </button>

            <button
              type="button"
              className="secondary-btn"
              style={{ color: "#F5C242", borderColor: "#4E3E1A" }}
              onClick={() => setPurchaseModalOpen(true)}
            >
              <Icon name="download" size={15} />
              <span>+ فاتورة مشتريات جديدة</span>
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={() => setAddProductModalOpen(true)}
            >
              <Icon name="plus" size={16} />
              <span>+ إضافة منتج جديد</span>
            </button>
          </div>
        </div>

        {/* Low Stock Banner Alert */}
        {lowStockCount > 0 && (
          <div
            style={{
              background: "rgba(229, 72, 77, 0.12)",
              border: "1px solid rgba(229, 72, 77, 0.35)",
              borderRadius: 12,
              padding: "12px 18px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="alert" size={20} style={{ color: "#FF8E92" } as React.CSSProperties} />
              <div>
                <strong style={{ color: "#FF8E92" }}>تنبيه أمني للمخزون:</strong> هناك {lowStockCount} أصناف وصلت أو شارفت على النفاد (أقل من الحد الأدنى)، يرجى إصدار أمر شراء للموردين لتفادي توقف كراسي الحلاقة.
              </div>
            </div>
            <button
              type="button"
              className="danger-btn"
              style={{ height: 34, fontSize: 12, padding: "0 12px" }}
              onClick={() => setPurchaseModalOpen(true)}
            >
              طلب توريد سريع
            </button>
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            background: "#181818",
            border: "1px solid #2B2519",
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`cat-btn ${selectedCategory === cat ? "active" : ""}`}
                style={{ height: 38 }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="search-bar-wrap" style={{ maxWidth: 320 }}>
            <span className="search-icon">
              <Icon name="search" size={16} />
            </span>
            <input
              type="text"
              className="search-input"
              style={{ height: 38 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم المنتج أو الكود أو المورد..."
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>كود الصنف (SKU)</th>
                <th>اسم المنتج</th>
                <th>التصنيف</th>
                <th>الرصيد الحالي</th>
                <th>الحد الأدنى</th>
                <th>سعر التكلفة</th>
                <th>المورد الرئيسي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const minThresh = Number(p.minThreshold ?? p.minAlertStock ?? 5);
                const costVal = Number(p.unitCost ?? p.purchasePrice ?? 0);
                const isCritical = p.stock <= minThresh / 2;
                const isLow = p.stock <= minThresh;

                return (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "Inter", fontWeight: 700, color: "#AAA" }}>
                      {p.sku}
                    </td>
                    <td style={{ fontWeight: 800, color: "#FFF" }}>{p.name}</td>
                    <td>
                      <span style={{ padding: "3px 8px", borderRadius: 6, background: "#1E1E1E", fontSize: 12 }}>
                        {p.category}
                      </span>
                    </td>
                    <td>
                      <strong
                        style={{
                          fontSize: 16,
                          fontFamily: "Inter",
                          color: isCritical ? "#FF8E92" : isLow ? "#FFAE42" : "#56D364",
                        }}
                      >
                        {p.stock}
                      </strong>
                    </td>
                    <td style={{ fontFamily: "Inter", color: "#888" }}>{minThresh}</td>
                    <td style={{ fontFamily: "Inter", fontWeight: 700, color: "#F5C242" }}>
                      {costVal.toLocaleString("ar-EG")} ج.م
                    </td>
                    <td style={{ fontSize: 13, color: "#AAA" }}>{p.supplier}</td>
                    <td>
                      <span
                        className={`badge ${
                          isCritical ? "danger" : isLow ? "warning" : "success"
                        }`}
                      >
                        <i />
                        {isCritical ? "حرج / قارب النفاد" : isLow ? "مخزون منخفض" : "متوفر"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL 1: Add Purchase Invoice */}
      {purchaseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <h2>تسجيل فاتورة مشتريات وتوريد</h2>
              <button
                type="button"
                onClick={() => setPurchaseModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <form onSubmit={handleSavePurchase}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">المورّد:</label>
                  <select
                    className="form-select"
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                  >
                    <option value="شركة النزيه لمستحضرات التجميل">شركة النزيه لمستحضرات التجميل</option>
                    <option value="مؤسسة خيارات الحلاق">مؤسسة خيارات الحلاق</option>
                    <option value="شركة التجهيزات العصرية">شركة التجهيزات العصرية</option>
                    <option value="مصنع الوفاء للمنسوجات الطبية">مصنع الوفاء للمنسوجات الطبية</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">رقم فاتورة المورد:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={purchaseInvoiceNum}
                      onChange={(e) => setPurchaseInvoiceNum(e.target.value)}
                      placeholder="مثال: INV-NZ-8821"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">إجمالي تكلفة الشراء:</label>
                    <input
                      type="number"
                      className="form-input"
                      value={purchaseTotalCost}
                      onChange={(e) => setPurchaseTotalCost(Number(e.target.value))}
                      placeholder="ج.م"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الأصناف والكميات الموردة:</label>
                  <textarea
                    className="form-textarea"
                    value={purchaseItemsDesc}
                    onChange={(e) => setPurchaseItemsDesc(e.target.value)}
                    placeholder="مثال: 20 عبوة شامبو كيراتين + 15 علبة شفرات ديربي يابانية..."
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setPurchaseModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                >
                  <Icon name="check" size={17} />
                  <span>تأكيد تسجيل المشتريات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Material Consumption */}
      {consumptionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-head">
              <h2>صرف مستلزمات تشغيلية للحلاقين</h2>
              <button
                type="button"
                onClick={() => setConsumptionModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveConsumption}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">الحلاق المستلم للمستلزمات:</label>
                  <select
                    className="form-select"
                    value={consumeBarberId}
                    onChange={(e) => setConsumeBarberId(e.target.value)}
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">الصنف المصروف:</label>
                    <select
                      className="form-select"
                      value={consumeProductId}
                      onChange={(e) => setConsumeProductId(e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (متوفر {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">الكمية المصروفة:</label>
                    <input
                      type="number"
                      className="form-input"
                      value={consumeQty}
                      min={1}
                      onChange={(e) => setConsumeQty(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">السبب / الملاحظة:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={consumeReason}
                    onChange={(e) => setConsumeReason(e.target.value)}
                    placeholder="مثال: صرف دوري لمستهلكات كراسي الحلاقة"
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setConsumptionModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                >
                  <Icon name="check" size={17} />
                  <span>تأكيد الصرف وخصم المخزون</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Product Modal */}
      {addProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <h2>إضافة صنف جديد إلى المخزون</h2>
              <button
                type="button"
                onClick={() => setAddProductModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">كود الصنف (SKU):</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      placeholder="مثلاً: PRD-WAX-07"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">التصنيف:</label>
                    <select
                      className="form-select"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    >
                      {categories.filter((c) => c !== "الكل").map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">اسم المنتج الكامل:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: كريم حلاقة مرطب بالنعناع واللافندر"
                    autoFocus
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">الكمية الافتتاحية:</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newStock}
                      onChange={(e) => setNewStock(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">حد الطلب الأدنى:</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newMinThreshold}
                      onChange={(e) => setNewMinThreshold(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">سعر التكلفة:</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newUnitCost}
                      onChange={(e) => setNewUnitCost(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">المورد الرئيسي:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder="اسم شركة التوريد"
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setAddProductModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                >
                  <Icon name="check" size={17} />
                  <span>حفظ الصنف الجديد</span>
                </button>
              </div>
            </form>
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

