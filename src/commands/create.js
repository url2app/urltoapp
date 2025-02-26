const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { normalizeUrl, getDomainName } = require('../utils/url');
const { getFavicon } = require('../utils/favicon');
const { APPS_DIR, readDB, writeDB } = require('../utils/config');
const Logger = require('../utils/logger');
const os = require('os');

const logger = new Logger('create');

function createWindowsShortcut(appInfo) {
  try {
    const { domain, appDir, iconPath } = appInfo;
    const startMenuPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'U2A Apps');

    if (!fs.existsSync(startMenuPath)) {
      fs.mkdirSync(startMenuPath, { recursive: true });
    }

    const shortcutPath = path.join(startMenuPath, `${domain}.lnk`);
    const targetPath = path.join(appDir, 'node_modules', '.bin', 'electron.cmd');
    const workingDir = appDir;

    const psScript = `
      $WshShell = New-Object -comObject WScript.Shell
      $Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
      $Shortcut.TargetPath = "${targetPath.replace(/\\/g, '\\\\')}"
      $Shortcut.Arguments = "."
      $Shortcut.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
      $Shortcut.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"
      $Shortcut.Description = "Application Web pour ${domain}"
      $Shortcut.Save()
    `;

    const tempScriptPath = path.join(os.tmpdir(), `create_shortcut_${domain}.ps1`);
    fs.writeFileSync(tempScriptPath, psScript);

    execSync(`powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    fs.unlinkSync(tempScriptPath);

    logger.success(`Shortcut created in the Start Menu: ${shortcutPath}`);
    return shortcutPath;
  } catch (error) {
    logger.error(`Error while creating the Windows shortcut`, error);
    return null;
  }
}

function createLinuxDesktopEntry(appInfo) {
  try {
    const { domain, url, appDir, iconPath } = appInfo;
    const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');

    if (!fs.existsSync(appsDir)) {
      fs.mkdirSync(appsDir, { recursive: true });
    }

    const desktopEntry = `[Desktop Entry]
Type=Application
Name=${domain}
Exec=${path.join(appDir, 'node_modules', '.bin', 'electron')} ${path.join(appDir, 'main.js')}
Icon=${iconPath}
Comment=Application Web pour ${url}
Categories=Network;WebBrowser;
Terminal=false
`;

    const desktopFilePath = path.join(appsDir, `u2a-${domain}.desktop`);
    fs.writeFileSync(desktopFilePath, desktopEntry);

    fs.chmodSync(desktopFilePath, '755');

    logger.success(`Desktop entry created for Linux: ${desktopFilePath}`);
    return desktopFilePath;
  } catch (error) {
    logger.error(`Error while creating the Linux desktop entry`, error);
    return null;
  }
}

function createMacOSApp(appInfo) {
  try {
    const { domain, appDir, iconPath } = appInfo;
    const appsDir = path.join(os.homedir(), 'Applications', 'U2A Apps');

    if (!fs.existsSync(appsDir)) {
      fs.mkdirSync(appsDir, { recursive: true });
    }

    const appName = `${domain}.app`;
    const appPath = path.join(appsDir, appName);
    const macOsPath = path.join(appPath, 'Contents', 'MacOS');
    const resourcesPath = path.join(appPath, 'Contents', 'Resources');

    fs.mkdirSync(path.join(appPath, 'Contents', 'MacOS'), { recursive: true });
    fs.mkdirSync(resourcesPath, { recursive: true });

    const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AppRunner</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>CFBundleIdentifier</key>
    <string>com.u2a.${domain}</string>
    <key>CFBundleName</key>
    <string>${domain}</string>
    <key>CFBundleDisplayName</key>
    <string>${domain}</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
</dict>
</plist>`;

    fs.writeFileSync(path.join(appPath, 'Contents', 'Info.plist'), infoPlist);

    const shellScript = `#!/bin/bash
cd "${appDir}"
"${path.join(appDir, 'node_modules', '.bin', 'electron')}" "${path.join(appDir, 'main.js')}"`;

    const shellScriptPath = path.join(macOsPath, 'AppRunner');
    fs.writeFileSync(shellScriptPath, shellScript);
    fs.chmodSync(shellScriptPath, '755');

    fs.copyFileSync(iconPath, path.join(resourcesPath, 'icon.icns'));

    logger.success(`macOS application created: ${appPath}`);
    return appPath;
  } catch (error) {
    logger.error(`Error while creating the macOS application`, error);
    return null;
  }
}

function addAppToOS(domain, url, appDir, iconPath) {
  const appInfo = { domain, url, appDir, iconPath };
  let desktopPath = null;

  if (process.platform === 'win32') {
    desktopPath = createWindowsShortcut(appInfo);
  } else if (process.platform === 'darwin') {
    desktopPath = createMacOSApp(appInfo);
  } else if (process.platform === 'linux') {
    desktopPath = createLinuxDesktopEntry(appInfo);
  } else {
    logger.warn(`Desktop integration not supported for platform ${process.platform}`);
  }

  return desktopPath;
}

function removeAppFromOS(domain) {
  try {
    if (process.platform === 'win32') {
      const startMenuPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'U2A Apps', `${domain}.lnk`);
      if (fs.existsSync(startMenuPath)) {
        fs.unlinkSync(startMenuPath);
        logger.success(`Shortcut removed from the Start Menu: ${startMenuPath}`);
      }
    } else if (process.platform === 'darwin') {
      const appPath = path.join(os.homedir(), 'Applications', 'U2A Apps', `${domain}.app`);
      if (fs.existsSync(appPath)) {
        fs.rmSync(appPath, { recursive: true, force: true });
        logger.success(`macOS application removed: ${appPath}`);
      }
    } else if (process.platform === 'linux') {
      const desktopFilePath = path.join(os.homedir(), '.local', 'share', 'applications', `u2a-${domain}.desktop`);
      if (fs.existsSync(desktopFilePath)) {
        fs.unlinkSync(desktopFilePath);
        logger.success(`Linux desktop entry removed: ${desktopFilePath}`);
      }
    }
  } catch (error) {
    logger.error(`Error while removing desktop integration for ${domain}`, error);
  }
}

function generateMainJs(domain, url, iconPath) {
  return `
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_DOMAIN = "${domain}";
const APP_URL = "${url}";
const APP_ICON_PATH = "${iconPath.replace(/\\/g, '\\\\')}";

let mainWindow;
let splashWindow;
let loadErrors = [];

function logAppInfo() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  let packageInfo = {};

  try {
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    packageInfo = JSON.parse(packageJsonContent);
  } catch (error) {
    console.error('Error reading package.json:', error.message);
  }

  console.log('\\n--------------------------------');
  console.log('  APPLICATION INFORMATION');
  console.log('--------------------------------');
  console.log(\`Application: \${APP_DOMAIN}\`);
  console.log(\`URL: \${APP_URL}\`);
  console.log(\`Started at: \${new Date().toLocaleString()}\`);
  console.log(\`App directory: \${__dirname}\`);
  console.log(\`Icon path: \${APP_ICON_PATH}\`);

  console.log('\\n  PACKAGE INFO:');
  console.log(\`  - Name: \${packageInfo.name || 'N/A'}\`);
  console.log(\`  - Version: \${packageInfo.version || 'N/A'}\`);
  console.log(\`  - Description: \${packageInfo.description || 'N/A'}\`);
  console.log(\`  - Electron version: \${packageInfo.dependencies?.electron || 'N/A'}\`);

  if (packageInfo.build) {
    console.log('\\n  BUILD CONFIG:');
    console.log(\`  - App ID: \${packageInfo.build.appId || 'N/A'}\`);
    console.log(\`  - Product Name: \${packageInfo.build.productName || 'N/A'}\`);
  }

  console.log('--------------------------------\\n');
}

function updateSplashScreen(message, isError = false) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(\`
  try {
    document.getElementById('loading-text').innerText = "\${message.replace(/"/g, '\\"')}";
  } catch (e) {
    console.error('Failed to update splash screen:', e);
  }
\`).catch(err => console.error('Failed to update splash screen:', err));

  }
}

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 550,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: APP_ICON_PATH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const splashHtml = \`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none';">
    <title>Loading...</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: var(--bg-primary, #0f172a);
        color: var(--text-primary, #f8fafc);
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0px 4px 20px rgba(0, 0, 0, 0.2);
      }

      .container {
        text-align: center;
        width: 90%;
        max-width: 500px;
      }

      .domain {
        font-size: 24px;
        margin-bottom: 20px;
        color: var(--primary, #2563eb);
      }

      .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid rgba(37, 99, 235, 0.2);
        border-radius: 50%;
        border-top-color: var(--primary, #2563eb);
        animation: spin 1s ease-in-out infinite;
        margin: 0 auto 20px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .loading-text {
        font-size: 16px;
        color: var(--text-secondary, #cbd5e1);
        margin-top: 15px;
      }

      .loading-text.error {
        color: var(--danger, #ef4444);
        font-weight: bold;
      }

      .progress-bar {
        width: 100%;
        height: 4px;
        background-color: var(--bg-secondary, #1e293b);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 15px;
      }

      .progress {
        height: 100%;
        width: 0%;
        background-color: var(--primary, #2563eb);
        animation: progress 3s ease-in-out infinite;
      }

      @keyframes progress {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }

      #errors-container {
        display: none;
        margin-top: 20px;
        background-color: rgba(239, 68, 68, 0.1);
        border-left: 3px solid var(--danger, #ef4444);
        padding: 10px;
        border-radius: 4px;
        text-align: left;
        max-height: 150px;
        overflow-y: auto;
        width: 100%;
      }

      #errors-list {
        margin: 0;
        padding-left: 20px;
        color: var(--danger, #ef4444);
        font-size: 14px;
      }

      #errors-list li {
        margin-bottom: 5px;
      }

      .retry-button {
        background-color: var(--primary, #2563eb);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        margin-top: 15px;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.2s;
        display: none;
      }

      .retry-button:hover {
        background-color: var(--primary-dark, #1d4ed8);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="domain">\${APP_DOMAIN}</div>
      <div class="spinner"></div>
      <div id="loading-text" class="loading-text">Loading...</div>
      <div class="progress-bar">
        <div class="progress"></div>
      </div>
      <div id="errors-container">
        <h3 style="margin-top: 0; color: var(--danger, #ef4444);">Errors detected:</h3>
        <ul id="errors-list"></ul>
      </div>
      <button id="retry-button" class="retry-button" onclick="window.location.reload()">Retry</button>
    </div>
    <script>
      window.showRetryButton = function() {
        document.getElementById('retry-button').style.display = 'inline-block';
        document.querySelector('.spinner').style.animationPlayState = 'paused';
        document.querySelector('.progress').style.animationPlayState = 'paused';
      }
    </script>
  </body>
  </html>
  \`;

  const splashPath = path.join(app.getPath('temp'), \`\${APP_DOMAIN}-splash.html\`);
  fs.writeFileSync(splashPath, splashHtml);

  splashWindow.loadFile(splashPath);
  splashWindow.center();
}

function createWindow() {
  logAppInfo();

  app.setAppUserModelId(APP_DOMAIN);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: APP_DOMAIN,
    icon: APP_ICON_PATH,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    const errorMessage = \`Load error (\${errorCode}): \${errorDescription}\`;
    loadErrors.push(errorMessage);

    updateSplashScreen(errorMessage, true);

    if (isMainFrame) {
      splashWindow.webContents.executeJavaScript('window.showRetryButton()').catch(err => {
        console.error('Failed to show retry button:', err);
      });
    }
  });

  mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    event.preventDefault();
    const errorMessage = \`Certificate error: \${error}\`;
    console.error(errorMessage);
    loadErrors.push(errorMessage);

    updateSplashScreen(errorMessage, true);
    callback(false);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level === 2) {
      const errorMessage = \`Console: \${message} (line \${line})\`;
      loadErrors.push(errorMessage);

      updateSplashScreen('JavaScript error detected', true);
    }
  });

  mainWindow.webContents.on('did-start-loading', () => {
    updateSplashScreen('Connecting to ' + APP_DOMAIN + '...');
  });

  mainWindow.webContents.on('did-start-navigation', (event, url) => {
    updateSplashScreen('Navigating to ' + new URL(url).host + '...');
  });

  mainWindow.webContents.on('dom-ready', () => {
    updateSplashScreen('DOM ready, loading resources...');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    updateSplashScreen('Loading complete!');

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
    mainWindow.webContents.executeJavaScript(\`
      window.addEventListener('contextmenu', (e) => {
        e.stopPropagation();
      }, true);
    \`);
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
      if (loadErrors.length === 0) {
        splashWindow.close();
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    }
  }, 15000);
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
`;
}

function generatePackageJson(domain, iconPath) {
  const u2aPackagePath = path.resolve(__dirname, '../../package.json');

  let u2aVersion = '1.0.0';
  try {
    const u2aPackageContent = fs.readFileSync(u2aPackagePath, 'utf8');
    const u2aPackage = JSON.parse(u2aPackageContent);
    u2aVersion = u2aPackage.version || u2aVersion;
  } catch (error) {
    logger.error('Error while fetching u2a package.json', error)
  }

  return {
    name: `u2a-${domain}`,
    version: u2aVersion,
    description: `Web app for ${domain}`,
    main: 'main.js',
    scripts: {
      start: 'electron .'
    },
    dependencies: {
      electron: '^22.0.0'
    },
    build: {
      appId: `com.u2a.${domain.replace(/\./g, '-')}`,
      productName: domain,
      icon: iconPath
    }
  };
}

async function createApp(url) {
  logger.info(`Creating application for ${url}`);

  try {
    url = await normalizeUrl(url);
    const domain = getDomainName(url);

    const db = readDB();
    if (db.hasOwnProperty(domain)) {
      logger.warn(`Application for ${domain} already exists`);
      return;
    }

    const iconPath = await getFavicon(url);

    const appDir = path.join(APPS_DIR, domain);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
      logger.debug(`Directory created: ${appDir}`);
    }

    const mainJsPath = path.join(appDir, 'main.js');
    const mainJsContent = generateMainJs(domain, url, iconPath);
    fs.writeFileSync(mainJsPath, mainJsContent);
    logger.debug(`main.js file created`);

    const packageJsonPath = path.join(appDir, 'package.json');
    const packageJsonContent = generatePackageJson(domain, iconPath);
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
    logger.debug(`package.json file created`);

    logger.info(`Installing dependencies for ${domain}`);

    const installOptions = {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    };

    const stdout = execSync('npm install --only=prod', installOptions);
    logger.debug(`npm install completed: ${stdout.toString().trim()}`);

    const desktopPath = addAppToOS(domain, url, appDir, iconPath);

    const appData = {
      url,
      created: new Date().toISOString(),
      path: appDir,
      icon: iconPath,
      desktopPath
    };

    db[domain] = appData;
    writeDB(db);

    logger.success(`Application successfully created for ${url}`);
    if (desktopPath) {
      logger.info(`A shortcut has been created in your system's applications directory`);
    }
  } catch (error) {
    logger.error(`Error while creating an application for ${url}`, error);
  }
}

module.exports = {
  createApp,
  removeAppFromOS
};
