const fs = require('fs');
const { SETTINGS_PATH } = require('./config');
const Logger = require('./logger');

const logger = new Logger('settings');

const DEFAULT_SETTINGS = {
    send_anon_reports: true,
    version_check: true
};

// reset is DANGEROUS ! resets all settings
function initSettings(reset = false) {
    try {
        let currentSettings = {};

        if (!reset && fs.existsSync(SETTINGS_PATH)) {
            try {
                currentSettings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
                logger.debug('Existing settings loaded');
            } catch (err) {
                logger.error(`Error reading existing settings.json, will reinitialize`, err.message);
                currentSettings = {};
            }
        }

        if (reset) {
            logger.debug('Resetting all settings to default values');
            fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ ...DEFAULT_SETTINGS }, null, 2));
            return { ...DEFAULT_SETTINGS };
        }

        const mergedSettings = {};

        Object.keys(DEFAULT_SETTINGS).forEach(key => {
            mergedSettings[key] = currentSettings[key] !== undefined
                ? currentSettings[key]
                : DEFAULT_SETTINGS[key];
        });

        Object.keys(currentSettings).forEach(key => {
            if (mergedSettings[key] === undefined) {
                mergedSettings[key] = currentSettings[key];
            }
        });

        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(mergedSettings, null, 2));
        logger.debug('Settings initialized successfully');

        return mergedSettings;
    } catch (err) {
        logger.error(`Error initializing settings.json`, err.message);
        return { ...DEFAULT_SETTINGS };
    }
}

function getSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        }
        return {};
    } catch (err) {
        logger.error(`Error reading settings.json`, err.message);
        return {};
    }
}


function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        logger.debug('Settings saved successfully');
    } catch (err) {
        logger.error(`Error writing settings.json`, err.message);
    }
}


function getSetting(key, defaultValue = null) {
    const settings = getSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
}
//use : setSetting('version_check', true);
function setSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
}

module.exports = {
    initSettings,
    getSettings,
    saveSettings,
    getSetting,
    setSetting
};