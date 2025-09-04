import { app, BrowserWindow, shell, Tray, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function getTrayIconPath() {
  // Use favicon from Vite public folder in dev, built dist in prod
  const devIcon = path.join(__dirname, '..', 'public', 'favicon.ico');
  const prodIcon = path.join(__dirname, '..', 'dist', 'favicon.ico');
  return isDev ? devIcon : prodIcon;
}

function createTray() {
  if (tray) return tray;
  const iconPath = getTrayIconPath();
  tray = new Tray(iconPath);
  tray.setToolTip('TagNotes');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow?.show();
      },
    },
    {
      label: 'Add Note',
      click: () => {
        // Open a dedicated viewer window for creating a new note
        const viewer = new BrowserWindow({
          width: 900,
          height: 700,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: true,
          },
        });
        if (isDev && process.env.VITE_DEV_SERVER_URL) {
          viewer.loadURL(`${process.env.VITE_DEV_SERVER_URL}/viewer/new`);
          viewer.webContents.openDevTools({ mode: 'detach' });
        } else {
          const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
          // Load index.html and navigate to /viewer/new using hash or query workaround
          viewer.loadFile(indexPath, { hash: '/viewer/new' });
        }
      }
    },
    {
      label: 'Hide',
      click: () => mainWindow?.hide(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (!mainWindow) createWindow();
    mainWindow?.isVisible() ? mainWindow?.hide() : mainWindow?.show();
  });
  tray.on('double-click', () => {
    if (!mainWindow) createWindow();
    mainWindow?.isVisible() ? mainWindow?.hide() : mainWindow?.show();
  });
  return tray;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
  show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
  });

  // Start minimized to tray: do not auto-show on ready
  // mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Hide to tray on minimize/close
  (mainWindow as any).on('minimize', (e: Electron.Event) => {
    e.preventDefault();
    mainWindow?.hide();
  });
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

app.whenReady().then(() => {
  createTray();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  // Keep the app running in tray even when windows are closed
  if (process.platform === 'darwin') {
    // on macOS typical behavior is to keep app running; do nothing
  }
});
