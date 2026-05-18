const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let pythonProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    title: "Merge Admin Desktop",
    icon: path.join(__dirname, isDev ? 'public' : 'dist', 'log.ico'),
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startAI() {
  const isPackaged = app.isPackaged;
  const aiPath = isPackaged 
    ? path.join(process.resourcesPath, 'AI', 'main.py')
    : path.resolve(__dirname, '..', 'Merge_AI', 'main.py');

  const fs = require('fs');
  if (!fs.existsSync(aiPath)) {
    console.error(`[ELECTRON] ❌ AI script NOT FOUND at: ${aiPath}`);
    console.error('[ELECTRON] Check extraResources config in package.json');
    return;
  }

  console.log(`[ELECTRON] ✅ AI script found at: ${aiPath}`);
  console.log(`[ELECTRON] Starting AI Service...`);
  console.log(`[ELECTRON] ⏳ Please wait ~45s for AI models (DeepFace/TensorFlow) to load...`);
  
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  pythonProcess = spawn(pythonCmd, [aiPath], {
    cwd: path.dirname(aiPath),
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[AI-STDOUT] ${data.toString().trim()}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[AI-STDERR] ${data.toString().trim()}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('[ELECTRON] ❌ Failed to start AI process:', err.message);
    console.error('[ELECTRON] Make sure Python is installed and in your PATH');
  });

  pythonProcess.on('close', (code) => {
    if (code === 0) {
      console.log('[ELECTRON] AI process exited cleanly.');
    } else {
      console.error(`[ELECTRON] ⚠️ AI process exited with code ${code}. It may have crashed.`);
    }
  });
}

app.on('ready', () => {
  createWindow();
  startAI();
  
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Update Events
autoUpdater.on('update-available', () => {
  console.log('Update available.');
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version of Merge Admin is ready. Restart now to update?',
    buttons: ['Restart', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    console.log('[ELECTRON] 🛑 Terminating AI Service...');
    if (process.platform === 'win32') {
      // Use /T to kill the process tree (children included)
      spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t']).on('exit', () => {
        app.quit();
      });
    } else {
      pythonProcess.kill('SIGKILL');
      app.quit();
    }
  } else {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
