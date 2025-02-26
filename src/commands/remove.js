const fs = require('fs');
const inquirer = require('inquirer');
const { normalizeUrl, getDomainName } = require('../utils/url');
const { readDB, writeDB, APPS_DIR } = require('../utils/config');
const Logger = require('../utils/logger');
const { removeAppFromOS } = require('./create');
const path = require('path');

const logger = new Logger('remove');

async function removeApp(url) {
  try {
    const domain = getDomainName(await normalizeUrl(url));
    const db = readDB();

    if (!db.hasOwnProperty(domain)) {
      logger.warn(`The application for ${domain} does not exist`);
      return;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove the application for ${domain}?`,
        default: false
      }
    ]);

    if (!confirm) {
      logger.info('Operation canceled');
      return;
    }

    const appInfo = db[domain];
    const appDir = appInfo.path;

    removeAppFromOS(domain);
    logger.info(`Removing the application ${domain}...`);

    const iconPath = path.join(APPS_DIR, `${domain}.ico`);
    if (fs.existsSync(iconPath)) {
      fs.unlinkSync(iconPath);
      logger.success(`Icon for ${domain} removed`);
    }

    fs.rmSync(appDir, { recursive: true, force: true });
    delete db[domain];
    writeDB(db);

    logger.success(`The application for ${domain} has been successfully removed`);
  } catch (error) {
    logger.error(`Error removing the application ${url}`, error);
  }
}

module.exports = {
  removeApp
};
