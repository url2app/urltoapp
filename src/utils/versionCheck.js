const axios = require('axios');
const { version } = require('../../package.json');
const Logger = require('./logger');

const logger = new Logger('version-check');

async function checkVersion(silent = false) {
  try {

    logger.debug('Started version check');
    const response = await axios.get('https://urltoapp.xyz/api/v1/getlastest', {
      timeout: 1000
    });

    const latestVersion = response.data.trim();
    logger.debug(`Version retrived: ${latestVersion}`);
    
    const needsUpdate = compareVersions(version, latestVersion) <= 0;

    if (!silent && needsUpdate && latestVersion !== version) {
      logger.debug(`New update available: ${latestVersion}`);
      console.log('');
      logger.warn(`A new update (${latestVersion}) is available ! Current version: ${version}`);
      logger.warn(`Update u2a with: npm install -g u2a@${latestVersion}`);
    }

    return {
      current: version,
      latest: latestVersion,
      needsUpdate: needsUpdate && latestVersion !== version
    };
  } catch (error) {
    return {
      current: version,
      latest: null,
      needsUpdate: false,
      error: error.message
    };
  }
}


function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

module.exports = {
  checkVersion
};