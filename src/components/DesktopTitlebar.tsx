import { Icon } from "./Icons";

export function DesktopTitlebar({
  activeCashier,
  userRole,
  currentPage,
  shiftDuration,
  isLocked,
  onLockToggle,
  isMuted,
  onMuteToggle,
  themeMode = "dark",
  onThemeToggle,
  onCloseApp,
}: {
  activeCashier?: string;
  userRole?: string;
  currentPage?: string;
  shiftDuration?: string;
  isLocked?: boolean;
  onLockToggle?: () => void;
  isMuted?: boolean;
  onMuteToggle?: () => void;
  themeMode?: "dark" | "light";
  onThemeToggle?: () => void;
  onCloseApp?: () => void;
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
    if (onCloseApp) {
      onCloseApp();
      return;
    }
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
          <Icon name="scissors" size={13} style={{ color: "var(--gold)" } as React.CSSProperties} />
          <span style={{ fontWeight: 700, color: "var(--text)" }}>لمسة خليجي</span>
          <span style={{ color: "var(--subtle)" }}>—</span>
          <span>إدارة الصالون الفاخر v4.0</span>
        </div>
      </div>

      <div className="titlebar-center">
        <span style={{ color: "var(--gold)", fontSize: "11px", fontWeight: 700 }}>
          {currentPage === "admin"
            ? "صفحة الإدارة"
            : currentPage === "attendance"
              ? "صفحة الكاشير — الحضور والانصراف"
              : "صفحة الكاشير"}
        </span>
      </div>

      <div className="titlebar-left" />
    </header>
  );
}

