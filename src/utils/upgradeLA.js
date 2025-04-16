//seems still a bit unstable, thats why this feature is disabled by default
//enable with 'u2a configure autoupgrade enable'



const fs = require('fs');
const path = require('path');
const { readDB } = require('./config');
const Logger = require('./logger');
const { createApp } = require('../commands/create');
const { removeApp } = require('../commands/remove');
const { getSetting } = require('./settings');

const logger = new Logger('upgradeLA');

function isCoreUpdate(currentVersion, newVersion) {
    try {
        const [currentSecurity, currentCore, currentFeature] = currentVersion.split('.').map(Number);
        const [newSecurity, newCore, newFeature] = newVersion.split('.').map(Number);

        return (currentSecurity !== newSecurity || currentCore !== newCore);
    } catch (err) {
        logger.debug(`Error comparing versions: ${currentVersion} vs ${newVersion}`, err.message);
        return false;
    }
}

function extractDimensionsFromMainJs(mainJsPath) {
    try {
        if (!fs.existsSync(mainJsPath)) {
            logger.warn(`main.js file not found at ${mainJsPath}`);
            return { width: 1200, height: 800 };
        }

        const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

        const widthMatch = mainJsContent.match(/const\s+WINDOW_WIDTH\s*=\s*(\d+)/);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : 1200;

        const heightMatch = mainJsContent.match(/const\s+WINDOW_HEIGHT\s*=\s*(\d+)/);
        const height = heightMatch ? parseInt(heightMatch[1], 10) : 800;

        logger.debug(`Extracted dimensions from main.js: ${width}x${height}`);
        return { width, height };
    } catch (err) {
        logger.debug(`Error extracting dimensions from main.js: ${mainJsPath}`, err.message);
        return { width: 1200, height: 800 };
    }
}

async function upgradeLocalApp(appName, appData) {
    logger.debug(`Upgrading local app: ${appName}`);

    try {
        const { url, path: appPath, icon } = appData;

        const mainJsPath = path.join(appPath, 'main.js');
        const { width, height } = extractDimensionsFromMainJs(mainJsPath);

        const options = {
            name: appName,
            width: width,
            height: height,
        };

        if (icon)
            options.icon = icon;


        await removeApp(appName, false);
        logger.debug(`Removed existing app: ${appName}`);

        await createApp(url, options);
        logger.debug(`Successfully upgraded: ${appName}`);

        return true;
    } catch (err) {
        logger.debug(`Failed to upgrade ${appName}`, err.message);
        return false;
    }
}

async function upgradeLocalApps(currentVersion, newVersion) {
    logger.debug(`Checking for local apps that need upgrading`);

    const autoUpgradeEnabled = getSetting('autoupgrade_localapps');
    if (!autoUpgradeEnabled) {
        logger.debug(`Automatic upgrade for local apps is disabled. Skipping upgrades.`);
        return { skipped: true, reason: 'disabled', upgraded: 0, failed: 0, total: 0 };
    }

    if (!isCoreUpdate(currentVersion, newVersion)) {
        logger.debug(`Not a core update (${currentVersion} → ${newVersion}). Skipping local app upgrades.`);
        return { skipped: true, reason: 'not-core-update', upgraded: 0, failed: 0, total: 0 };
    }

    try {
        const db = readDB();
        const apps = Object.keys(db);
        const stats = { skipped: false, upgraded: 0, failed: 0, total: apps.length };

        logger.debug(`Found ${apps.length} local apps to check for upgrade`);

        for (const appName of apps) {
            const appData = db[appName];

            if (!appData.path || !fs.existsSync(appData.path)) { //skips if no path but shouldnt happen
                logger.debug(`Skipping ${appName}: Not a local app or path doesn't exist`);
                continue;
            }

            const success = await upgradeLocalApp(appName, appData);
            if (success) {
                stats.upgraded++;
            } else {
                stats.failed++;
            }
        }

        logger.debug(`Local apps upgrade completed: ${stats.upgraded} upgraded, ${stats.failed} failed, ${apps.length - stats.upgraded - stats.failed} skipped`);
        return stats;
    } catch (err) {
        logger.debug(`Error upgrading local apps`, err.message);
        return { skipped: false, upgraded: 0, failed: 0, total: 0, error: err.message };
    }
}

async function upgrade(currentVersion, newVersion) {
    logger.debug(`Starting local apps upgrade check: ${currentVersion} → ${newVersion}`);

    if (currentVersion === '0.0.0') {
        logger.debug('New installation detected, no apps to upgrade');
        return { skipped: true, reason: 'new-install' };
    }

    return await upgradeLocalApps(currentVersion, newVersion);
}

module.exports = {
    upgrade
};