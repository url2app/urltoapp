const { app, BrowserWindow, Menu, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_NAME = "{APP_NAME}";
const APP_URL = "{APP_URL}";
const APP_ICON_PATH = "{APP_ICON_PATH}";
const WINDOW_WIDTH = {WINDOW_WIDTH};
const WINDOW_HEIGHT = {WINDOW_HEIGHT};

let mainWindow;
let splashWindow;

function logAppInfo() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  let packageInfo = {};

  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    packageInfo = JSON.parse(packageJsonContent);
  } catch (error) {
    console.error('Error reading package.json:', error.message);
  }

  console.log('\n--------------------------------');
  console.log('  APPLICATION INFORMATION');
  console.log('--------------------------------');
  console.log(`Application: ${APP_NAME}`);
  console.log(`URL: ${APP_URL}`);
  console.log(`Started at: ${new Date().toLocaleString()}`);
  console.log(`App directory: ${__dirname}`);
  console.log(`Icon path: ${APP_ICON_PATH}`);

  console.log('\n  PACKAGE INFO:');
  console.log(`  - Name: ${packageInfo.name || 'N/A'}`);
  console.log(`  - Version: ${packageInfo.version || 'N/A'}`);
  console.log(`  - Description: ${packageInfo.description || 'N/A'}`);
  console.log(`  - Electron version: ${packageInfo.dependencies?.electron || 'N/A'}`);

  if (packageInfo.build) {
    console.log('\n  BUILD CONFIG:');
    console.log(`  - App ID: ${packageInfo.build.appId || 'N/A'}`);
    console.log(`  - Product Name: ${packageInfo.build.productName || 'N/A'}`);
  }

  console.log('--------------------------------\n');
}

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 200,
    height: 40,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    icon: APP_ICON_PATH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDarkMode = nativeTheme.shouldUseDarkColors;
  const bgColor = isDarkMode ? '#333333' : '#f5f5f5';
  const loaderBgColor = isDarkMode ? '#555555' : '#e0e0e0';
  const loaderColor = isDarkMode ? '#ffffff' : '#2563eb';
  const shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)';
  
  const splashHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none';">
    <title>Loading</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background-color: transparent;
      }
      
      .container {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .loader-container {
        width: 180px;
        height: 12px;
        background-color: ${bgColor};
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px ${shadowColor};
        padding: 3px;
      }
      
      .loader-bg {
        width: 100%;
        height: 100%;
        background-color: ${loaderBgColor};
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }
      
      .loader {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 30%;
        background-color: ${loaderColor};
        border-radius: 4px;
        animation: loading 1.5s infinite ease-in-out;
      }
      
      @keyframes loading {
        0% {
          left: -30%;
        }
        100% {
          left: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="loader-container">
        <div class="loader-bg">
          <div class="loader"></div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  const splashPath = path.join(app.getPath('temp'), `${APP_NAME}-splash.html`);
  fs.writeFileSync(splashPath, splashHtml);

  splashWindow.loadFile(splashPath);
  
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  splashWindow.setPosition(
    Math.floor(width / 2 - 100),
    Math.floor(height / 2 - 20)
  );
}

function createWindow() {
  logAppInfo();

  app.setAppUserModelId(APP_NAME);

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    title: APP_NAME,
    icon: APP_ICON_PATH,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }

      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 500);
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.on('context-menu', (e, params) => {
    e.preventDefault();
    mainWindow.webContents.executeJavaScript(`
      window.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
      }, true);
    `);
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  const template = [];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  }, 10000);
}

if (process.platform === 'win32') {
  app.setAppUserModelId(app.name);
}

app.whenReady().then(() => {
  createSplashScreen();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});