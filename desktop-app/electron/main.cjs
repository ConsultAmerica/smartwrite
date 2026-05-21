const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const http = require("http");

const isDev = process.env.NODE_ENV === "development";
const DEV_URL = "http://127.0.0.1:5173";

function waitForUrl(url, maxAttempts = 60, intervalMs = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tick = () => {
      attempts += 1;
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error(`Dev server not ready: ${url}`));
        } else {
          setTimeout(tick, intervalMs);
        }
      });
      req.on("error", () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Dev server not running at ${url}. Run: npm run dev`));
        } else {
          setTimeout(tick, intervalMs);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
      });
    };
    tick();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "SmartWrite AI",
    backgroundColor: "#0f1419",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  const loadApp = async () => {
    if (isDev) {
      try {
        await waitForUrl(DEV_URL);
        await win.loadURL(DEV_URL);
      } catch (err) {
        const html = `
          <!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;background:#0f1419;color:#e8edf4">
          <h2>SmartWrite — dev server not ready</h2>
          <p>${err.message}</p>
          <p>From <code>desktop-app</code> run: <strong>npm run dev</strong></p>
          </body></html>`;
        win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      }
    } else {
      const indexPath = path.join(__dirname, "..", "dist", "index.html");
      await win.loadFile(indexPath);
    }
  };

  void loadApp();

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
