const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;
let vlcProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "assets/icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenu(null);

  mainWindow.loadURL("http://localhost:3000"); // Next.js dev OR build URL
}

app.whenReady().then(createWindow);

// ================= WINDOW RESIZE =================
ipcMain.handle("set-window-size", (_, w, h) => {
  if (mainWindow) {
    mainWindow.setSize(w, h);
  }
});

// ================= VLC CONTROL =================
ipcMain.handle("play-vlc", (_, url) => {
  if (vlcProcess) {
    vlcProcess.kill();
    vlcProcess = null;
  }

  // IMPORTANT: adjust path to your VLC installation
  const vlcPath = path.join(__dirname, "VLC/vlc.exe");

  vlcProcess = spawn(vlcPath, [url, "--quiet", "--no-video-title-show"]);
});

ipcMain.handle("stop-vlc", () => {
  if (vlcProcess) {
    vlcProcess.kill();
    vlcProcess = null;
  }
});
