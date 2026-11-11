import { useState, useEffect } from "react";
import { Barber, AttendanceRecord, UserRole } from "../types";
import { Icon } from "./Icons";

export function AttendancePage({
  barbers,
  attendanceRecords,
  userRole,
  activeEmployeeName,
  onUpdateBarberStatus,
  onAdminCorrectAttendance,
}: {
  barbers: Barber[];
  attendanceRecords: AttendanceRecord[];
  userRole: UserRole;
  activeEmployeeName?: string;
  onUpdateBarberStatus: (barberId: string, newStatus: Barber["status"], timeStr: string) => void;
  onAdminCorrectAttendance: (recordId: string, newCheckIn: string, newCheckOut: string, reason: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"cards" | "table">("cards");
  const [statusFilter, setStatusFilter] = useState<string>("الكل");
  const [toastMsg, setToastMsg] = useState("");

  // PIN Modal State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedBarberForPin, setSelectedBarberForPin] = useState<Barber | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [targetAction, setTargetAction] = useState<"checkin" | "break" | "checkout">("checkin");
  const [pinError, setPinError] = useState("");

  // Admin Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);
  const [correctedCheckIn, setCorrectedCheckIn] = useState("");
  const [correctedCheckOut, setCorrectedCheckOut] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // KPIs
  const presentCount = barbers.filter((b) => b.status === "متاح" || b.status === "مشغول").length;
  const breakCount = barbers.filter((b) => b.status === "في استراحة").length;
  const leftCount = barbers.filter((b) => b.status === "منصرف").length;
  const absentCount = barbers.filter((b) => b.status === "غير حاضر").length;
  const totalBarbers = barbers.length;

  const filteredBarbers = barbers.filter((b) => {
    if (userRole === "employee" && activeEmployeeName) {
      return b.name.includes(activeEmployeeName) || activeEmployeeName.includes(b.name.split(" ")[0]);
    }
    if (statusFilter === "الكل") return true;
    if (statusFilter === "حاضر") return b.status === "متاح" || b.status === "مشغول";
    return b.status === statusFilter;
  });

  // Open PIN Modal
  const handleOpenPin = (barber: Barber, action: "checkin" | "break" | "checkout") => {
    setSelectedBarberForPin(barber);
    setTargetAction(action);
    setEnteredPin("");
    setPinError("");
    setPinModalOpen(true);
  };

  // Submit PIN verification
  const handleVerifyPin = () => {
    if (!selectedBarberForPin) return;
    if (enteredPin !== selectedBarberForPin.pin) {
      setPinError("الرمز السري (PIN) غير صحيح! حاول مرة أخرى");
      return;
    }

    const nowStr = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    let newStatus: Barber["status"] = "متاح";
    let actionDesc = "";

    if (targetAction === "checkin") {
      newStatus = "متاح";
      actionDesc = "تسجيل حضور وبدء الوردية";
    } else if (targetAction === "break") {
      newStatus = selectedBarberForPin.status === "في استراحة" ? "متاح" : "في استراحة";
      actionDesc = newStatus === "في استراحة" ? "بدء استراحة" : "انتهاء الاستراحة والعودة للعمل";
    } else {
      newStatus = "منصرف";
      actionDesc = "تسجيل انصراف وإغلاق يوم العمل";
    }

    onUpdateBarberStatus(selectedBarberForPin.id, newStatus, nowStr);
    setPinModalOpen(false);
    showToast(`تم ${actionDesc} للحلاق «${selectedBarberForPin.name}» بنجاح`);
  };

  // Keyboard input listener for PIN modal
  useEffect(() => {
    if (!pinModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        setEnteredPin((prev) => (prev.length < 4 ? prev + e.key : prev));
        setPinError("");
      } else if (e.key === "Backspace") {
        setEnteredPin((prev) => prev.slice(0, -1));
        setPinError("");
      } else if (e.key === "Escape") {
        setPinModalOpen(false);
      } else if (e.key === "Enter") {
        if (enteredPin.length >= 4) {
          handleVerifyPin();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pinModalOpen, enteredPin, selectedBarberForPin, targetAction]);

  // Submit Admin Correction
  const handleSaveCorrection = () => {
    if (!selectedRecordForCorrection) return;
    if (!correctionReason.trim()) {
      alert("يجب كتابة سبب التعديل لتوثيقه في سجل العمليات والتدقيق!");
      return;
    }
    onAdminCorrectAttendance(
      selectedRecordForCorrection.id,
      correctedCheckIn,
      correctedCheckOut,
      correctionReason,
    );
    setCorrectionModalOpen(false);
    showToast(`تم تصحيح سجل الحضور وتوثيق العملية في سجل العمليات`);
  };

  return (
    <div>
      {/* Top Header KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">الحاضرون على الكراسي</div>
            <div className="kpi-value gold">{presentCount} <small style={{ fontSize: 14 }}>حلاق</small></div>
            <div className="kpi-hint positive">
              <Icon name="check" size={13} />
              <span>جاهزون لخدمة العملاء</span>
            </div>
          </div>
          <div className="kpi-icon-wrap">
            <Icon name="scissors" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">في استراحة حالياً</div>
            <div className="kpi-value">{breakCount} <small style={{ fontSize: 14 }}>حلاق</small></div>
            <div className="kpi-hint" style={{ color: "#FF9F1C" }}>
              <Icon name="clock" size={13} />
              <span>فترة راحة مصرحة</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#FF9F1C", borderColor: "#553810" }}>
            <Icon name="pause" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">تم انصرافهم اليوم</div>
            <div className="kpi-value">{leftCount}</div>
            <div className="kpi-hint">
              <span>انتهت ورديتهم</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#AAA", borderColor: "#333" }}>
            <Icon name="logout" size={20} />
          </div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">نسبة الالتزام بالدوام</div>
            <div className="kpi-value positive" style={{ color: "#56D364" }}>
              {Math.round(((presentCount + breakCount) / Math.max(1, totalBarbers)) * 100)}%
            </div>
            <div className="kpi-hint positive">
              <span>{presentCount + breakCount} من أصل {totalBarbers} موظفين</span>
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ color: "#3FB950", borderColor: "#1A4522" }}>
            <Icon name="chart" size={20} />
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{userRole === "employee" ? "سجل حضوري الشخصي" : "إدارة حضور وانصراف فريق العمل"}</h2>
            <p>
              {userRole === "employee"
                ? "سجّل حضورك وانصرافك بالرمز السري واطلع على إحصائيات دوامك"
                : "متابعة لحظية لحالات الحلاقين، أوقات الحضور والانصراف، وجداول العمل الشهرية"}
            </p>
          </div>

          {userRole !== "employee" && (
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  background: "#181818",
                  border: "1px solid #2B2519",
                  borderRadius: 10,
                  padding: 4,
                  display: "flex",
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("cards")}
                  style={{
                    height: 34,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: activeTab === "cards" ? "#D4AF37" : "transparent",
                    color: activeTab === "cards" ? "#111" : "#CCC",
                    border: 0,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  بطاقات الموظفين
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("table")}
                  style={{
                    height: 34,
                    padding: "0 14px",
                    borderRadius: 8,
                    background: activeTab === "table" ? "#D4AF37" : "transparent",
                    color: activeTab === "table" ? "#111" : "#CCC",
                    border: 0,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  جدول الحضور الشهري
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Cards View */}
        {activeTab === "cards" && (
          <div>
            {/* Filter Pills (Admin only) */}
            {userRole !== "employee" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {["الكل", "حاضر", "في استراحة", "منصرف", "غير حاضر"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    style={{
                      height: 36,
                      padding: "0 14px",
                      borderRadius: 8,
                      background: statusFilter === st ? "rgba(212, 175, 55, 0.15)" : "#161616",
                      border: `1px solid ${statusFilter === st ? "#D4AF37" : "#2A2418"}`,
                      color: statusFilter === st ? "#F5C242" : "#AAA",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}

            {/* Employee Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
              {filteredBarbers.map((b) => {
                const isOnline = b.status === "متاح" || b.status === "مشغول";
                const isBreak = b.status === "في استراحة";

                return (
                  <div
                    key={b.id}
                    style={{
                      background: "#161616",
                      border: "1px solid #28241B",
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div>
                      {/* Top row: Avatar & status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <img
                            src={b.avatar}
                            alt={b.name}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 12,
                              objectFit: "cover",
                              border: "2px solid #D4AF37",
                            }}
                          />
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#FFF" }}>{b.name}</div>
                            <div style={{ fontSize: 12, color: "#8E8E8E" }}>{b.title}</div>
                          </div>
                        </div>

                        <span
                          className={`badge ${
                            isOnline ? "success" : isBreak ? "warning" : "neutral"
                          }`}
                        >
                          <i />
                          {b.status}
                        </span>
                      </div>

                      {/* Timestamps */}
                      <div
                        style={{
                          background: "#111111",
                          border: "1px solid #221F17",
                          borderRadius: 10,
                          padding: "10px 14px",
                          marginBottom: 16,
                          fontSize: 13,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#888" }}>وقت الحضور:</span>
                          <strong style={{ color: b.checkInTime !== "—" ? "#56D364" : "#666", fontFamily: "Inter" }}>
                            {b.checkInTime}
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#888" }}>وقت الانصراف:</span>
                          <strong style={{ color: b.checkOutTime !== "—" ? "#FFAE42" : "#666", fontFamily: "Inter" }}>
                            {b.checkOutTime}
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #222", paddingTop: 4 }}>
                          <span style={{ color: "#888" }}>الخدمات المنجزة اليوم:</span>
                          <strong style={{ color: "#F5C242", fontFamily: "Inter" }}>{b.completedToday} خدمة</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons with PIN Pad */}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {b.status === "غير حاضر" || b.status === "منصرف" ? (
                        <button
                          type="button"
                          className="primary-btn"
                          style={{ flex: 1, height: 38, fontSize: 13 }}
                          onClick={() => handleOpenPin(b, "checkin")}
                        >
                          <Icon name="check" size={15} />
                          <span>تسجيل حضور (PIN)</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ flex: 1, height: 38, fontSize: 12 }}
                            onClick={() => handleOpenPin(b, "break")}
                          >
                            <Icon name="pause" size={14} />
                            <span>{b.status === "في استراحة" ? "إنهاء الاستراحة" : "استراحة"}</span>
                          </button>

                          <button
                            type="button"
                            className="danger-ghost"
                            style={{ flex: 1, height: 38, fontSize: 12 }}
                            onClick={() => handleOpenPin(b, "checkout")}
                          >
                            <Icon name="logout" size={14} />
                            <span>انصراف</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Monthly Attendance Table */}
        {activeTab === "table" && (
          <div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>التاريخ</th>
                    <th>وقت الحضور</th>
                    <th>وقت الانصراف</th>
                    <th>إجمالي الساعات</th>
                    <th>دقائق التأخير</th>
                    <th>الحالة</th>
                    {userRole === "admin" && <th>الإجراءات (أدمن)</th>}
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td style={{ fontWeight: 700 }}>{rec.barberName}</td>
                      <td style={{ color: "#AAA" }}>{rec.date}</td>
                      <td style={{ fontFamily: "Inter", color: "#56D364" }}>{rec.checkIn}</td>
                      <td style={{ fontFamily: "Inter", color: "#FFAE42" }}>{rec.checkOut}</td>
                      <td style={{ fontFamily: "Inter", fontWeight: 700 }}>{rec.workingHours} س</td>
                      <td style={{ fontFamily: "Inter", color: rec.lateMinutes > 0 ? "#FF8E92" : "#888" }}>
                        {rec.lateMinutes > 0 ? `${rec.lateMinutes} دقيقة` : "0 (ملتزم)"}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            rec.status === "حاضر" ? "success" : rec.status === "في استراحة" ? "warning" : "neutral"
                          }`}
                        >
                          <i />
                          {rec.status}
                        </span>
                      </td>
                      {userRole === "admin" && (
                        <td>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ height: 32, padding: "0 10px", fontSize: 12 }}
                            onClick={() => {
                              setSelectedRecordForCorrection(rec);
                              setCorrectedCheckIn(rec.checkIn);
                              setCorrectedCheckOut(rec.checkOut);
                              setCorrectionReason("");
                              setCorrectionModalOpen(true);
                            }}
                          >
                            <Icon name="edit" size={13} />
                            <span>تصحيح السجل</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* MODAL 1: PIN Verification Modal */}
      {pinModalOpen && selectedBarberForPin && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <h2>إدخال الرمز السري (PIN)</h2>
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#FFF", marginBottom: 4 }}>
                {selectedBarberForPin.name}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                الرجاء إدخال الرمز السري المكون من 4 أرقام لتأكيد العملية
              </div>

              {/* Masked PIN Display & Hidden Focused Input for direct keyboard typing */}
              <div
                style={{
                  position: "relative",
                  height: 52,
                  background: "#111",
                  border: "1.5px solid #D4AF37",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  letterSpacing: "14px",
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#F5C242",
                  marginBottom: 16,
                  fontFamily: "Inter",
                  cursor: "text",
                }}
                onClick={() => {
                  const input = document.getElementById("pin-hidden-input");
                  input?.focus();
                }}
              >
                <input
                  id="pin-hidden-input"
                  type="password"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setEnteredPin(clean);
                    setPinError("");
                  }}
                  autoFocus
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "text",
                  }}
                />
                {enteredPin ? "•".repeat(enteredPin.length) : <span style={{ fontSize: 13, letterSpacing: "normal", color: "#666" }}>اكتب الرمز السري بالكيبورد أو اضغط الأرقام</span>}
              </div>

              {pinError && (
                <div style={{ color: "#FF8E92", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
                  {pinError}
                </div>
              )}

              {/* Numeric Keypad */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, maxWidth: 280, margin: "0 auto" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (enteredPin.length < 4) {
                        setEnteredPin(enteredPin + num);
                        setPinError("");
                      }
                    }}
                    style={{
                      height: 48,
                      borderRadius: 10,
                      background: "#181818",
                      border: "1px solid #2B2519",
                      color: "#FFF",
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: "Inter",
                      cursor: "pointer",
                    }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEnteredPin("")}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    background: "#221717",
                    border: "1px solid #442222",
                    color: "#FF9999",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  مسح
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (enteredPin.length < 4) {
                      setEnteredPin(enteredPin + "0");
                      setPinError("");
                    }
                  }}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    background: "#181818",
                    border: "1px solid #2B2519",
                    color: "#FFF",
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: "Inter",
                    cursor: "pointer",
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setEnteredPin(enteredPin.slice(0, -1))}
                  style={{
                    height: 48,
                    borderRadius: 10,
                    background: "#1C180E",
                    border: "1px solid #4D3F1D",
                    color: "#D4AF37",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ←
                </button>
              </div>

              <div style={{ marginTop: 14, fontSize: 11, color: "#666" }}>
                رمز تجريبي سريع: <strong>{selectedBarberForPin.pin}</strong>
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setPinModalOpen(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={enteredPin.length < 4}
                onClick={handleVerifyPin}
              >
                تأكيد العملية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Admin Attendance Correction Modal */}
      {correctionModalOpen && selectedRecordForCorrection && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div className="modal-head">
              <h2>تصحيح سجل الحضور (صلاحية أدمن)</h2>
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                style={{ background: "transparent", border: 0, color: "#888", cursor: "pointer" }}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  background: "#181818",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #2B2519",
                  marginBottom: 16,
                  fontSize: 13,
                  color: "#CCC",
                }}
              >
                <div>الموظف: <strong style={{ color: "#FFF" }}>{selectedRecordForCorrection.barberName}</strong></div>
                <div>التاريخ: <strong>{selectedRecordForCorrection.date}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">وقت الحضور المصحح:</label>
                <input
                  type="text"
                  className="form-input"
                  value={correctedCheckIn}
                  onChange={(e) => setCorrectedCheckIn(e.target.value)}
                  placeholder="مثال: 09:00 ص"
                />
              </div>

              <div className="form-group">
                <label className="form-label">وقت الانصراف المصحح:</label>
                <input
                  type="text"
                  className="form-input"
                  value={correctedCheckOut}
                  onChange={(e) => setCorrectedCheckOut(e.target.value)}
                  placeholder="مثال: 06:00 م"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#FFAE42" }}>
                  سبب التصحيح (إلزامي للتوثيق في سجل العمليات):
                </label>
                <textarea
                  className="form-textarea"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="اكتب سبب التعديل (مثلاً: عطل فني في جهاز البصمة، تأكيد الحضور عبر كاميرات المراقبة...)"
                />
              </div>
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setCorrectionModalOpen(false)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveCorrection}
              >
                حفظ التصحيح وتوثيقه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="toast-bar">
          <span style={{ color: "#3FB950", display: "inline-flex" }}>
            <Icon name="check" size={18} />
          </span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

