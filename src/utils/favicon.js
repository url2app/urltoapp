const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { APPS_DIR } = require('./config');
const { normalizeUrl, getDomainName } = require('./url');
const Logger = require('./logger');

const logger = new Logger('favicon');

async function getFavicon(url) {
  logger.info(`Getting the icon path for ${url}`);
  const defaultIconPath = path.join(__dirname, 'favicon.ico');

  try {
    const domain = getDomainName(url);
    const normalizedUrl = await normalizeUrl(url);
    
    const faviconUrl = `${normalizedUrl}/favicon.ico`;
    const iconResponse = await axios.get(faviconUrl, { responseType: 'arraybuffer' });

    const contentType = iconResponse.headers['content-type'];
    let fileExtension = '.ico'; // Default extension
    if (contentType.includes('png')) {
      fileExtension = '.png';
    } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      fileExtension = '.jpg';
    }

    const iconPathInAppDir = path.join(APPS_DIR, `${domain}${fileExtension}`);

    fs.writeFileSync(iconPathInAppDir, iconResponse.data);
    logger.success(`Site icon downloaded and saved for ${domain}`);
    return iconPathInAppDir;

  } catch (error) {
    logger.warn(`Error downloading the site icon, using the default icon`);

    if (fs.existsSync(defaultIconPath)) {
      return defaultIconPath;
    } else {
      logger.error(`No icon found`);
      return null;
    }
  }
}

module.exports = {
  getFavicon
};
