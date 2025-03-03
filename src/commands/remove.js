const fs = require('fs');
const inquirer = require('inquirer');
const { readDB, writeDB, APPS_DIR } = require('../utils/config');
const Logger = require('../utils/logger');
const { removeAppFromOS } = require('./create');
const path = require('path');
const { sanitizeInput } = require('../utils/sanitize');

const logger = new Logger('remove');

async function processRemoval(appName) {
  try {
    const db = readDB();

    if (!db.hasOwnProperty(appName)) {
      logger.warn(`The application for ${appName} does not exist`);
      return;
    }

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

    const appInfo = db[appName];
    const appDir = appInfo.path;

    removeAppFromOS(appName);
    logger.info(`Removing the application ${appName}...`);

    const iconPath = path.join(APPS_DIR, `${appName}.ico`);
    if (fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
      logger.success(`Icon for ${appName} removed`);
    }

    fs.rmSync(appDir, { recursive: true, force: true });
    delete db[appName];
    writeDB(db);

    logger.success(`The application for ${appName} has been successfully removed`);
  } catch (error) {
    logger.error(`Error removing the application ${appName}`, error);
  }
}

async function removeApp(appName) {
  const sAppName = sanitizeInput(appName);
  await processRemoval(sAppName);
}

module.exports = {
  removeApp
};
