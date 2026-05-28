const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setWindowSize: (w, h) => ipcRenderer.invoke("set-window-size", w, h),
  fetchM3U: (url) => ipcRenderer.invoke("fetch-m3u", url),
  playInVLC: (url) => ipcRenderer.invoke("play-vlc", url),
  stopVLC: () => ipcRenderer.invoke("stop-vlc"),
});
