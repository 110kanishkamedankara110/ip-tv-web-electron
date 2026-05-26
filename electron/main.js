const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const express = require("express");
const kill = require("tree-kill"); // ✅ IMPORTANT

let mainWindow;
let vlcProcess = null;
let currentUrl = null;
let staticServer = null;

// ================= VLC PATH =================
function getVlcPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "VLC", "vlc.exe")
    : path.join(__dirname, "VLC", "vlc.exe");
}

function forceKillVLC() {
  return new Promise((resolve) => {
    const { exec } = require("child_process");

    exec("taskkill /F /IM vlc.exe /T", () => {
      vlcProcess = null;
      currentUrl = null;
      resolve();
    });
  });
}
async function killVLC() {
  if (!vlcProcess) {
    await forceKillVLC();
    return;
  }

  try {
    vlcProcess.kill("SIGKILL");
  } catch {}

  vlcProcess = null;

  await forceKillVLC();
}
// ================= PLAY VLC (SINGLE INSTANCE SAFE) =================
async function playVLC(url) {
  await killVLC();

  await new Promise((r) => setTimeout(r, 200));

  const vlcPath = getVlcPath();

  currentUrl = url;

  vlcProcess = spawn(vlcPath, [
    url,
    "--no-video-title-show",
    "--intf",
    "qt",
    "--vout",
    "direct3d11",
  ]);

  vlcProcess.on("exit", () => {
    vlcProcess = null;
  });

  vlcProcess.on("error", () => {
    vlcProcess = null;
  });
}
// ================= STOP VLC =================
async function stopVLC() {
  await killVLC();
}

// ================= STATIC SERVER =================
function startStaticServer() {
  const appServer = express();

  const outPath = path.join(__dirname, "../out");

  appServer.use(express.static(outPath));

  return new Promise((resolve) => {
    staticServer = appServer.listen(3000, () => {
      console.log("Static server running on http://localhost:3000");
      resolve();
    });
  });
}

// ================= WINDOW =================
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenu(null);
  await startStaticServer();
  mainWindow.loadURL("http://localhost:3000");
}

// ================= IPC =================
ipcMain.handle("play-vlc", async (_, url) => {
  await playVLC(url);
});

ipcMain.handle("stop-vlc", async () => {
  await stopVLC();
});

ipcMain.handle("set-window-size", (_, w, h) => {
  if (mainWindow) {
    mainWindow.setSize(w, h);
  }
});

ipcMain.handle("get-current-url", () => {
  return currentUrl;
});

// ================= APP LIFECYCLE =================
app.whenReady().then(createWindow);

app.on("window-all-closed", async () => {
  await stopVLC();

  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }

  if (process.platform !== "darwin") app.quit();
});
