const Logger = require('../utils/logger');
const chalk = require('chalk');
const { initSettings, getSetting, setSetting, resetSetting, DEFAULT_SETTINGS } = require('../utils/settings');
const inquirer = require('inquirer');

const logger = new Logger('configure');

function configureReports(action) {
  try {
    if (action === 'status') {
      const status = getSetting('send_anon_reports');
      logger.info(`Anonymous reports are currently ${status ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      logger.info(`Default setting is: ${DEFAULT_SETTINGS.send_anon_reports ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      return;
    } else if (action === 'enable') {
      setSetting('send_anon_reports', true);
      logger.info(chalk.green('Anonymous reports have been enabled'));
    } else if (action === 'disable') {
      setSetting('send_anon_reports', false);
      logger.info(chalk.yellow('Anonymous reports have been disabled'));
    } else if (action === 'reset') {
      resetSetting('send_anon_reports');
      logger.info(`Anonymous reports have been resetted to: ${DEFAULT_SETTINGS.send_anon_reports ? chalk.green('enabled') : chalk.yellow('disabled')}`);
    } else {
      logger.error(`Invalid action: ${action}`);
      logger.info('Available actions: status, enable, disable, reset');
      return;
    }
  } catch (err) {
    logger.error(`Error configuring reports`, err.message);
  }
}

function configureVersionCheck(action) {
  try {
    if (action === 'status') {
      const status = getSetting('version_check');
      logger.info(`Version check is currently ${status ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      logger.info(`Default setting is: ${DEFAULT_SETTINGS.version_check ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      return;
    } else if (action === 'enable') {
      setSetting('version_check', true);
      logger.info(chalk.green('Version check has been enabled'));
    } else if (action === 'disable') {
      setSetting('version_check', false);
      logger.info(chalk.yellow('Version check has been disabled'));
    } else if (action === 'reset') {
      resetSetting('version_check');
      logger.info(`Version check has been resetted to: ${DEFAULT_SETTINGS.version_check ? chalk.green('enabled') : chalk.yellow('disabled')}`);
    } else {
      logger.error(`Invalid action: ${action}`);
      logger.info('Available actions: status, enable, disable, reset');
      return;
    }
  } catch (err) {
    logger.error(`Error configuring version check`, err.message);
  }
}

function configureDebug(action) {
  try {
    if (action === 'status') {
      const status = getSetting('always_show_debug');
      logger.info(`Debug logs are currently ${status ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      logger.info(`Default setting is: ${DEFAULT_SETTINGS.always_show_debug ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      return;
    } else if (action === 'enable') {
      setSetting('always_show_debug', true);
      logger.info(chalk.green('Debug logs have been enabled'));
    } else if (action === 'disable') {
      setSetting('always_show_debug', false);
      logger.info(chalk.yellow('Debug logs have been disabled'));
    } else if (action === 'reset') {
      resetSetting('always_show_debug');
      logger.info(`Debug logs have been resetted to: ${DEFAULT_SETTINGS.always_show_debug ? chalk.green('enabled') : chalk.yellow('disabled')}`);
    } else {
      logger.error(`Invalid action: ${action}`);
      logger.info('Available actions: status, enable, disable, reset');
      return;
    }
  } catch (err) {
    logger.error(`Error configuring debug logs`, err.message);
  }
}

function configureAutoUpgrade(action) {
  try {
    if (action === 'status') {
      const status = getSetting('autoupgrade_localapps');
      logger.info(`Debug logs are currently ${status ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      logger.info(`Default setting is: ${DEFAULT_SETTINGS.autoupgrade_localapps ? chalk.green('enabled') : chalk.yellow('disabled')}`);
      return;
    } else if (action === 'enable') {
      setSetting('autoupgrade_localapps', true);
      logger.info(chalk.green('Automatic upgrades have been enabled'));
    } else if (action === 'disable') {
      setSetting('autoupgrade_localapps', false);
      logger.info(chalk.yellow('Automatic upgrades have been disabled'));
    } else if (action === 'reset') {
      resetSetting('autoupgrade_localapps');
      logger.info(`Automatic upgrades have been resetted to: ${DEFAULT_SETTINGS.autoupgrade_localapps ? chalk.green('enabled') : chalk.yellow('disabled')}`);
    } else {
      logger.error(`Invalid action: ${action}`);
      logger.info('Available actions: status, enable, disable, reset');
      return;
    }
  } catch (err) {
    logger.error(`Error configuring auto upgrade`, err.message);
  }
}

async function resetSettings(action) {
  try {
    if (action === 'reset') {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to reset all settings to default?`,
          default: false
        }
      ]);

      if (!answer.confirm) {
        logger.info('Operation canceled');
        return;
      }

      initSettings(true);
      logger.info(chalk.green('All settings have been reset'));
      return;
    } else {
      logger.error(`Invalid action: ${action}`);
      logger.info('Available actions: reset');
      return;
    }
  } catch (err) {
    logger.error(`Error resetting settings`, err.message);
  }
}

async function configure(category, action) {
  if (!category || !action) {
    logger.error('Missing category or action');
    logger.info('Usage: u2a configure [category] [action]');
    logger.info('Available categories:');
    logger.info('  autoupgrade - Configure automatic upgrade on installed localapps on update');
    logger.info('  debug - Configure always showing debug logs');
    logger.info('  reports - Configure anonymous usage reports');
    logger.info('  settings - Resets settings (only reset action)');
    logger.info('  vcheck - Configure automatic version check');
    logger.info('Available actions:');
    logger.info('  status  - Check current status');
    logger.info('  enable  - Enable specified category');
    logger.info('  disable - Disable specified category');
    logger.info('  reset - Resets specified category to default');
    return;
  }

  switch (category) {
    case 'reports':
      configureReports(action);
      break;
    case 'vcheck':
      configureVersionCheck(action);
      break;
    case 'debug':
      configureDebug(action);
      break;
    case 'settings':
      await resetSettings(action);
      break;
    case 'autoupgrade':
      await configureAutoUpgrade(action);
      break;
    default:
      logger.error(`Unknown configuration category: ${category}`);
      logger.info('Available categories: debug, reports, vcheck, settings');
      break;
  }
}

module.exports = {
  configure
};