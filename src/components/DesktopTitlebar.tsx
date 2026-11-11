import { Icon } from "./Icons";

export function DesktopTitlebar({
  activeCashier,
  userRole,
  currentPage,
  isLocked,
  onLockToggle,
  isMuted,
  onMuteToggle,
  onOpenQueue,
}: {
  activeCashier?: string;
  userRole?: string;
  currentPage?: string;
  isLocked?: boolean;
  onLockToggle?: () => void;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  onOpenQueue?: () => void;
}) {
  const handleMinimize = async () => {
    try {
      const electronAPI = (window as unknown as { electronAPI?: { minimize: () => void } }).electronAPI;
      if (electronAPI?.minimize) {
        electronAPI.minimize();
        return;
      }
      const tauri = (window as unknown as { __TAURI__?: { window?: { getCurrentWindow?: () => { minimize: () => Promise<void> } } } }).__TAURI__;
      if (tauri?.window?.getCurrentWindow) {
        await tauri.window.getCurrentWindow().minimize();
      }
    } catch {}
  };

  const handleMaximize = async () => {
    try {
      const electronAPI = (window as unknown as { electronAPI?: { maximize: () => void } }).electronAPI;
      if (electronAPI?.maximize) {
        electronAPI.maximize();
        return;
      }
      const tauri = (window as unknown as { __TAURI__?: { window?: { getCurrentWindow?: () => { toggleMaximize: () => Promise<void> } } } }).__TAURI__;
      if (tauri?.window?.getCurrentWindow) {
        await tauri.window.getCurrentWindow().toggleMaximize();
      }
    } catch {}
  };

  const handleClose = async () => {
    try {
      const electronAPI = (window as unknown as { electronAPI?: { close: () => void } }).electronAPI;
      if (electronAPI?.close) {
        electronAPI.close();
        return;
      }
      const tauri = (window as unknown as { __TAURI__?: { window?: { getCurrentWindow?: () => { close: () => Promise<void> } } } }).__TAURI__;
      if (tauri?.window?.getCurrentWindow) {
        await tauri.window.getCurrentWindow().close();
      }
    } catch {}
  };

  return (
    <header className="desktop-titlebar" data-tauri-drag-region>
      <div className="titlebar-right">
        <div className="window-controls">
          <button className="win-btn win-close" title="إغلاق البرنامج" onClick={handleClose} tabIndex={-1} />
          <button className="win-btn win-max" title="تكبير / استعادة" onClick={handleMaximize} tabIndex={-1} />
          <button className="win-btn win-min" title="تصغير" onClick={handleMinimize} tabIndex={-1} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "8px" }}>
          <Icon name="scissors" size={13} style={{ color: "#D4AF37" } as React.CSSProperties} />
          <span style={{ fontWeight: 700, color: "#DDD" }}>صالون لمسة</span>
          <span style={{ color: "#555" }}>—</span>
          <span>إدارة الصالون الفاخر v4.0</span>
        </div>
      </div>

      <div className="titlebar-center">
        <span style={{ color: "#D4AF37", fontSize: "11px", fontWeight: 700 }}>
          {currentPage === "admin"
            ? "لوحة الإدارة العامة والتحكم"
            : currentPage === "pos"
              ? "طرفية الكاشير ونقاط البيع #01"
              : currentPage === "attendance"
                ? "شاشة الحضور والانصراف"
                : currentPage === "invoices"
                  ? "سجل الفواتير والمبيعات"
                  : currentPage === "services"
                    ? "دليل الخدمات والباقات"
                    : currentPage === "inventory"
                      ? "المخزون والمستودع"
                      : "نظام إدارة الصالون"}
        </span>
        <span style={{ color: "#444" }}>•</span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#3FB950", display: "inline-block" }} />
          قاعدة بيانات محلية مشفرة (SQLite) • متصل
        </span>
        {onOpenQueue && (
          <>
            <span style={{ color: "#444" }}>•</span>
            <button
              onClick={onOpenQueue}
              title="عرض شاشة الدور وصالة الانتظار (F6)"
              style={{
                background: "rgba(212, 175, 55, 0.12)",
                border: "1px solid rgba(212, 175, 55, 0.35)",
                borderRadius: "4px",
                padding: "1px 7px",
                color: "#F5C242",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Icon name="users" size={11} />
              <span>شاشة الدور (F6)</span>
            </button>
          </>
        )}
      </div>

      <div className="titlebar-left">
        {onMuteToggle && (
          <button
            onClick={onMuteToggle}
            title={isMuted ? "تشغيل أصوات النظام" : "كتم أصوات النظام"}
            style={{
              background: "transparent",
              border: 0,
              color: isMuted ? "#E5484D" : "#888",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <Icon name={isMuted ? "volumeX" : "volume"} size={13} />
            <span>{isMuted ? "صامت" : "صوت"}</span>
          </button>
        )}
        {activeCashier && (
          <span style={{ fontSize: "11px", color: "#888" }}>
            {userRole === "admin" ? "المدير: " : userRole === "employee" ? "الموظف: " : "الكاشير: "}
            <strong style={{ color: "#CCC" }}>{activeCashier}</strong>
          </span>
        )}
        {onLockToggle && (
          <button
            onClick={onLockToggle}
            title={isLocked ? "إلغاء قفل الشاشة" : "قفل الشاشة السريع"}
            style={{
              background: "transparent",
              border: 0,
              color: isLocked ? "#FF9F1C" : "#777",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <Icon name={isLocked ? "lock" : "unlock"} size={13} />
            <span>{isLocked ? "مقفول" : "قفل الشاشة"}</span>
          </button>
        )}
        <span style={{ fontSize: "11px", color: "#555", fontFamily: "Inter" }}>
          1440 × 900 • Windows POS
        </span>
      </div>
    </header>
  );
}

