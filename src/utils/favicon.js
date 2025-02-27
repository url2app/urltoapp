const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { APPS_DIR } = require('./config');
const { normalizeUrl, getDomainName } = require('./url');
const Logger = require('./logger');
const { parseICO} = require('icojs');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');


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
    let fileExtension = '.ico';
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

async function processFavicon(iconPath) {
  const dir = path.dirname(iconPath);
  const ext = path.extname(iconPath);
  const baseName = path.basename(iconPath, ext);

  if (baseName === 'favicon' && ext === '.ico') {
    const newPath = path.join(dir, 'favicon256.ico');
    logger.debug("Default favicon.ico path updated to favicon256.ico");
    return newPath;
  } else {
    try {
      const icoBuffer = fs.readFileSync(iconPath);
      const images = await parseICO(icoBuffer, 'image/png');

      if (images && images.length > 0) {
        const pngBuffer = Buffer.from(images[0].buffer);
        const tempPngPath = iconPath + '.png';
        const resizedPngPath = iconPath + '_resized.png';

        fs.writeFileSync(tempPngPath, pngBuffer);

        await sharp(tempPngPath)
          .resize(256, 256)
          .toFile(resizedPngPath);

        fs.renameSync(resizedPngPath, tempPngPath);

        const newIcoBuffer = await pngToIco([tempPngPath]);
        fs.writeFileSync(iconPath, newIcoBuffer);
        fs.unlinkSync(tempPngPath);

        logger.warn(`To proceed to setup, favicon has been resized to 256x256. Quality loss is possible.`);
        return iconPath;
      }
    } catch (error) {
      logger.error('Error processing ICO file:', error);
      return iconPath;
    }
  }
}



module.exports = {
  getFavicon,
  processFavicon
};
