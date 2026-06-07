const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let pythonProcess = null;
let authenticatedRole = null;  // Track current role in main process
let aiStarting = false;        // Prevent concurrent start attempts
let aiCrashCount = 0;          // Track crashes for recovery limiting
const MAX_AUTO_RESTARTS = 2;
let aiLogHistory = [];         // In-memory buffer for AI process logs

function appendToLogHistory(type, text) {
  aiLogHistory.push({ type, text });
  if (aiLogHistory.length > 200) {
    aiLogHistory.shift();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: "Merge Admin Desktop",
    icon: path.join(__dirname, isDev ? 'public' : 'dist', 'log.ico'),
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f1f5f9', // Changed from white to match light mode app backdrop
      symbolColor: '#105934',
      height: 35
    }
  });

  // In development, load from Vite dev server and open DevTools
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Global Zoom Shortcuts Fix
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key === '=') {
      mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5);
      event.preventDefault();
    }
    if (input.control && input.key === '-') {
      mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5);
      event.preventDefault();
    }
    if (input.control && input.key === '0') {
      mainWindow.webContents.setZoomLevel(0);
      event.preventDefault();
    }
  });

  // ── Auto-Grant Camera Permissions ──
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[ELECTRON] Auto-granting permission request for: ${permission}`);
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── AI Process Management ───────────────────────────────────────

function startAI(organizationId) {
  if (pythonProcess || aiStarting) {
    console.log('[ELECTRON] AI already running or starting, skipping.');
    return Promise.resolve(true);
  }

  aiLogHistory = []; // Reset log history buffer for new run
  aiStarting = true;

  const isPackaged = app.isPackaged;
  const aiPath = isPackaged
    ? path.join(process.resourcesPath, 'AI', 'main.py')
    : path.resolve(__dirname, '..', 'Merge_AI', 'main.py');

  const fs = require('fs');
  if (!fs.existsSync(aiPath)) {
    console.error(`[ELECTRON] ❌ AI script NOT FOUND at: ${aiPath}`);
    console.error('[ELECTRON] Check extraResources config in package.json');
    aiStarting = false;
    return Promise.resolve(false);
  }

  console.log(`[ELECTRON] ✅ AI script found at: ${aiPath}`);
  console.log(`[ELECTRON] Starting AI Service...`);
  console.log(`[ELECTRON] ⏳ Please wait ~45s for AI models (DeepFace/TensorFlow) to load...`);

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  pythonProcess = spawn(pythonCmd, [aiPath], {
    cwd: path.dirname(aiPath),
    env: { 
      ...process.env, 
      PYTHONUNBUFFERED: '1',
      ORGANIZATION_ID: organizationId ? String(organizationId) : (process.env.ORGANIZATION_ID || '')
    }
  });

  const cleanAnsi = (str) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  pythonProcess.stdout.on('data', (data) => {
    const raw = data.toString();
    console.log(`[AI-STDOUT] ${raw.trim()}`);
    const cleaned = cleanAnsi(raw);
    cleaned.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        notifyRenderer('ai-log', { type: 'stdout', text: trimmed });
        appendToLogHistory('stdout', trimmed);
      }
    });
  });

  pythonProcess.stderr.on('data', (data) => {
    const raw = data.toString();
    console.error(`[AI-STDERR] ${raw.trim()}`);
    const cleaned = cleanAnsi(raw);
    cleaned.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        notifyRenderer('ai-log', { type: 'stderr', text: trimmed });
        appendToLogHistory('stderr', trimmed);
      }
    });
  });

  pythonProcess.on('error', (err) => {
    console.error('[ELECTRON] ❌ Failed to start AI process:', err.message);
    console.error('[ELECTRON] Make sure Python is installed and in your PATH');
    pythonProcess = null;
    aiStarting = false;
    notifyRenderer('ai-status-changed', { online: false, displayStatus: 'AI Failed to Start', isError: true });
  });

  pythonProcess.on('close', (code) => {
    const wasRunning = pythonProcess !== null;
    pythonProcess = null;
    aiStarting = false;

    if (code === 0) {
      console.log('[ELECTRON] AI process exited cleanly.');
      notifyRenderer('ai-status-changed', { online: false, displayStatus: 'AI Service Stopped', isError: false });
    } else if (wasRunning && authenticatedRole === 'admin') {
      // ── AI Crash Detection & Recovery (Refinement #9) ──
      console.error(`[ELECTRON] ⚠️ AI process crashed with code ${code}.`);
      aiCrashCount++;
      notifyRenderer('ai-process-crash', { exitCode: code, crashCount: aiCrashCount });

      if (aiCrashCount <= MAX_AUTO_RESTARTS) {
        console.log(`[ELECTRON] 🔄 Auto-restarting AI (attempt ${aiCrashCount}/${MAX_AUTO_RESTARTS})...`);
        setTimeout(() => {
          if (authenticatedRole === 'admin') {
            startAI();
          }
        }, 3000);
      } else {
        console.error('[ELECTRON] ❌ Max auto-restart attempts reached. Manual restart required.');
        notifyRenderer('ai-status-changed', {
          online: false,
          displayStatus: 'AI Crashed — Manual Restart Required',
          isError: true
        });
      }
    }
  });

  aiStarting = false;
  return Promise.resolve(true);
}

function killAI() {
  return new Promise((resolve) => {
    if (!pythonProcess) {
      console.log('[ELECTRON] No AI process to kill.');
      resolve(true);
      return;
    }

    console.log('[ELECTRON] 🛑 Terminating AI Service...');
    const pid = pythonProcess.pid;

    // Set a safety timeout — if process doesn't die in 8s, force resolve
    const safetyTimeout = setTimeout(() => {
      console.warn('[ELECTRON] ⚠️ AI shutdown timed out after 8s, forcing cleanup.');
      pythonProcess = null;
      resolve(true);
    }, 8000);

    pythonProcess.on('close', () => {
      clearTimeout(safetyTimeout);
      pythonProcess = null;
      aiCrashCount = 0;
      console.log('[ELECTRON] ✅ AI process terminated cleanly.');
      resolve(true);
    });

    if (process.platform === 'win32') {
      // Use /T to kill the process tree (children included)
      spawn('taskkill', ['/pid', pid.toString(), '/f', '/t']);
    } else {
      pythonProcess.kill('SIGKILL');
    }
  });
}

function notifyRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ── IPC Handlers ────────────────────────────────────────────────

ipcMain.handle('get-ai-logs', async () => {
  return aiLogHistory;
});

// Refinement #2: Role verification in main process before starting AI
ipcMain.handle('start-ai-service', async (_event, sessionInfo) => {
  // NEVER trust renderer blindly — verify role stored in main process
  if (authenticatedRole !== 'admin') {
    console.warn('[ELECTRON] ⛔ Non-admin tried to start AI service. Denied.');
    return { success: false, reason: 'Only admin can start AI.' };
  }

  aiCrashCount = 0; // Reset crash counter on intentional start
  const started = await startAI(sessionInfo?.organization_id);
  return { success: started };
});

// Refinement #3: AI shutdown returns promise — logout waits for completion
ipcMain.handle('stop-ai-service', async () => {
  await killAI();
  authenticatedRole = null;
  return { success: true };
});

// Track authenticated role in main process
ipcMain.on('set-auth-role', (_event, role) => {
  console.log(`[ELECTRON] Auth role updated: ${role || 'logged-out'}`);
  authenticatedRole = role;
});

// ── App Lifecycle ───────────────────────────────────────────────

app.on('ready', () => {
  createWindow();
  // AI is NOT started here — it starts only when admin logs in via IPC

  if (!isDev) {
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Update Events — notify the React UI instead of plain OS dialogs
autoUpdater.on('checking-for-update', () => {
  console.log('[UPDATER] Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log(`[UPDATER] Update available: v${info.version}`);
  notifyRenderer('app-update-available', { version: info.version });
});

autoUpdater.on('update-not-available', () => {
  console.log('[UPDATER] App is up to date.');
});

autoUpdater.on('download-progress', (progress) => {
  notifyRenderer('app-update-progress', { percent: Math.floor(progress.percent) });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log(`[UPDATER] Update v${info.version} downloaded — ready to install.`);
  notifyRenderer('app-update-ready', { version: info.version });
});

autoUpdater.on('error', (err) => {
  console.error('[UPDATER] Update error:', err.message);
  notifyRenderer('app-update-error', { message: err.message });
});

// IPC: renderer triggers restart to apply update
ipcMain.on('install-update-now', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('set-native-theme', (_event, theme) => {
  if (!mainWindow) return;
  const isDark = theme === 'dark';
  mainWindow.setTitleBarOverlay({
    color: isDark ? '#020617' : '#f1f5f9', // Matches the .app-container backdrop
    symbolColor: isDark ? '#f8fafc' : '#105934',
    height: 35
  });
});

app.on('window-all-closed', async () => {
  await killAI();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
