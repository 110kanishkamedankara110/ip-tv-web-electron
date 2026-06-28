/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setWindowSize: (w, h) => ipcRenderer.invoke("set-window-size", w, h),
  fetchM3U: (url) => ipcRenderer.invoke("fetch-m3u", url),
  validateM3U: (url) => ipcRenderer.invoke("validate-m3u", url),
  openPiP: (url) => ipcRenderer.invoke("open-pip", url),
  closePiP: () => ipcRenderer.invoke("close-pip"),
  playvlc: (url) => ipcRenderer.invoke("play-vlc", url),
  stopvlc: () => ipcRenderer.invoke("stop-vlc"),
  enterPiPMode: (url) => ipcRenderer.invoke("pip-enter", url),
  exitPiPMode: () => ipcRenderer.invoke("pip-exit"),
});
