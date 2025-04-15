const fs = require('fs');
const inquirer = require('inquirer');
const { readDB, writeDB, APPS_DIR } = require('../utils/config');
const Logger = require('../utils/logger');
const { removeAppFromOS } = require('./create');
const path = require('path');
const { sanitizeInput } = require('../utils/sanitize');
const { getDomainName } = require('../utils/url');

const logger = new Logger('remove');

async function processRemoval(appName, useInquirer) {
  try {
    const db = readDB();

    if (!db.hasOwnProperty(appName)) {
      logger.warn(`The application for ${appName} does not exist`);
      return;
    }

    if (useInquirer) {

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to remove the application for ${appName}?`,
          default: false
        }
      ]);

      if (!confirm) {
        logger.info('Operation canceled');
        return;
      }

    }

    const appInfo = db[appName];
    const domain = getDomainName(appInfo.url)
    const appDir = appInfo.path;

    logger.info(`Removing the application ${appName}...`);
    removeAppFromOS(appName);

    const iconPath = path.join(APPS_DIR, `${domain}.ico`);
    if (fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
      logger.success(`Icon for ${appName} removed`);
    }

    const packageName = `u2a-${appName.replace(/\s+/g, '-')}`;
    let appDataPath;

    if (process.platform === 'win32') {
      appDataPath = path.join(process.env.APPDATA, packageName);
    } else if (process.platform === 'darwin') {
      appDataPath = path.join(os.homedir(), 'Library', 'Application Support', packageName);
    } else if (process.platform === 'linux') {
      appDataPath = path.join(os.homedir(), '.config', packageName);
    }

    if (appDataPath && fs.existsSync(appDataPath)) {
      fs.rmSync(appDataPath, { recursive: true, force: true });
      logger.success(`Application data folder removed: ${appDataPath}`);
    }

    fs.rmSync(appDir, { recursive: true, force: true });
    logger.success(`Application files removed: ${appDir}`);

    delete db[appName];
    writeDB(db);

    logger.success(`The application for ${appName} has been successfully removed`);
  } catch (error) {
    logger.error(`Error removing the application ${appName}`, error);
  }
}

async function removeApp(appName, useInquirer = true) {
  const sAppName = sanitizeInput(appName);
  await processRemoval(sAppName, useInquirer);
}

module.exports = {
  removeApp
};
