import { app, BrowserWindow, shell, Tray, Menu, globalShortcut } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuid } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let newNoteWindow: BrowserWindow | null = null;
let isQuitting = false;

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


function getTrayIconPath() {
  // Dev: public/favicon.ico. Prod: dist/favicon.ico (public gets copied to dist by Vite)
  const devPath = path.join(__dirname, '..', 'public', 'favicon.ico');
  const prodPath = path.join(__dirname, '..', 'dist', 'favicon.ico');
  return app.isPackaged ? prodPath : devPath;
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
  if (!newNoteWindow) {
    newNoteWindow = new BrowserWindow({
      width: 900,
      height: 700,
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

    newNoteWindow.on('close', (e) => {
      e.preventDefault();
      newNoteWindow?.hide();
    });

    // Always reload /viewer/new when triggered
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      newNoteWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/viewer/new`);
      newNoteWindow.webContents.openDevTools({ mode: 'right' });
    } else {
      const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
      newNoteWindow.loadFile(indexPath, { search: '?route=/viewer/new' });
    }
  }

  newNoteWindow.show();
  newNoteWindow.focus();
  // Notify renderer that Add Note window is shown
  newNoteWindow.webContents.send('viewer-window-shown');

  const uid = uuid();

  console.log('uuid', uid);


  newNoteWindow.webContents.executeJavaScript(`window.location.hash = '${uid}'`);
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
    // if (!mainWindow) createWindow();
    // mainWindow?.isVisible() ? mainWindow?.hide() : mainWindow?.show();
    openAddNoteWindow();
  });
  tray.on('double-click', () => {
    if (!mainWindow) createWindow();
    mainWindow?.isVisible() ? mainWindow?.hide() : mainWindow?.show();
  });
  return tray;
}


