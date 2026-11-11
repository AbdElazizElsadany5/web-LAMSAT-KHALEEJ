import { useState } from "react";
import { Icon } from "./Icons";
import { Barber } from "../types";
import { sfx } from "../utils/audio";

interface QueueItem {
  ticketNumber: number;
  customerName: string;
  phone?: string;
  serviceRequested: string;
  preferredBarberId?: string;
  assignedChair?: number;
  status: "waiting" | "in_service" | "completed";
  timeIn: string;
  estimatedWaitMinutes: number;
}

const initialQueue: QueueItem[] = [
  {
    ticketNumber: 23,
    customerName: "محمد الشناوي",
    phone: "050****891",
    serviceRequested: "باقة لمسة خليجي VIP الملكية",
    preferredBarberId: "b1",
    assignedChair: 1,
    status: "in_service",
    timeIn: "18:45",
    estimatedWaitMinutes: 0,
  },
  {
    ticketNumber: 24,
    customerName: "هيثم سمير",
    phone: "055****412",
    serviceRequested: "قص شعر ملكي + ذقن VIP",
    preferredBarberId: "b2",
    assignedChair: 2,
    status: "in_service",
    timeIn: "19:00",
    estimatedWaitMinutes: 0,
  },
  {
    ticketNumber: 25,
    customerName: "عمر فاروق",
    phone: "054****339",
    serviceRequested: "حلاقة ذقن خليجية + بخار وجه",
    preferredBarberId: "b3",
    status: "waiting",
    timeIn: "19:10",
    estimatedWaitMinutes: 5,
  },
  {
    ticketNumber: 26,
    customerName: "زياد إبراهيم",
    phone: "059****677",
    serviceRequested: "قص واستشوار ملكي",
    preferredBarberId: undefined,
    status: "waiting",
    timeIn: "19:15",
    estimatedWaitMinutes: 15,
  },
  {
    ticketNumber: 27,
    customerName: "كريم مجدي",
    phone: "056****128",
    serviceRequested: "تنظيف بشرة ملكي بالذهب",
    preferredBarberId: "b3",
    status: "waiting",
    timeIn: "19:20",
    estimatedWaitMinutes: 25,
  },
];

export function QueueScreenModal({
  barbers,
  onClose,
}: {
  barbers: Barber[];
  onClose: () => void;
}) {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueue);
  const [calledTicket, setCalledTicket] = useState<{ ticket: number; chair: number; barber: string } | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerService, setNewCustomerService] = useState("قص شعر ملكي");
  const [newCustomerBarber, setNewCustomerBarber] = useState("");
  const [isAddingWaitlist, setIsAddingWaitlist] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen for TV lobby display
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Call Next Ticket for Chair
  const handleCallNext = (chairNumber: number, barber: Barber) => {
    // Find next waiting customer
    const nextWaitingIdx = queue.findIndex(
      (q) => q.status === "waiting" && (!q.preferredBarberId || q.preferredBarberId === barber.id)
    );

    if (nextWaitingIdx === -1) {
      // Find any next waiting
      const anyWaitingIdx = queue.findIndex((q) => q.status === "waiting");
      if (anyWaitingIdx === -1) {
        alert("لا يوجد عملاء حالياً في قائمة الانتظار لهذا الكرسي!");
        return;
      }
      processCall(anyWaitingIdx, chairNumber, barber);
    } else {
      processCall(nextWaitingIdx, chairNumber, barber);
    }
  };

  const processCall = (index: number, chairNumber: number, barber: Barber) => {
    const item = queue[index];
    const updated = [...queue];

    // Mark previous in_service for this chair as completed
    updated.forEach((q) => {
      if (q.assignedChair === chairNumber && q.status === "in_service") {
        q.status = "completed";
      }
    });

    // Assign new item
    item.status = "in_service";
    item.assignedChair = chairNumber;
    setQueue(updated);

    // Trigger visual and audio chime
    sfx.playAlert();
    setCalledTicket({
      ticket: item.ticketNumber,
      chair: chairNumber,
      barber: barber.name,
    });

    // Auto clear announcement overlay after 6s
    setTimeout(() => {
      setCalledTicket(null);
    }, 6000);
  };

  // Add new customer to queue
  const handleAddWalkIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      alert("يرجى إدخال اسم العميل");
      return;
    }

    const nextTicket = Math.max(...queue.map((q) => q.ticketNumber), 20) + 1;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const waitingCount = queue.filter((q) => q.status === "waiting").length;

    const newItem: QueueItem = {
      ticketNumber: nextTicket,
      customerName: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || undefined,
      serviceRequested: newCustomerService,
      preferredBarberId: newCustomerBarber || undefined,
      status: "waiting",
      timeIn: timeStr,
      estimatedWaitMinutes: (waitingCount + 1) * 15,
    };

    setQueue((prev) => [...prev, newItem]);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setIsAddingWaitlist(false);
    sfx.playClick();
  };

  const waitingList = queue.filter((q) => q.status === "waiting");
  const inServiceList = queue.filter((q) => q.status === "in_service");

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-box"
        style={{
          width: "95vw",
          maxWidth: "1400px",
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          background: "#0E0E0E",
          overflow: "hidden",
        }}
      >
        {/* Call Announcement Flash Banner */}
        {calledTicket && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(11, 11, 11, 0.94)",
              zIndex: 1300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              animation: "fadeIn 0.25s ease-out",
            }}
            onClick={() => setCalledTicket(null)}
          >
            <div
              style={{
                background: "linear-gradient(145deg, #1A1712, #241D12)",
                border: "2px solid #D4AF37",
                borderRadius: 24,
                padding: "48px 64px",
                textAlign: "center",
                boxShadow: "0 20px 60px rgba(212, 175, 55, 0.25)",
                maxWidth: 680,
                width: "90%",
              }}
            >
              <div style={{ color: "#F5C242", fontSize: 18, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>
                🔔 نداء العميل القادم • صالون لمسة خليجي
              </div>
              <div style={{ fontSize: 16, color: "#AAA", marginBottom: 16 }}>تذكرة رقم</div>
              <div
                style={{
                  fontSize: 84,
                  fontWeight: 900,
                  color: "#D4AF37",
                  fontFamily: "Inter",
                  lineHeight: 1,
                  textShadow: "0 0 30px rgba(212,175,55,0.4)",
                  marginBottom: 20,
                }}
              >
                #{calledTicket.ticket}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", marginBottom: 10 }}>
                تفضل إلى كرسي رقم ({calledTicket.chair})
              </div>
              <div style={{ fontSize: 18, color: "#B8B8B8", marginBottom: 28 }}>
                مع الحلاق: <strong style={{ color: "#F5C242" }}>{calledTicket.barber}</strong>
              </div>
              <button
                className="primary-btn"
                onClick={() => setCalledTicket(null)}
                style={{ height: 46, padding: "0 32px", margin: "0 auto", fontSize: 15 }}
              >
                <span>تأكيد الحضور ومتابعة الخدمة</span>
                <Icon name="check" size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Topbar */}
        <div
          style={{
            height: 60,
            background: "#141414",
            borderBottom: "1px solid #2A2418",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(212,175,55,0.15)",
                border: "1px solid #D4AF37",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#D4AF37",
              }}
            >
              <Icon name="scissors" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#FFFFFF" }}>
                لمسة خليجي — شاشة نداء الدور وصالة الانتظار
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>
                نظام إدارة الطوابير والشاشات الذكية لشاشات التلفزيون وصالة الاستقبال
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setIsAddingWaitlist(true)}
              className="primary-btn"
              style={{ height: 36, padding: "0 14px", fontSize: 13 }}
            >
              <Icon name="plus" size={15} />
              <span>تسجيل عميل في الانتظار</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="secondary-btn"
              style={{ height: 36, padding: "0 12px", fontSize: 13 }}
              title="عرض ملء الشاشة لشاشات العرض التلفزيونية"
            >
              <Icon name={isFullscreen ? "minimize" : "maximize" as any} size={15} />
              <span>{isFullscreen ? "نافذة عادية" : "ملء الشاشة للـ TV"}</span>
            </button>

            <button
              onClick={onClose}
              className="action-btn"
              style={{ width: 36, height: 36, borderRadius: 8 }}
              title="إغلاق الشاشة"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 420px",
            gap: 16,
            padding: 20,
            overflow: "hidden",
            background: "#0B0B0B",
          }}
        >
          {/* Right Column: Barber Chairs & Active Services */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              overflowY: "auto",
              paddingLeft: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="crown" size={18} style={{ color: "#D4AF37" } as React.CSSProperties} />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                  كراسي الحلاقة والخدمة الحالية ({barbers.length} كراسي)
                </h3>
              </div>
              <span style={{ fontSize: 12, color: "#888" }}>
                العملاء قيد الخدمة: <strong style={{ color: "#3FB950" }}>{inServiceList.length}</strong>
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {barbers.map((b, idx) => {
                const chairNum = idx + 1;
                const activeCust = inServiceList.find((q) => q.assignedChair === chairNum);

                return (
                  <div
                    key={b.id}
                    style={{
                      background: "#141414",
                      borderRadius: 14,
                      border: activeCust ? "1px solid #D4AF37" : "1px solid #2A2418",
                      padding: 18,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Chair Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: activeCust ? "linear-gradient(135deg, #D4AF37, #F5C242)" : "#222",
                            color: activeCust ? "#0B0B0B" : "#888",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: 15,
                            fontFamily: "Inter",
                          }}
                        >
                          {chairNum}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#FFF" }}>
                            كرسي #{chairNum} — {b.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#888" }}>{b.title}</div>
                        </div>
                      </div>

                      <span
                        className="status-pill"
                        style={{
                          background: activeCust ? "rgba(255, 159, 28, 0.15)" : "rgba(63, 185, 80, 0.15)",
                          color: activeCust ? "#FF9F1C" : "#3FB950",
                          border: `1px solid ${activeCust ? "#FF9F1C40" : "#3FB95040"}`,
                          fontSize: 11,
                          padding: "2px 8px",
                        }}
                      >
                        {activeCust ? "مشغول بالخدمة" : "شاغر ومتاح"}
                      </span>
                    </div>

                    {/* Active Customer or Empty State */}
                    {activeCust ? (
                      <div
                        style={{
                          background: "#1A1712",
                          border: "1px dashed #D4AF37",
                          borderRadius: 10,
                          padding: 12,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: "#B8B8B8" }}>العميل الحالي:</span>
                          <span
                            style={{
                              fontSize: 18,
                              fontWeight: 900,
                              color: "#F5C242",
                              fontFamily: "Inter",
                            }}
                          >
                            تذكرة #{activeCust.ticketNumber}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", marginBottom: 4 }}>
                          {activeCust.customerName}
                        </div>
                        <div style={{ fontSize: 12, color: "#D4AF37", display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="scissors" size={13} />
                          <span>{activeCust.serviceRequested}</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: "#181818",
                          borderRadius: 10,
                          padding: "24px 12px",
                          textAlign: "center",
                          marginBottom: 12,
                          color: "#666",
                          fontSize: 13,
                        }}
                      >
                        الكرسي متاح الآن لاستقبال العميل التالي من قائمة الانتظار
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => handleCallNext(chairNum, b)}
                      className="primary-btn"
                      style={{
                        height: 38,
                        width: "100%",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <Icon name="bell" size={15} />
                      <span>نداء العميل القادم لهذا الكرسي</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Column: Waiting Queue */}
          <div
            style={{
              background: "#141414",
              borderRadius: 14,
              border: "1px solid #2A2418",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="clock" size={18} style={{ color: "#FF9F1C" } as React.CSSProperties} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                  قائمة الانتظار في الصالة ({waitingList.length})
                </h3>
              </div>
              <span style={{ fontSize: 11, color: "#888" }}>تقدير الانتظار: ~15 د/عميل</span>
            </div>

            {/* Waiting List Cards */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                paddingRight: 4,
              }}
            >
              {waitingList.length === 0 ? (
                <div style={{ textAlign: "center", color: "#666", padding: "40px 10px" }}>
                  <Icon name="check" size={32} style={{ color: "#3FB950", margin: "0 auto 10px", display: "block" }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#AAA" }}>لا يوجد عملاء في الانتظار</div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>جميع الكراسي جاهزة لاستقبال الزوار الجدد</div>
                </div>
              ) : (
                waitingList.map((item, qIdx) => (
                  <div
                    key={item.ticketNumber}
                    style={{
                      background: "#1C1C1C",
                      border: "1px solid #2A2418",
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "border 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          background: "rgba(212,175,55,0.12)",
                          border: "1px solid #D4AF37",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#F5C242",
                          fontFamily: "Inter",
                          fontWeight: 900,
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        #{item.ticketNumber}
                      </div>

                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF" }}>
                          {item.customerName}
                        </div>
                        <div style={{ fontSize: 11, color: "#D4AF37", marginTop: 2 }}>
                          {item.serviceRequested}
                        </div>
                        <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>
                          تسجيل: {item.timeIn} {item.preferredBarberId && `• يفضل حلاق محدد`}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "left" }}>
                      <span
                        style={{
                          background: "rgba(255,159,28,0.12)",
                          color: "#FF9F1C",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          display: "inline-block",
                        }}
                      >
                        الدور #{qIdx + 1}
                      </span>
                      <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
                        ~{item.estimatedWaitMinutes} دقيقة
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Walk-in Registration Form */}
            {isAddingWaitlist ? (
              <form
                onSubmit={handleAddWalkIn}
                style={{
                  marginTop: 12,
                  padding: 14,
                  background: "#181818",
                  borderRadius: 10,
                  border: "1px solid #D4AF37",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: "#F5C242", marginBottom: 10 }}>
                  تسجيل عميل جديد في قائمة الانتظار
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="اسم العميل *"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    autoFocus
                    required
                  />
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="رقم الجوال (اختياري)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <select
                    className="form-input"
                    value={newCustomerService}
                    onChange={(e) => setNewCustomerService(e.target.value)}
                  >
                    <option value="قص شعر ملكي">قص شعر ملكي (65 ج.م)</option>
                    <option value="حلاقة ذقن خليجية VIP">حلاقة ذقن خليجية VIP (45 ج.م)</option>
                    <option value="باقة لمسة خليجي VIP">باقة لمسة خليجي VIP (170 ج.م)</option>
                    <option value="تنظيف بشرة ملكي بالذهب">تنظيف بشرة بالذهب (140 ج.م)</option>
                  </select>

                  <select
                    className="form-input"
                    value={newCustomerBarber}
                    onChange={(e) => setNewCustomerBarber(e.target.value)}
                  >
                    <option value="">أي حلاق متاح أولاً</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="primary-btn" style={{ flex: 1, height: 34, fontSize: 12 }}>
                    <span>إصدار تذكرة انتظار</span>
                    <Icon name="check" size={14} />
                  </button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setIsAddingWaitlist(false)}
                    style={{ height: 34, fontSize: 12 }}
                  >
                    <span>إلغاء</span>
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingWaitlist(true)}
                className="secondary-btn"
                style={{
                  marginTop: 12,
                  height: 38,
                  width: "100%",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "1px dashed #D4AF37",
                  color: "#D4AF37",
                }}
              >
                <Icon name="plus" size={15} />
                <span>+ إضافة عميل زائر بدون موعد مسبق</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

