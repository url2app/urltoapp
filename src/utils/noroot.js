const os = require('os');
const isAdmin = require('is-admin');
const Logger = require('./logger')

const logger = new Logger('noroot');

async function checkNotRoot(allowRoot = false) {
  if (allowRoot) {
    logger.warn('Running with elevated privileges. This is not recommended.');
    return;
  }

  const platform = os.platform();

  switch (platform) {
    case 'win32':
      if (await isAdmin()) {
        logger.error('This application should not be run as an administrator.');
        logger.warn('Run with --allowroot to avoid this message.');
        logger.warn('Running u2a as administrator can be dangerous.');
        process.exit(1);
      }
      break;

    case 'darwin':
    case 'linux':
      if (process.getuid() === 0) {
        logger.error('This application should not be run as root.');
        logger.warn('Run with --allowroot to avoid this message.');
        logger.warn('Running u2a as root can be dangerous.');
        process.exit(1);
      }
      break;

    default:
      logger.error('Unsupported platform:', platform);
      process.exit(1);
  }
}

module.exports = { checkNotRoot };
