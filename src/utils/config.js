const fs = require('fs');
const path = require('path');
const os = require('os');
const Logger = require('./logger');

const logger = new Logger('config');

const CONFIG_DIR = path.join(os.homedir(), '.u2a');
const APPS_DIR = path.join(CONFIG_DIR, 'apps');
const LOGS_DIR = path.join(CONFIG_DIR, 'logs');
const DB_PATH = path.join(CONFIG_DIR, 'db.json');
const SETTINGS_PATH = path.join(CONFIG_DIR, 'settings.json');

function setupConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(APPS_DIR)) {
    fs.mkdirSync(APPS_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({}, null, 2));
  }
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  logger.debug(`DB written with:`, data);
}

function addAppToDB(appName, appData) {
  const db = readDB();
  db[appName] = appData;
  writeDB(db);
  logger.debug(`Application recorded in the database:`, appName);
}

module.exports = {
  CONFIG_DIR,
  APPS_DIR,
  LOGS_DIR,
  DB_PATH,
  SETTINGS_PATH,
  setupConfig,
  readDB,
  writeDB,
  addAppToDB
};
