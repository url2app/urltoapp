// tests/utils/version-check.test.js
const axios = require('axios');
const { checkVersion, UPDATE_TYPES } = require('../../src/utils/versionCheck');
const { version } = require('../../package.json');

console.log = jest.fn();
jest.mock('axios');
jest.mock('../../src/utils/settings', () => ({
  getSetting: jest.fn()
}));
jest.mock('../../package.json', () => ({
    version: '1.2.3'
  }));
  

const { getSetting } = require('../../src/utils/settings');

describe('checkVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip check when version_check is disabled and forceCheck is false', async () => {
    getSetting.mockReturnValue(false);

    const result = await checkVersion();

    expect(result).toEqual(expect.objectContaining({
      current: version,
      latest: null,
      needsUpdate: false,
      updateType: UPDATE_TYPES.NONE,
      skipped: true,
      reason: 'version_check disabled in settings'
    }));
  });

  it('should perform check and detect update if latest version is higher', async () => {
    getSetting.mockReturnValue(true);
    axios.get.mockResolvedValue({ data: '9.9.9' }); // version >> current

    const result = await checkVersion(true); // silent to not log in test output

    expect(result.current).toBe(version);
    expect(result.latest).toBe('9.9.9');
    expect(result.needsUpdate).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.updateType).not.toBe(UPDATE_TYPES.NONE);
    expect(result.updateDetails).toEqual(expect.objectContaining({
      fromVersion: version,
      toVersion: '9.9.9'
    }));
  });

  it('should detect no update if versions are equal', async () => {
    getSetting.mockReturnValue(true);
    axios.get.mockResolvedValue({ data: version });

    const result = await checkVersion(true);

    expect(result.needsUpdate).toBe(false);
    expect(result.updateType).toBe(UPDATE_TYPES.NONE);
    expect(result.latest).toBe(version);
  });

  it('should return error object on request failure', async () => {
    getSetting.mockReturnValue(true);
    axios.get.mockRejectedValue(new Error('Network error'));

    const result = await checkVersion(true);

    expect(result.needsUpdate).toBe(false);
    expect(result.error).toBe('Network error');
    expect(result.skipped).toBe(false);
  });
});
