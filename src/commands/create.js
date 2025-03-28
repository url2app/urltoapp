const fs = require('fs');
const path = require('path');
const { normalizeUrl, getDomainName } = require('../utils/url');
const { getFavicon, processFavicon } = require('../utils/favicon');
const { APPS_DIR, readDB, writeDB } = require('../utils/config');
const Logger = require('../utils/logger');
const { sanitizeInput } = require('../utils/sanitize');
const { secureExec } = require('../utils/securexec');
const { createPackageJson, generateMainJs } = require('../utils/appGenerator');
const { addAppToOS, removeAppFromOS } = require('../utils/osIntegration');
const { buildExecutable, buildSetup } = require('../utils/builder');

const logger = new Logger('create');

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

    let iconPath;
    if (options.icon) {
      const iconFilePath = path.resolve(options.icon);
      if (fs.existsSync(iconFilePath) && path.extname(iconFilePath) === '.ico') {
        iconPath = iconFilePath;
        logger.success(`Using ${iconPath} for ${appName}`)
      } else {
        logger.warn(`Provided icon path is not a valid .ico file: ${iconFilePath}`);
      }
    }

    if (!iconPath) {
      iconPath = await getFavicon(url);
    }

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
    const packageJsonContent = await createPackageJson(appName, iconPath, isExecutable, createSetup);
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
    logger.debug(`package.json file created`);

    logger.info(`Installing dependencies for ${appName}`);

    const installOptions = {
      cwd: appDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    };

    secureExec('npm install --only=prod', installOptions);
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