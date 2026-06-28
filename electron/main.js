/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const express = require("express");
const { default: axios } = require("axios");
const { Menu } = require("electron");
const cors = require("cors"); // IMPORTED: Cross-Origin handler middleware

let mainWindow;
let currentUrl = null;
let staticServer = null;

let pipWindow = null;
let vlcProcess = null;

const { screen } = require("electron");

function getvlcPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "VLC", "vlc.exe")
    : path.join(__dirname, "VLC", "vlc.exe");
}

async function enterPiPMode(url) {
  await killvlc();
  await new Promise((r) => setTimeout(r, 150));

  const vlcPath = getvlcPath();

  vlcProcess = spawn(vlcPath, [
    // 1. FORCE THE CONTROLLER ENGINE INTF
    "--intf=qt",
    "--vout=direct3d11",
    "--embedded-video",

    // 2. PIP WINDOW LAYOUT & STYLE PINNING
    "--no-fullscreen",
    "--no-video-title-show",
    "--no-video-deco",
    "--video-on-top",
    "--qt-minimal-view", 

    // 3. HARD INTERFACE GEOMETRY LOCKS (FORCES UNIFORM SIZE)
    "--no-qt-video-autoresize",
    "--autoscale",
    "--width=360",
    "--height=200",
    "--aspect-ratio=16:9",

    // 4. BUFFERING STABILITY
    "--network-caching=800",
    "--live-caching=800",
    "--file-caching=800",

    // 5. CLEAN PIP INTERFACE (NO POPUPS)
    "--quiet",
    "--no-osd",
    "--no-qt-error-dialogs",
    "--no-qt-privacy-ask",
    "--no-qt-fs-controller",

    // 6. TARGET STREAM MEDIA URL
    url,
  ]);

  vlcProcess.on("exit", () => (vlcProcess = null));
  vlcProcess.on("error", () => (vlcProcess = null));
}


async function exitPiPMode() {
  killvlc();
  currentUrl = null;

  if (!vlcProcess) return;

  vlcProcess = null;
}

async function playvlc(url) {
  await killvlc();
  await new Promise((r) => setTimeout(r, 150));

  const vlcPath = getvlcPath();

  vlcProcess = spawn(vlcPath, [
    // 1. FORCE THE CONTROLLER ENGINE INTF
    "--intf=qt",
    "--vout=direct3d11",
    "--avcodec-hw=none",

    // 2. FORCE SINGLE INTERACTIVE WINDOW CONTAINER
    "--embedded-video",
    "--video-deco",
    "--no-fullscreen",
    "--no-video-title-show",
    "--no-video-on-top", // FIXED: This is the correct flag to stop window pinning

    // 3. BUFFERING STABILITY
    "--network-caching=1000",
    "--live-caching=1000",
    "--file-caching=1000",

    // 4. SUPPRESS OTHER LOG POPUPS
    "--quiet",
    "--no-osd",
    "--no-qt-error-dialogs",
    "--no-qt-privacy-ask",

    // 5. MEDIA URL TARGET
    url,
  ]);

  vlcProcess.on("exit", () => (vlcProcess = null));
  vlcProcess.on("error", () => (vlcProcess = null));
}

async function killvlc() {
  if (!vlcProcess) return;
  const proc = vlcProcess;
  vlcProcess = null;

  if (proc) {
    try {
      proc.kill("SIGKILL");
    } catch {}
  }

  await new Promise((resolve) => {
    const { exec } = require("child_process");
    exec("taskkill /F /IM vlc.exe /T", () => resolve());
  });
}

function closePiP() {
  killvlc();
  if (pipWindow) {
    pipWindow.close();
    pipWindow = null;
  }
}
function createPiPWindow(url) {
  if (pipWindow) closePiP();

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const pipWidth = 320;
  const pipHeight = 180;

  pipWindow = new BrowserWindow({
    width: pipWidth,
    height: pipHeight,

    x: width - pipWidth - 20,
    y: height - pipHeight - 20,

    frame: false, // 👈 real PiP feel
    resizable: true,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#000",

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  pipWindow.setMenu(null);

  pipWindow.loadURL(
    `http://localhost:3000/pip.html?url=${encodeURIComponent(url)}`,
  );

  pipWindow.on("closed", () => {
    pipWindow = null;
  });
}

let currentStreamProcess = null;

function startStaticServer() {
  const appExpress = express();
  const streamExpress = express();

  const ffmpegPath = app.isPackaged
    ? path.join(process.resourcesPath, "ffmpeg", "bin", "ffmpeg.exe")
    : path.join(__dirname, "ffmpeg", "bin", "ffmpeg.exe");

  streamExpress.get("/api/stream", (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl) return res.status(400).send("No stream URL provided");

    console.log(
      "Piping instant direct proxy stream over port 3001 for URL:",
      streamUrl,
    );

    if (currentStreamProcess) {
      try {
        currentStreamProcess.kill("SIGKILL");
      } catch (e) {}
      currentStreamProcess = null;
    }

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Cache-Control", "no-cache");

    currentStreamProcess = spawn(ffmpegPath, [
      "-reconnect",
      "1",
      "-reconnect_at_eof",
      "1",
      "-reconnect_streamed",
      "1",
      "-reconnect_delay_max",
      "2",
      "-fflags",
      "nobuffer+discardcorrupt",
      "-flags",
      "low_delay",
      "-i",
      streamUrl,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-f",
      "mp4",
      "-movflags",
      "empty_moov+default_base_moof+frag_keyframe+faststart",
      "pipe:1",
    ]);

    currentStreamProcess.stdout.pipe(res);

    currentStreamProcess.on("error", (err) => {
      console.error("[Direct Stream Error]:", err.message);
    });

    req.on("close", () => {
      console.log(
        "Player request severed. Killing background stream pipeline worker.",
      );
      if (currentStreamProcess) {
        try {
          currentStreamProcess.kill("SIGKILL");
        } catch (e) {}
        currentStreamProcess = null;
      }
    });
  });

  const outPath = path.join(__dirname, "../out");

  appExpress.use(express.static(outPath));

  return new Promise((resolve) => {
    staticServer = appExpress.listen(3000, () => {
      console.log("Static server running on http://localhost:3000");
      resolve();
    });

    streamServerInstance = streamExpress.listen(3001, () => {
      console.log(
        "Isolated Streaming data core running on http://localhost:3001",
      );
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

ipcMain.handle("play-vlc", async (_, url) => {
  await playvlc(url);
});

ipcMain.handle("stop-vlc", async () => {
  await killvlc();
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
  await killvlc();
  closePiP();
  exitPiPMode();

  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }

  if (process.platform !== "darwin") app.quit();
});

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-web-security");
app.commandLine.appendSwitch("allow-running-insecure-content");
