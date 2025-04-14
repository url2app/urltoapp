const fs = require('fs');
const { SETTINGS_PATH } = require('./config');
const Logger = require('./logger');

const logger = new Logger('settings');


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

function updateSettings(newSettings) {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  saveSettings(updatedSettings);
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
  getSettings,
  saveSettings,
  updateSettings,
  getSetting,
  setSetting
};