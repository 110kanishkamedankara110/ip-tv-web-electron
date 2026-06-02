/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const express = require("express");
const { default: axios } = require("axios");
const { Menu } = require("electron");

let mainWindow;
let currentUrl = null;
let staticServer = null;

let pipWindow = null;
let mpvProcess = null;

const { screen } = require("electron");

function getMPVPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "mpv", "mpv.exe")
    : path.join(__dirname, "mpv", "mpv.exe");
}

function getPiPGeometry() {
  const { height } = screen.getPrimaryDisplay().workAreaSize;
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  const w = 360;
  const h = 200;

  const x = width - w - 20; // bottom-left padding
  const y = height - h - 40;

  return `${w}x${h}+${x}+${y}`;
}

async function enterPiPMode(url) {
  await killMPV();

  mpvMode = "pip";

  await new Promise((r) => setTimeout(r, 150));

  const mpvPath = getMPVPath();

  mpvProcess = spawn(mpvPath, [
    url,
    "--force-window=immediate",
    "--keep-open=yes",
    "--osc=yes",
    "--geometry=" + getPiPGeometry(),
  ]);

  mpvProcess.on("exit", () => {
    mpvProcess = null;
  });

  mpvProcess.on("error", () => {
    mpvProcess = null;
  });
}
async function exitPiPMode() {
  killMPV();
  isPiPMode = false;
  currentUrl = null;

  if (!mpvProcess) return;

  mpvProcess = null;
}

async function playMPV(url) {
  await killMPV();

  mpvMode = "normal";

  await new Promise((r) => setTimeout(r, 150));

  const mpvPath = getMPVPath();

  mpvProcess = spawn(mpvPath, [
    url,
    "--force-window=immediate",
    "--keep-open=yes",
    "--osc=yes",
    "--geometry=80%x80%",
  ]);

  mpvProcess.on("exit", () => {
    mpvProcess = null;
  });

  mpvProcess.on("error", () => {
    mpvProcess = null;
  });
}

async function killMPV() {
  if (!mpvProcess) return;
  const proc = mpvProcess;
  mpvProcess = null;

  if (proc) {
    try {
      proc.kill("SIGKILL");
    } catch {}
  }

  await new Promise((resolve) => {
    const { exec } = require("child_process");
    exec("taskkill /F /IM mpv.exe /T", () => resolve());
  });
}

function closePiP() {
  killMPV();
  if (pipWindow) {
    pipWindow.close();
    pipWindow = null;
  }
}
function createPiPWindow(url) {
  if (pipWindow) {
    closePiP();
  }

  const { screen } = require("electron");

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const pipWidth = 360;
  const pipHeight = 200;

  pipWindow = new BrowserWindow({
    width: pipWidth,
    height: pipHeight,

    x: width - pipWidth - 20,
    y: height - pipHeight - 20,

    frame: true,
    resizable: true,
    movable: true, // IMPORTANT
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#000",
    title: "FlowTv",
    icon: path.join(__dirname, "assets/icon.ico"),

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  pipWindow.webContents.session.on(
    "will-download",
    (event, item, webContents) => {
      event.preventDefault();
      console.log("Blocked download:", item.getURL());
    },
  );
  pipWindow.on("close", () => {
    closePiP();
  });

  pipWindow.setMenu(null);

  pipWindow.loadURL(url);
}

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
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on("context-menu", () => {
    Menu.buildFromTemplate([
      { role: "copy" },
      { role: "paste" },
      { role: "cut" },
      { type: "separator" },
      { role: "selectAll" },
    ]).popup();
  });


  mainWindow.setMenu(null);
  await startStaticServer();
  mainWindow.loadURL("http://localhost:3000");
}

ipcMain.handle("play-mpv", async (_, url) => {
  await playMPV(url);
});

ipcMain.handle("stop-mpv", async () => {
  await killMPV();
});

ipcMain.handle("pip-enter", async (_, url) => {
  await enterPiPMode(url);
});

ipcMain.handle("pip-exit", async () => {
  await exitPiPMode();
});

ipcMain.handle("fetch-m3u", async (_, url) => {
  const res = await axios.get(url);
  return res.data;
});

ipcMain.handle("validate-m3u", async (_, url) => {
  try {
    await axios.get(url, {
      timeout: 8000,
      responseType: "text",
    });
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("set-window-size", (_, w, h) => {
  if (mainWindow) {
    mainWindow.setSize(w, h);
  }
});

ipcMain.handle("get-current-url", () => {
  return currentUrl;
});

ipcMain.handle("open-pip", (_, url) => {
  createPiPWindow(url);
});

ipcMain.handle("close-pip", () => {
  closePiP();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", async () => {
  await killMPV();
  closePiP();
  exitPiPMode();

  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }

  if (process.platform !== "darwin") app.quit();
});
