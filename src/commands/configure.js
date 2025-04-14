const Logger = require('../utils/logger');
const chalk = require('chalk');
const { getSetting, setSetting, DEFAULT_SETTINGS } = require('../utils/settings');


const logger = new Logger('configure');

function configureReports(action) {
  try {
    if (action === 'status') {
      const status = getSetting('send_anon_reports');
      logger.info(`Anonymous reports are currently ${status ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      logger.info(`Default setting is: ${DEFAULT_SETTINGS.send_anon_reports ? 'enabled' : 'disabled'}`);
      return;
    } else if (action === 'enable') {
      setSetting('send_anon_reports', true);
      logger.info(chalk.green('Anonymous reports have been enabled'));
    } else if (action === 'disable') {
      setSetting('send_anon_reports', false);
      logger.info(chalk.yellow('Anonymous reports have been disabled'));
    } else {
      logger.error(`Invalid action: ${action}`);
      logger.info('Available actions: status, enable, disable');
      return;
    }
  } catch (err) {
    logger.error(`Error configuring reports`, err.message);
  }
}

function configure(category, action) {
  if (!category || !action) {
    logger.error('Missing category or action');
    logger.info('Usage: u2a configure [category] [action]');
    logger.info('Available categories:');
    logger.info('  reports - Configure anonymous usage reports');
    logger.info('Available actions:');
    logger.info('  status  - Check current status');
    logger.info('  enable  - Enable specified category');
    logger.info('  disable - Disable specified category');
    return;
  }

  switch (category) {
    case 'reports':
      configureReports(action);
      break;
    default:
      logger.error(`Unknown configuration category: ${category}`);
      logger.info('Available categories: reports');
      break;
  }
}

module.exports = {
  configure
};