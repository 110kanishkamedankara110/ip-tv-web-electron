const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setWindowSize: (w, h) => ipcRenderer.invoke("set-window-size", w, h),

  playInVLC: (url) => ipcRenderer.invoke("play-vlc", url),

  stopVLC: () => ipcRenderer.invoke("stop-vlc"),
});
