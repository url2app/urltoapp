// Todo: autoupgrade for installed localapps, will be useful if we change file structure


const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Logger = require('./logger');
const { setupConfig, CONFIG_DIR } = require('./config');
const { initSettings, getSetting } = require('./settings');
const { upgrade } = require('./upgradeLA');

setupConfig(); // builds ~/.u2a/*

const logger = new Logger('postinstall');
const postinstallJsonPath = path.join(CONFIG_DIR, 'postinstall.json');
let isUpgrade = false;
let currentVersion = '0.0.0'; //0.0.0 for new installations
let sendAnonReports = true; // u2a configure reports disable to disable

const formatVersionLine = (label, version) => {
    // calculates how many spaces we need after the version to have a correct formatting
    const baseLength = `; ${label}: `.length + version.length;
    const spaceCount = Math.max(0, 30 - baseLength);
    const spaces = ' '.repeat(spaceCount);

    return `; ${label}: ${version}${spaces};`;
};

async function run() {
    //check if postinstall.json exists (exists -> update, doesnt -> new install)
    if (fs.existsSync(postinstallJsonPath)) {
        try {
            const postinstallData = JSON.parse(fs.readFileSync(postinstallJsonPath, 'utf8'));
            currentVersion = postinstallData.version || '';
            isUpgrade = true;

            let newVersion = '';
            try {
                const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                newVersion = packageJson.version || '';
            } catch (err) {
                logger.error(`Error reading package.json for display`, err.message);
                newVersion = 'unknown';
            }

            logger.info(';=============================;');
            logger.info('; u2a has been updated!       ;');
            logger.info('; Successfully migrated from  ;');
            logger.info(formatVersionLine('Old version', currentVersion));
            logger.info(formatVersionLine('New version', newVersion));
            logger.info(';=============================;');

            initSettings();
            upgrade();
        } catch (err) {
            logger.error(`Error reading postinstall.json`, err.message);
            isUpgrade = false;
        }
    }

    const sendAnonReports = getSetting('send_anon_reports');

    // shows this cool message if it isnt an upgrade
    if (!isUpgrade) {
        logger.info(';=============================;');
        logger.info('; Welcome to u2a !            ;');
        logger.info('; Thanks for downloading this ;');
        logger.info('; tool !                      ;');
        logger.info(';                             ;');
        logger.info('; Create a local webapp with  ;');
        logger.info('; \'u2a create <url/domain>\'   ;');
        logger.info(';                             ;');
        logger.info('; Check docs.urltoapp.xyz for ;');
        logger.info('; more detailed usage.        ;');
        logger.info(';                             ;');
        logger.info('; Note: Anonymous installs    ;');
        logger.info('; reports are enabled by      ;');
        logger.info('; default. To disable:        ;');
        logger.info('; \'u2a configure reports      ;');
        logger.info('; disable\'                    ;');
        logger.info(';=============================;');

        initSettings(true);
    }


    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    let newVersion = '';

    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        newVersion = packageJson.version || '';
    } catch (err) {
        logger.error(`Error reading package.json`, err.message);
    }

    if (sendAnonReports) {
        try {

            const params = new URLSearchParams({
                previousVersion: currentVersion,
                newVersion: newVersion
            });

            // backend here https://github.com/url2app/urltoapp.xyz/blob/main/api/v1/api/reports.php
            await axios.get(`https://urltoapp.xyz/api/v1/reports?${params.toString()}`);
            logger.debug('Anonymous usage report sent');
        } catch (err) {
            logger.debug(`Failed to send anonymous report: ${err.message}`);
        }
    }

    try {
        fs.writeFileSync(postinstallJsonPath, JSON.stringify({
            version: newVersion,
            installed_at: new Date().toISOString()
        }, null, 2));
    } catch (err) {
        logger.error(`Error updating postinstall.json`, err.message);
    }

    if (isUpgrade) {
        try {
            logger.info('Checking for local apps that need upgrading...');
            const upgradeStats = await upgrade(currentVersion, newVersion);

            if (upgradeStats.skipped) {
                if (upgradeStats.reason === 'disabled') {
                    logger.warn('Automatic upgrade for local apps is disabled in settings, skipped.');
                } else if (upgradeStats.reason === 'not-core-update') {
                    logger.warn('This is not a core update, skipping local apps upgrade');
                } else if (upgradeStats.reason === 'new-install') {
                    logger.warn('New installation, no local apps to upgrade');
                }
            } else {
                logger.warn(`Local apps upgrade results: ${upgradeStats.upgraded} upgraded, ${upgradeStats.failed} failed`);

                if (upgradeStats.upgraded > 0) {
                    logger.info(';=============================;');
                    logger.info('; Local apps have been updated;');
                    logger.info(formatVersionLine("Updated", upgradeStats.upgraded.toString())); //not a version but who cares anyway
                    if (upgradeStats.failed > 0) {
                        logger.info(formatVersionLine("Skipped", upgradeStats.failed.toString()));
                    }
                    logger.info(';=============================;');
                }
            }
        } catch (err) {
            logger.error('Error while upgrading local apps:', err.message);
        }
    }
}

run().catch(err => {
    logger.error(`Unexpected error`, err.message);
});