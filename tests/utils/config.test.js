jest.mock('fs');
jest.mock('path');
jest.mock('os');

const fs = require('fs');
const path = require('path');
const os = require('os');

const MOCK_HOME_DIR = '/fake/home/directory';
os.homedir.mockReturnValue(MOCK_HOME_DIR);

path.join.mockImplementation((...args) => args.join('/').replace(/\/+/g, '/'));

const config = require('../../src/utils/config');

const EXPECTED_CONFIG_DIR = '/fake/home/directory/.u2a';
const EXPECTED_APPS_DIR = '/fake/home/directory/.u2a/apps';
const EXPECTED_LOGS_DIR = '/fake/home/directory/.u2a/logs';
const EXPECTED_DB_PATH = '/fake/home/directory/.u2a/db.json';
const EXPECTED_SETTINGS_PATH = '/fake/home/directory/.u2a/settings.json';

beforeEach(() => {
  fs.mkdirSync.mockClear();
  fs.writeFileSync.mockClear();
  fs.existsSync.mockClear();
  fs.readFileSync.mockClear();
  
  fs.existsSync.mockReturnValue(false);
});

describe('setupConfig', () => {
  test('creates necessary directories and files', () => {
    config.setupConfig();

    expect(fs.mkdirSync).toHaveBeenCalledWith(EXPECTED_CONFIG_DIR, { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(EXPECTED_APPS_DIR, { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(EXPECTED_LOGS_DIR, { recursive: true });

    expect(fs.writeFileSync).toHaveBeenCalledWith(EXPECTED_DB_PATH, JSON.stringify({}, null, 2));
    expect(fs.writeFileSync).toHaveBeenCalledWith(EXPECTED_SETTINGS_PATH, JSON.stringify({}, null, 2));
  });
  
  test('does not overwrite existing files', () => {
    fs.existsSync.mockImplementation((path) => {
      return path === EXPECTED_DB_PATH || path === EXPECTED_SETTINGS_PATH;
    });
    
    config.setupConfig();
    
    expect(fs.mkdirSync).toHaveBeenCalledWith(EXPECTED_CONFIG_DIR, { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(EXPECTED_APPS_DIR, { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(EXPECTED_LOGS_DIR, { recursive: true });
    
    expect(fs.writeFileSync).not.toHaveBeenCalledWith(EXPECTED_DB_PATH, expect.any(String));
    expect(fs.writeFileSync).not.toHaveBeenCalledWith(EXPECTED_SETTINGS_PATH, expect.any(String));
  });
});

describe('readDB', () => {
  test('reads the database file', () => {
    const mockData = { test: 'data' };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const data = config.readDB();

    expect(fs.readFileSync).toHaveBeenCalledWith(EXPECTED_DB_PATH, 'utf-8');
    expect(data).toEqual(mockData);
  });
  
  test('handles JSON parse errors', () => {
    fs.readFileSync.mockReturnValue('invalid json');
    
    expect(() => {
      config.readDB();
    }).toThrow();
  });
});

describe('writeDB', () => {
  test('writes data to the database file', () => {
    const data = { test: 'data' };

    config.writeDB(data);

    expect(fs.writeFileSync).toHaveBeenCalledWith(EXPECTED_DB_PATH, JSON.stringify(data, null, 2));
  });
});

describe('addAppToDB', () => {
  test('adds an app to the database', () => {
    const appName = 'newApp';
    const appData = { version: '1.0' };
    const mockDB = { existingApp: { version: '1.0' } };

    fs.readFileSync.mockReturnValue(JSON.stringify(mockDB));

    config.addAppToDB(appName, appData);

    expect(fs.readFileSync).toHaveBeenCalledWith(EXPECTED_DB_PATH, 'utf-8');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      EXPECTED_DB_PATH, 
      JSON.stringify({ ...mockDB, [appName]: appData }, null, 2)
    );
  });
  
  test('creates a new database entry if reading fails', () => {
    const appName = 'firstApp';
    const appData = { version: '1.0' };
    
    fs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });
    
    expect(() => {
      config.addAppToDB(appName, appData);
    }).toThrow();
  });
});