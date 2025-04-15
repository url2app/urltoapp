const fs = require('fs');
const { SETTINGS_PATH } = require('./config');
const Logger = require('./logger');

const logger = new Logger('settings');

const DEFAULT_SETTINGS = {
    send_anon_reports: true,
    version_check: true,
    always_show_debug: false,
    autoupgrade_localapps: true,

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
                logger.debug(`Error reading existing settings.json, will reinitialize`, err.message);
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
        logger.debug(`Error initializing settings.json`, err.message);
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
        logger.debug(`Error reading settings.json`, err.message);
        return {};
    }
}


function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        logger.debug('Settings saved successfully');
    } catch (err) {
        logger.debug(`Error writing settings.json`, err.message);
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

function resetSetting(key) {
    if (!(key in DEFAULT_SETTINGS)) {
        logger.debug(`resetSetting: "${key}" is not a valid default setting key`);
        return;
    }

    const settings = getSettings();
    settings[key] = DEFAULT_SETTINGS[key];
    saveSettings(settings);
    logger.debug(`Setting "${key}" reset to default value`);
}


module.exports = {
    DEFAULT_SETTINGS,
    initSettings,
    getSettings,
    saveSettings,
    getSetting,
    setSetting,
    resetSetting
};