const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.u2a');
const APPS_DIR = path.join(CONFIG_DIR, 'apps');
const LOGS_DIR = path.join(CONFIG_DIR, 'logs');
const DB_PATH = path.join(CONFIG_DIR, 'db.json');

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
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function addAppToDB(domain, appData) {
  const db = readDB();
  db[domain] = appData;
  writeDB(db);
  logger.debug(`Application recorded in the database:`, domain);
}

module.exports = {
  CONFIG_DIR,
  APPS_DIR,
  LOGS_DIR,
  setupConfig,
  readDB,
  writeDB,
  addAppToDB
};
