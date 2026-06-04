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

  await new Promise((r) => setTimeout(r, 150));

  const mpvPath = getMPVPath();
  const proxyUrl = `http://localhost:3001/api/stream?url=${encodeURIComponent(url)}`;
  mpvProcess = spawn(mpvPath, [
    proxyUrl,
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
  currentUrl = null;

  if (!mpvProcess) return;

  mpvProcess = null;
}

async function playMPV(url) {
  await killMPV();

  await new Promise((r) => setTimeout(r, 150));

  const mpvPath = getMPVPath();
  const proxyUrl = `http://localhost:3001/api/stream?url=${encodeURIComponent(url)}`;
  mpvProcess = spawn(mpvPath, [
    proxyUrl,
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
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const pipWidth = 360;
  const pipHeight = 240;

  pipWindow = new BrowserWindow({
    width: pipWidth,
    height: pipHeight,
    x: width - pipWidth - 20,
    y: height - pipHeight - 20,
    frame: true,
    resizable: true,
    movable: true,
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

  // Keep this safety handler active to block accidental file downloads
  pipWindow.webContents.session.on("will-download", (event, item) => {
    event.preventDefault();
    console.log("Blocked accidental download:", item.getURL());
  });

  pipWindow.on("close", () => {
    closePiP();
  });

  pipWindow.setMenu(null);

  // THE CRITICAL FIX: Instead of loading the raw URL into the browser window,
  // we point it to your local Next.js PiP page routing view (running on port 3000)
  // and pass the raw stream URL safely inside the query string!
  const pipViewUrl = `http://localhost:3000/pip.html?url=${encodeURIComponent(url)}`;
  pipWindow.loadURL(pipViewUrl);
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

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-web-security");
app.commandLine.appendSwitch("allow-running-insecure-content");
