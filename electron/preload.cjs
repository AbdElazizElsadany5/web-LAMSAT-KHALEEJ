const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  closeConfirmed: () => ipcRenderer.send("window-close-confirmed"),
  onRequestAppClose: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("request-app-close", handler);
    return () => ipcRenderer.removeListener("request-app-close", handler);
  },
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  printSilent: (deviceName) => ipcRenderer.invoke("print-silent", deviceName),
});

