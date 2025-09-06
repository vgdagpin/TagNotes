"use strict";

const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  Tray,
  nativeImage,
  ipcMain,
  globalShortcut,
} = require("electron");
const path = require("path");
const isExplicitDev =
  process.env.NODE_ENV === "development" || process.env.ELECTRON_DEV === "true";

let server;
let tray = null;
let isQuiting = false;
let mainWindow = null;
let mainWindowUrl = null;

app
  .whenReady()
  .then(() => {
    createTray();
    start();
  })
  .catch((err) => {
    console.error("Failed during startup", err);
    dialog.showErrorBox("Startup Error", String(err?.message || err));
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (server && server.close) server.close();
    // Unregister global shortcuts
    try {
      globalShortcut.unregisterAll();
    } catch (e) {}
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) start();
});

async function createTray() {
  // Setup tray (small embedded transparent PNG used as icon)
  try {
    const iconPath = getTrayIconPath();
    tray = new Tray(iconPath);
    const trayMenu = Menu.buildFromTemplate([
      {
        label: "Show",
        click: () => {
          BrowserWindow.getAllWindows().forEach((w) => w.show());
        },
      },
      {
        type: "separator",
      },
      {
        label: "Quit",
        click: () => {
          isQuiting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(trayMenu);
    tray.setToolTip("TagNote");
    tray.on("click", () => {
      BrowserWindow.getAllWindows().forEach((w) => w.show());
    });
  } catch (e) {
    console.error("Failed to create tray", e);
  }
}

function getTrayIconPath() {
  // Use favicon.ico from public folder for Windows compatibility
  return path.join(__dirname, "..", "public", "favicon.ico");
}

function createWindow(url) {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      devTools: true,
    },
  });

  win.loadURL(url);
  // track main window and its base URL
  mainWindow = win;
  mainWindowUrl = url;
  // In dev, open devtools so HMR errors are visible
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    win.webContents.openDevTools({ mode: "right" });

    // forward console messages from renderer to main's console
    win.webContents.on(
      "console-message",
      (e, level, message, line, sourceId) => {
        console.log("[renderer]", message, sourceId, line);
      }
    );
  }

  // minimize to tray behavior
  win.on("minimize", (event) => {
    // Prevent the default minimize and hide to tray instead
    event.preventDefault();
    win.hide();
  });

  // When window is closed, clean up tray if quitting
  win.on("close", (e) => {
    if (!isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
      mainWindowUrl = null;
    }
  });
}

async function start() {
  // Build application menu with "Say Hello"
  try {
    const template = [
      {
        label: "File",
        submenu: [{ role: "quit" }],
      },
      {
        label: "Actions",
        submenu: [
          {
            label: "Say Hello",
            click: () => {
              dialog.showMessageBox({
                type: "info",
                title: "Greeting",
                message: "Hello Vince",
              });
            },
          },
          {
            label: "Add Entry",
            click: () => {
              try {
                openAddEntryWindow("/add-entry");
              } catch (e) {
                console.error(e);
              }
            },
          },
        ],
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    // Hide the application menu (keep template available for programmatic use / tray)
    Menu.setApplicationMenu(menu);

    function navigateMainWindow(route) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Build target URL using hash routing (HashRouter expects #/route)
        const base = (mainWindowUrl || "http://127.0.0.1:5173").replace(
          /\/$/,
          ""
        );
        const routeFragment = route.startsWith("/") ? route : `/${route}`;
        const target = `${base}/#${routeFragment}`;
        mainWindow.show();
        mainWindow.focus();
        mainWindow.loadURL(target);
      }
    }
  } catch (e) {
    // non-fatal
    console.error("Failed to set application menu", e);
  }

  // Opens a modal child window and navigates it to the given route
  function openAddEntryWindow(route) {
    try {
      const parent =
        mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
      const modal = new BrowserWindow({
        width: 480,
        height: 420,
        resizable: false,
        parent,
        modal: false,
        show: true,
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
        },
      });

      let target;
      // If mainWindowUrl is an http dev server, load dev route
      if (mainWindowUrl && mainWindowUrl.startsWith("http")) {
        const base = mainWindowUrl.replace(/\/$/, "");
        const routeFragment = route.startsWith("/") ? route : `/${route}`;
        target = `${base}/#${routeFragment}`;
      } else {
        // production: load built index.html and use hash routing to reach the route
        const indexPath = path.join(__dirname, "..", "dist", "index.html");
        target = `file://${indexPath}#${route}`;
      }

      modal.loadURL(target);
      // open devtools for modal if in dev
      if (target.includes("localhost") || target.includes("127.0.0.1")) {
        modal.webContents.openDevTools({ mode: "right" });
      }

      // forward console messages from modal to main process for easier debugging
      modal.webContents.on(
        "console-message",
        (e, level, message, line, sourceId) => {
          console.log("[modal]", message, sourceId, line);
        }
      );

      // Ensure HashRouter picks up the route: set location.hash after load
      const routeFragment = route.startsWith("/") ? route : `/${route}`;
      modal.webContents.on("did-finish-load", () => {
        try {
          modal.webContents.executeJavaScript(
            `window.location.hash = '${routeFragment}'`
          );
        } catch (err) {
          // ignore
        }
      });

      modal.on("closed", () => {
        // noop
      });
    } catch (err) {
      console.error("Failed to open Add Entry modal", err);
    }
  }

  // Register a global shortcut to show the app (Ctrl+Alt+J)
  try {
    const registered = globalShortcut.register("Control+Alt+J", () => {
      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          // if no main window, create one
          const base = "http://127.0.0.1:5173";
          createWindow(base);
        }
      } catch (e) {
        console.error("Global shortcut handler error", e);
      }
    });
    if (!registered) console.warn("Global shortcut registration failed");
  } catch (e) {
    console.error("Failed to register global shortcut", e);
  }

  // Register a global shortcut to open Add Entry modal (Ctrl+Alt+I)
  try {
    const reg2 = globalShortcut.register("Control+Alt+I", () => {
      try {
        openAddEntryWindow("/add-entry");
      } catch (err) {
        console.error("Global shortcut Add Entry handler error", err);
      }
    });
    if (!reg2) console.warn("Global shortcut (Add Entry) registration failed");
  } catch (err) {
    console.error("Failed to register Add Entry global shortcut", err);
  }

  // First, if the user explicitly set a dev env, prefer that.
  if (isExplicitDev) {
    createWindow("http://localhost:5173");
    return;
  }

  // Otherwise, probe localhost:5173 briefly — if a Vite dev server is running, use it.
  const probeVite = () =>
    new Promise((resolve) => {
      const http = require("http");
      const options = {
        host: "127.0.0.1",
        port: 5173,
        path: "/",
        method: "GET",
        timeout: 1500,
      };
      const req = http.request(options, (res) => {
        resolve(true);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });

  const viteUp = await probeVite();
  if (viteUp) {
    createWindow("http://localhost:5173");
    return;
  }

  // In production/fallback, serve the built files from dist using express
  const express = require("express");
  const expressApp = express();
  const distPath = path.join(__dirname, "..", "dist");

  expressApp.use(require("compression")());
  expressApp.use(express.static(distPath));

  // Catch-all SPA fallback (Express 5 + path-to-regexp v6: use '*' not '/*')
  expressApp.get("/", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const listener = expressApp.listen(0, () => {
    const port = listener.address().port;
    const url = `http://127.0.0.1:${port}`;
    createWindow(url);
  });

  server = listener;
}

// Handle form submission from renderer
ipcMain.handle("submit-entry", async (event, data) => {
  // For now just show a dialog and return the same data
  await dialog.showMessageBox({
    type: "info",
    title: "Entry Submitted",
    message: `First: ${data.first}\nMiddle: ${data.middle}\nLast: ${data.last}`,
  });
  return data;
});

ipcMain.handle("open-add-new-notes-window", async (event) => {
  const route = "/add-entry";

  try {
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    const modal = new BrowserWindow({
      width: 480,
      height: 420,
      resizable: false,
      parent,
      modal: false,
      show: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
      },
    });

    let target;
    // If mainWindowUrl is an http dev server, load dev route
    if (mainWindowUrl && mainWindowUrl.startsWith("http")) {
      const base = mainWindowUrl.replace(/\/$/, "");
      const routeFragment = route.startsWith("/") ? route : `/${route}`;
      target = `${base}/#${routeFragment}`;
    } else {
      // production: load built index.html and use hash routing to reach the route
      const indexPath = path.join(__dirname, "..", "dist", "index.html");
      target = `file://${indexPath}#${route}`;
    }

    modal.loadURL(target);
    // open devtools for modal if in dev
    if (target.includes("localhost") || target.includes("127.0.0.1")) {
      modal.webContents.openDevTools({ mode: "right" });
    }

    // forward console messages from modal to main process for easier debugging
    modal.webContents.on(
      "console-message",
      (e, level, message, line, sourceId) => {
        console.log("[modal]", message, sourceId, line);
      }
    );

    // Ensure HashRouter picks up the route: set location.hash after load
    const routeFragment = route.startsWith("/") ? route : `/${route}`;
    modal.webContents.on("did-finish-load", () => {
      try {
        modal.webContents.executeJavaScript(
          `window.location.hash = '${routeFragment}'`
        );
      } catch (err) {
        // ignore
      }
    });

    modal.on("closed", () => {
      // noop
    });
  } catch (err) {
    console.error("Failed to open Add Entry modal", err);
  } // Logic to open the "Add New Notes" window
});
