import { app, BrowserWindow, shell, Tray, Menu, globalShortcut } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function getTrayIconPath() {
  // Use favicon.ico from public folder for Windows compatibility
  return path.join(__dirname, '..', 'public', 'favicon.ico');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      partition: 'persist:tagnotes',
    },
  });

  // Start minimized to tray: do not auto-show on ready
  // mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools({ mode: 'right' });
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

function openAddNoteWindow() {
  const viewer = new BrowserWindow({
    width: 900,
    height: 700,
    show: true,
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      partition: 'persist:tagnotes',
    },
  });
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    viewer.loadURL(`${process.env.VITE_DEV_SERVER_URL}/viewer/new`);
    // viewer.webContents.openDevTools({ mode: 'right' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    // Use query param for BrowserRouter compatibility
    viewer.loadFile(indexPath, { search: '?route=/viewer/new' });
  }
}

function createTray() {
  if (tray) return tray;
  const iconPath = getTrayIconPath();
  tray = new Tray(iconPath);
  tray.setToolTip('TagNotes');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'TagNotes',
      click: () => {
        if (!mainWindow) createWindow();
        mainWindow?.show();
      },
    },
    {
      label: 'Add Note',
      click: openAddNoteWindow
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


app.whenReady().then(() => {
  createTray();
  createWindow();
  // Register global shortcut CTRL+ALT+N
  globalShortcut.register('Control+Alt+N', () => {
    openAddNoteWindow();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Keep the app running in tray even when windows are closed
  if (process.platform === 'darwin') {
    // on macOS typical behavior is to keep app running; do nothing
  }
});
