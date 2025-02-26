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
        logger.success(`Linux desktop entry removed: ${desktopFilePath}

`);
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

function createWindow() {
  logAppInfo();
  
  app.setAppUserModelId(APP_DOMAIN);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: APP_DOMAIN,
    icon: APP_ICON_PATH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
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
}

if (process.platform === 'win32') {
  app.setAppUserModelId(app.name);
}

app.whenReady().then(createWindow);

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
