const axios = require('axios');
const { version } = require('../../package.json');
const Logger = require('./logger');

const logger = new Logger('version-check');

// types of updates based on pattern arount lines 90 of this file
const UPDATE_TYPES = {
  NONE: 'none',
  SECURITY: 'security',
  CORE: 'core',
  FEATURE: 'feature'
};

async function checkVersion(silent = false) {
  try {
    logger.debug('Started version check');
    const response = await axios.get('https://urltoapp.xyz/api/v1/getlastest', {
      timeout: 1000
    });

    const latestVersion = response.data.trim();
    logger.debug(`Version retrieved: ${latestVersion}`);
    
    const versionComparison = compareVersions(version, latestVersion);
    const updateType = getUpdateType(version, latestVersion);
    const needsUpdate = versionComparison < 0;

    if (!silent && needsUpdate) {
      logger.debug(`New update available: ${latestVersion} (${updateType})`);
      console.log('');
      
      const updateMessages = {
        [UPDATE_TYPES.SECURITY]: `CRITICAL: Security update (${latestVersion}) available!`,
        [UPDATE_TYPES.CORE]: `IMPORTANT: Core update (${latestVersion}) available!`,
        [UPDATE_TYPES.FEATURE]: `NEW: Feature update (${latestVersion}) available!`
      };
      
      if (updateType === UPDATE_TYPES.SECURITY) {
        logger.error(updateMessages[UPDATE_TYPES.SECURITY]); //using .error cuz im lazy to do other variations, sorry ! :)
      } else {
        logger.warn(updateMessages[updateType] || `A new update (${latestVersion}) is available!`);
      }
      
      logger.warn(`Current version: ${version}`);
      logger.warn(`Update u2a with: npm install -g u2a@${latestVersion}`);
      
      if (updateType === UPDATE_TYPES.SECURITY) {
        logger.error('This update fixes SECURITY VULNERABILITIES and should be installed immediately!');
      }
    }

    return {
      current: version,
      latest: latestVersion,
      needsUpdate,
      updateType,
      updateDetails: needsUpdate ? getUpdateDetails(version, latestVersion) : null
    };
  } catch (error) {
    return {
      current: version,
      latest: null,
      needsUpdate: false,
      updateType: UPDATE_TYPES.NONE,
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

function getUpdateType(currentVersion, latestVersion) {
  if (currentVersion === latestVersion) {
    return UPDATE_TYPES.NONE;
  }
  
  const current = currentVersion.split('.').map(Number);
  const latest = latestVersion.split('.').map(Number);
  
  /*
    a.b.c format where:
    a: security version
    b: core version
    c: feature version
    eg, 3.4.18 -> security version: 3, core version: 4, feature version: 18
  */

  if (latest[0] > current[0]) {
    return UPDATE_TYPES.SECURITY;
  } else if (latest[1] > current[1]) {
    return UPDATE_TYPES.CORE;
  } else if (latest[2] > current[2]) {
    return UPDATE_TYPES.FEATURE;
  }
  
  return UPDATE_TYPES.NONE; //current is newer or same
}


function getUpdateDetails(currentVersion, latestVersion) {
  const current = currentVersion.split('.').map(Number);
  const latest = latestVersion.split('.').map(Number);
  
  return {
    securityChanges: latest[0] - current[0],
    coreChanges: latest[1] - current[1],
    featureChanges: latest[2] - current[2],
    fromVersion: currentVersion,
    toVersion: latestVersion
  }; //hard maths up here
}

module.exports = {
  checkVersion,
  UPDATE_TYPES
};