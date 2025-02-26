const { readDB } = require('../utils/config');
const Logger = require('../utils/logger');
const chalk = require('chalk');

const logger = new Logger('list');

function listApps() {
  const apps = readDB();

  if (Object.keys(apps).length === 0) {
    logger.warn('No applications have been created');
    logger.info('Create one with: u2a create <url>');
    return;
  }

  logger.info('Available applications:');
  console.log(chalk.gray('--------------------------------'));

  Object.entries(apps).forEach(([domain, info]) => {
    logger.debug(`Retrieved information for ${domain}:`, info);
    console.log(chalk.green(`\n${domain}:`));
    console.log(chalk.blue(`  URL: ${info.url}`));
    console.log(chalk.blue(`  Created on: ${new Date(info.created).toLocaleString()}`));
    console.log(chalk.blue(`  Directory: ${info.path}`));
    console.log(chalk.gray('  ----------'));
  });

  logger.info('To remove an application: u2a remove <domain>');
}

module.exports = {
  listApps
};
