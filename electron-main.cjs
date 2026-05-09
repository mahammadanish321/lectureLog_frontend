const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
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
    title: "LectureLog Admin Desktop",
    icon: path.join(__dirname, 'public', 'favicon.svg')
  });

  // In development, load from Vite dev server
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startAI() {
  console.log('Starting AI Service...');
  
  // Path to the python script (adjust based on your structure)
  // During development, we look at the sibling folder
  const scriptPath = path.resolve(__dirname, '..', 'LectureLog_AI', 'camera_backend.py');
  
  pythonProcess = spawn('python', [scriptPath], {
    stdio: 'inherit',
    shell: true
  });

  pythonProcess.on('error', (err) => {
    console.error('Failed to start AI process:', err);
  });

  pythonProcess.on('close', (code) => {
    console.log(`AI process exited with code ${code}`);
  });
}

app.on('ready', () => {
  createWindow();
  startAI();
});

app.on('window-all-closed', () => {
  // On most platforms, we quit when windows are closed
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
