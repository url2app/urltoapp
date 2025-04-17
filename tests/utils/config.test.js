const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../../src/utils/config');

jest.mock('fs');

beforeEach(() => {
  fs.mkdirSync.mockClear();
  fs.writeFileSync.mockClear();
  fs.existsSync.mockClear();
  fs.readFileSync.mockClear();
});

describe('setupConfig', () => {
  test('creates necessary directories and files', () => {
    fs.existsSync.mockReturnValue(false);

    config.setupConfig();

    expect(fs.mkdirSync).toHaveBeenCalledWith(config.CONFIG_DIR, { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(config.APPS_DIR, { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith(config.LOGS_DIR, { recursive: true });

    expect(fs.writeFileSync).toHaveBeenCalledWith(config.DB_PATH, JSON.stringify({}, null, 2));
    expect(fs.writeFileSync).toHaveBeenCalledWith(config.SETTINGS_PATH, JSON.stringify({}, null, 2));
  });
});

describe('readDB', () => {
  test('reads the database file', () => {
    const mockData = { test: 'data' };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

    const data = config.readDB();

    expect(fs.readFileSync).toHaveBeenCalledWith(config.DB_PATH, 'utf-8');
    expect(data).toEqual(mockData);
  });
});

describe('writeDB', () => {
  test('writes data to the database file', () => {
    const data = { test: 'data' };

    config.writeDB(data);

    expect(fs.writeFileSync).toHaveBeenCalledWith(config.DB_PATH, JSON.stringify(data, null, 2));
  });
});

describe('addAppToDB', () => {
  test('adds an app to the database', () => {
    const appName = 'newApp';
    const appData = { version: '1.0' };
    const mockDB = { existingApp: { version: '1.0' } };

    fs.readFileSync.mockReturnValue(JSON.stringify(mockDB));

    config.addAppToDB(appName, appData);

    expect(fs.readFileSync).toHaveBeenCalledWith(config.DB_PATH, 'utf-8');

    expect(fs.writeFileSync).toHaveBeenCalledWith(config.DB_PATH, JSON.stringify({ ...mockDB, [appName]: appData }, null, 2));
  });
});
