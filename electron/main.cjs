const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

app.name = "lamsat-khaleeji-pos";
try {
  app.setPath("userData", path.join(app.getPath("appData"), "lamsat-khaleeji-pos"));
} catch (e) {}
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

let mainWindow = null;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const winWidth = Math.min(1440, workArea.width);
  const winHeight = Math.min(900, workArea.height);
  const winX = workArea.x + Math.max(0, Math.floor((workArea.width - winWidth) / 2));
  const winY = workArea.y + Math.max(0, Math.floor((workArea.height - winHeight) / 2));

  mainWindow = new BrowserWindow({
    x: winX,
    y: winY,
    width: winWidth,
    height: winHeight,
    minWidth: Math.min(1100, workArea.width),
    minHeight: Math.min(680, workArea.height),
    frame: false, // Frameless window to display the custom Lamsat Khaleeji gold titlebar
    title: "لمسة خليجي — نظام إدارة صالون الحلاقة",
    backgroundColor: "#0B0B0B",
    show: false,
    icon: path.join(__dirname, "../public/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Check if running in development mode or production
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Gracefully show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Hide default Chromium top menu bar
  mainWindow.setMenuBarVisibility(false);
}

// Window control IPC handlers
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("window-is-maximized", () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Printer discovery and silent ESC/POS thermal printing
const VIRTUAL_PRINTER_RE = /microsoft print to pdf|foxit.*pdf|xps document writer|onenote|fax/i;

ipcMain.handle("get-printers", async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle("print-silent", async (_event, deviceName) => {
  if (!mainWindow) return { ok: false, reason: "no-window" };
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    const chosen =
      (deviceName ? printers.find((p) => p.name === deviceName) : null) ||
      printers.find((p) => p.isDefault) ||
      printers[0];

    const targetName = chosen ? chosen.name : deviceName || "";
    if (!targetName) {
      return { ok: false, reason: "no-printer" };
    }

    if (VIRTUAL_PRINTER_RE.test(targetName)) {
      return { ok: false, reason: "virtual-printer", printer: targetName };
    }

    return await new Promise((resolve) => {
      mainWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: targetName,
          margins: { marginType: "none" },
        },
        (success, failureReason) => {
          if (!success) {
            console.error("Thermal print failed:", failureReason);
            resolve({ ok: false, reason: failureReason || "print-failed", printer: targetName });
          } else {
            resolve({ ok: true, printer: targetName });
          }
        }
      );
    });
  } catch (err) {
    console.error("Print handler error:", err);
    return { ok: false, reason: "exception" };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

