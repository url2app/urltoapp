const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { normalizeUrl, getDomainName } = require('../utils/url');
const { getFavicon, processFavicon } = require('../utils/favicon');
const { APPS_DIR, readDB, writeDB } = require('../utils/config');
const Logger = require('../utils/logger');
const os = require('os');
const { sanitizeInput } = require('../utils/sanitize');

const logger = new Logger('create');


function createWindowsShortcut(appInfo) {
  try {
    const { appName, appDir, iconPath } = appInfo;
    const startMenuPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'U2A Apps');

    if (!fs.existsSync(startMenuPath)) {
      fs.mkdirSync(startMenuPath, { recursive: true });
    }

    const shortcutPath = path.join(startMenuPath, `${appName}.lnk`);
    const targetPath = path.join(appDir, 'node_modules', '.bin', 'electron.cmd');
    const workingDir = appDir;

    const psScript = `
      $WshShell = New-Object -comObject WScript.Shell
      $Shortcut = $WshShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
      $Shortcut.TargetPath = "${targetPath.replace(/\\/g, '\\\\')}"
      $Shortcut.Arguments = "."
      $Shortcut.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
      $Shortcut.IconLocation = "${iconPath.replace(/\\/g, '\\\\')}"
      $Shortcut.Description = "Application Web pour ${appName}"
      $Shortcut.Save()
    `;

    const tempScriptPath = path.join(os.tmpdir(), `create_shortcut_${appName}.ps1`);
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
    const { appName, url, appDir, iconPath } = appInfo;
    const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');

    if (!fs.existsSync(appsDir)) {
      fs.mkdirSync(appsDir, { recursive: true });
    }

    const desktopEntry = `[Desktop Entry]
Type=Application
Name=${appName}
Exec=${path.join(appDir, 'node_modules', '.bin', 'electron')} ${path.join(appDir, 'main.js')}
Icon=${iconPath}
Comment=Application Web pour ${url}
Categories=Network;WebBrowser;
Terminal=false
`;

    const desktopFilePath = path.join(appsDir, `u2a-${appName}.desktop`);
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
    const { appName, appDir, iconPath } = appInfo;
    const appsDir = path.join(os.homedir(), 'Applications', 'U2A Apps');

    if (!fs.existsSync(appsDir)) {
      fs.mkdirSync(appsDir, { recursive: true });
    }

    const appPath = path.join(appsDir, `${appName}.app`);
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
    <string>com.u2a.${appName.replace(/\s+/g, '-')}</string>
    <key>CFBundleName</key>
    <string>${appName}</string>
    <key>CFBundleDisplayName</key>
    <string>${appName}</string>
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

function addAppToOS(appName, url, appDir, iconPath) {
  const appInfo = { appName, url, appDir, iconPath };
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

function removeAppFromOS(appName) {
  try {
    if (process.platform === 'win32') {
      const startMenuPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'U2A Apps', `${appName}.lnk`);
      if (fs.existsSync(startMenuPath)) {
        fs.unlinkSync(startMenuPath);
        logger.success(`Shortcut removed from the Start Menu: ${startMenuPath}`);
      }
    } else if (process.platform === 'darwin') {
      const appPath = path.join(os.homedir(), 'Applications', 'U2A Apps', `${appName}.app`);
      if (fs.existsSync(appPath)) {
        fs.rmSync(appPath, { recursive: true, force: true });
        logger.success(`macOS application removed: ${appPath}`);
      }
    } else if (process.platform === 'linux') {
      const desktopFilePath = path.join(os.homedir(), '.local', 'share', 'applications', `u2a-${appName}.desktop`);
      if (fs.existsSync(desktopFilePath)) {
        fs.unlinkSync(desktopFilePath);
        logger.success(`Linux desktop entry removed: ${desktopFilePath}`);
      }
    }
  } catch (error) {
    logger.error(`Error while removing desktop integration for ${appName}`, error);
  }
}

function generateMainJs(appName, url, iconPath, options = {}) {
  const width = options.width || 1200;
  const height = options.height || 800;

  return `
const { app, BrowserWindow, Menu, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_NAME = "${appName}";
const APP_URL = "${url}";
const APP_ICON_PATH = "${iconPath.replace(/\\/g, '\\\\')}";
const WINDOW_WIDTH = ${width};
const WINDOW_HEIGHT = ${height};

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

  console.log('\\n--------------------------------');
  console.log('  APPLICATION INFORMATION');
  console.log('--------------------------------');
  console.log(\`Application: \${APP_NAME}\`);
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
  
  const splashHtml = \`
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
        background-color: \${bgColor};
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px \${shadowColor};
        padding: 3px;
      }
      
      .loader-bg {
        width: 100%;
        height: 100%;
        background-color: \${loaderBgColor};
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
        background-color: \${loaderColor};
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
  \`;

  const splashPath = path.join(app.getPath('temp'), \`\${APP_NAME}-splash.html\`);
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
`;
}

async function generatePackageJson(appName, iconPath, isExecutable = false, createSetup = false) {
  const u2aPackagePath = path.resolve(__dirname, '../../package.json');

  let u2aVersion = '1.0.0';
  try {
    const u2aPackageContent = fs.readFileSync(u2aPackagePath, 'utf8');
    const u2aPackage = JSON.parse(u2aPackageContent);
    u2aVersion = u2aPackage.version || u2aVersion;
  } catch (error) {
    logger.error('Error while fetching u2a package.json', error);
  }

  if (createSetup) {
    iconPath = await processFavicon(iconPath);
  }

  const packageJson = {
    name: `u2a-${appName.replace(/\s+/g, '-')}`,
    version: u2aVersion,
    description: `Web app for ${appName}`,
    main: 'main.js',
    author: `${appName}`,
    scripts: {
      start: 'electron .'
    },
    dependencies: {
      electron: '^22.0.0'
    },
    build: {
      appId: `com.u2a.${appName.replace(/\s+/g, '-')}`,
      productName: appName,
      icon: iconPath
    }
  };

  if (isExecutable) {
    packageJson.devDependencies = {
      "electron-packager": "^17.1.1",
      "electron-builder": "^24.6.3",
      "electron": "^22.0.0"
    };

    packageJson.dependencies = {};
    
    packageJson.scripts.package = "electron-packager . --overwrite --asar";
    packageJson.scripts.setup = "electron-builder";
  }

  if (isExecutable && createSetup) {
    packageJson.build = {
      ...packageJson.build,
      appId: `com.u2a.${appName.replace(/\s+/g, '-')}`,
      productName: appName,
      directories: {
        output: "installer"
      },
      files: [
        "**/*",
        "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        "!**/node_modules/*.d.ts",
        "!**/node_modules/.bin",
        "!**/.{idea,git,cache,build,dist}",
        "!dist/**/*",
        "!installer/**/*"
      ],
      win: {
        target: "nsis",
        icon: iconPath
      },
      mac: {
        target: "dmg"
      },
      linux: {
        target: "AppImage",
        icon: iconPath
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true
      }
    };
  }

  return packageJson;
}

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderRecursiveSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

async function buildExecutable(appDir, appName, platform, iconPath, options) {
  logger.info(`Building executable for ${platform}...`);
  
  try {
    const installOptions = {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    };
    
    execSync('npm install --save-dev electron-packager electron', installOptions);
    
    let platformFlag = '';
    let archFlag = `--arch=${options.arch || 'x64'}`;
    let iconOption = '';
    
    switch(platform) {
      case 'windows':
        platformFlag = '--platform=win32';
        iconOption = iconPath ? `--icon="${iconPath}"` : '';
        break;
      case 'darwin':
        platformFlag = '--platform=darwin';
        if (iconPath && !iconPath.endsWith('.icns')) {
          logger.warn('MacOs Icons are not supported at this time.');
        }
        iconOption = iconPath ? `--icon="${iconPath}"` : '';
        break;
      case 'linux':
        platformFlag = '--platform=linux';
        iconOption = iconPath ? `--icon="${iconPath}"` : '';
        break;
      default:
        platformFlag = `--platform=${process.platform}`;
    }
    
    const packageCommand = `npx electron-packager . "${appName}" ${platformFlag} ${archFlag} --out=dist --overwrite --asar ${iconOption}`;
    
    logger.debug(`Executing: ${packageCommand}`);
    
    execSync(packageCommand, installOptions);
    
    let distPlatform = '';
    switch(platform) {
      case 'windows': distPlatform = 'win32'; break;
      case 'darwin': distPlatform = 'darwin'; break;
      case 'linux': distPlatform = 'linux'; break;
      default: distPlatform = process.platform;
    }
    
    const outputPath = path.join(appDir, 'dist', `${appName}-${distPlatform}-x64`);
    
    if (fs.existsSync(outputPath)) {
      logger.debug(`Executable built successfully at: ${outputPath}`);
      return outputPath;
    } else {
      logger.error(`Failed to find the built executable at: ${outputPath}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error while building executable:`, error);
    return null;
  }
}

function remove(path) {
  try {
    if (fs.existsSync(path)) {
      fs.rmSync(path, { recursive: true, force: true });
      logger.debug(`Dir/file removed: ${path}`);
    }
  } catch (error) {
    logger.error(`Error while removing dir/file ${path}`, error);
  }
}

async function buildSetup(appDir, platform, arch) {
  logger.info(`Building setup for ${platform}${arch ? ` (${arch})` : ''}...`);
  
  try {
    const installOptions = {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    };
    
    execSync('npm install --save-dev electron-builder', installOptions);
    
    let builderArgs = '';
    switch(platform) {
      case 'windows':
        builderArgs = '--win';
        break;
      case 'darwin':
        builderArgs = '--mac';
        break;
      case 'linux':
        builderArgs = '--linux';
        break;
      default:
        builderArgs = '';
    }
    
    if (arch) {
      builderArgs += ` --${arch}`;
    }
    
    const builderCommand = `npx electron-builder ${builderArgs}`;
    logger.debug(`Executing: ${builderCommand}`);
    execSync(builderCommand, installOptions);
    
    const installerPath = path.join(appDir, 'installer');
    if (fs.existsSync(installerPath)) {
      logger.debug(`Setup created at: ${installerPath}`);
      return installerPath;
    } else {
      logger.error(`Failed to find the built installer at: ${installerPath}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error while building setup:`, error);
    return null;
  }
}

async function createApp(url, options) {
  logger.info(`Creating application for ${url}`);

  try {
    url = await normalizeUrl(url);
    const domain = sanitizeInput(getDomainName(url));
    const appName = sanitizeInput(options.name || domain);

    const db = readDB();
    if (db.hasOwnProperty(appName)) {
      logger.warn(`Application for ${appName} already exists`);
      return;
    }

    const iconPath = await getFavicon(url);

    const appDir = path.join(APPS_DIR, appName);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
      logger.debug(`Directory created: ${appDir}`);
    }

    const mainJsPath = path.join(appDir, 'main.js');
    const mainJsContent = generateMainJs(appName, url, iconPath, options);
    fs.writeFileSync(mainJsPath, mainJsContent);
    logger.debug(`main.js file created`);

    const isExecutable = !!options.executable;
    const createSetup = !!options.setup;
    const packageJsonPath = path.join(appDir, 'package.json');
    const packageJsonContent = await generatePackageJson(appName, iconPath, isExecutable, createSetup);
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
    logger.debug(`package.json file created`);

    logger.info(`Installing dependencies for ${appName}`);

    const installOptions = {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    };

    execSync('npm install --only=prod', installOptions);
    logger.debug(`npm install completed`);

    let executablePath = null;
    let desktopPath = null;

    if (isExecutable) {
      const targetPlatform = options.executable === true ? process.platform : options.executable;
      executablePath = await buildExecutable(appDir, appName, targetPlatform, iconPath, options);

      if (options.setup) {
        const setupPath = await buildSetup(appDir, targetPlatform, options.arch);
        if (setupPath) {
          logger.debug(`Setup installer created at: ${setupPath}`);
          
          const currentDir = process.cwd();
          const setupTargetDir = path.join(currentDir, `${appName}-setup`);
          
          if (!fs.existsSync(setupTargetDir)) {
            fs.mkdirSync(setupTargetDir, { recursive: true });
          }
          
          copyFolderRecursiveSync(setupPath, setupTargetDir);
          logger.success(`Setup installer created at: ${setupTargetDir}`);
        }
      }
      
      if (executablePath) {
        logger.debug(`Executable created at: ${executablePath}`);
        
        const currentDir = process.cwd();
        const targetDir = path.join(currentDir, `${appName}-executable`);
        
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        copyFolderRecursiveSync(executablePath, targetDir);
        
        logger.success(`Executable created at: ${targetDir}`);
        
        executablePath = targetDir;
        
        removeAppFromOS(appName);
        remove(appDir);
        if (path.basename(iconPath) !== "favicon.ico") {
          remove(iconPath);
        }
        
        logger.debug(`Temporary application files removed after executable creation`);
        return;
      }
    } else {
      desktopPath = addAppToOS(appName, url, appDir, iconPath);
    }

    const appData = {
      url,
      created: new Date().toISOString(),
      path: appDir,
      icon: iconPath,
      desktopPath,
      executablePath,
      name: options.name,
      width: options.width,
      height: options.height
    };

    db[appName] = appData;
    writeDB(db);

    logger.success(`Application successfully created for ${url}`);
    if (desktopPath) {
      logger.info(`A shortcut has been created in your system's applications directory`);
    }
    if (executablePath) {
      logger.info(`A standalone executable has been created at: ${executablePath}`);
    }
  } catch (error) {
    logger.error(`Error while creating an application for ${url}: ${error}`);
  }
}

module.exports = {
  createApp,
  removeAppFromOS
};