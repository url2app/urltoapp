const fs = require('fs');
const path = require('path');
const os = require('os');
const Logger = require('./logger');
const { secureExec } = require('./securexec');

const logger = new Logger('osIntegration');

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

    secureExec(`powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
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

module.exports = {
  addAppToOS,
  removeAppFromOS
};