const fs = require('fs');
const path = require('path');
const Logger = require('./logger');
const { secureExec } = require('./securexec');

const logger = new Logger('builder');

async function buildExecutable(appDir, appName, platform, iconPath, options) {
  logger.info(`Building executable for ${platform}...`);
  
  try {
    const installOptions = {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    };
    
    secureExec('npm install --save-dev electron-packager electron', installOptions);
    
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
    
    secureExec(packageCommand, installOptions);
    
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

async function buildSetup(appDir, platform, arch) {
  logger.info(`Building setup for ${platform}${arch ? ` (${arch})` : ''}...`);
  
  try {
    const installOptions = {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    };
    
    secureExec('npm install --save-dev electron-builder', installOptions);
    
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
    secureExec(builderCommand, installOptions);
    
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

module.exports = {
    buildExecutable,
    buildSetup
}