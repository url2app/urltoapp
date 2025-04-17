const os = require('os');
const isAdmin = require('is-admin');
const { checkNotRoot } = require('../../src/utils/noroot');

console.log = jest.fn();
jest.mock('is-admin');
jest.mock('os', () => ({
  platform: jest.fn(),
  release: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }));
});

jest.spyOn(process, 'exit').mockImplementation(() => { });

const originalGetuid = process.getuid;

beforeEach(() => {
  jest.clearAllMocks();
  if (originalGetuid) {
    process.getuid = originalGetuid;
  } else {
    delete process.getuid;
  }
});

afterAll(() => {
  if (originalGetuid) {
    process.getuid = originalGetuid;
  } else {
    delete process.getuid;
  }
});

describe('checkNotRoot', () => {
  test('should allow root if allowRoot=true', async () => {
    await checkNotRoot(true);
    expect(process.exit).not.toHaveBeenCalled();
  });

  test('should exit if on win32 and is admin', async () => {
    os.platform.mockReturnValue('win32');
    isAdmin.mockResolvedValue(true);

    await checkNotRoot();

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should not exit if on win32 and not admin', async () => {
    os.platform.mockReturnValue('win32');
    isAdmin.mockResolvedValue(false);

    await checkNotRoot();

    expect(process.exit).not.toHaveBeenCalled();
  });

  test('should exit if on linux and process uid is 0', async () => {
    os.platform.mockReturnValue('linux');

    process.getuid = jest.fn(() => 0);

    await checkNotRoot();

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should not exit if on linux and process uid not 0', async () => {
    os.platform.mockReturnValue('linux');

    process.getuid = jest.fn(() => 69);

    await checkNotRoot();

    expect(process.exit).not.toHaveBeenCalled();
  });

  test('should exit if on darwin and process uid is 0', async () => {
    os.platform.mockReturnValue('darwin');

    process.getuid = jest.fn(() => 0);

    await checkNotRoot();

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  test('should not exit if on darwin and process uid not 0', async () => {
    os.platform.mockReturnValue('darwin');

    process.getuid = jest.fn(() => 69);

    await checkNotRoot();

    expect(process.exit).not.toHaveBeenCalled();
  });

  test('should exit on unsupported platform', async () => {
    os.platform.mockReturnValue('templeos');

    await checkNotRoot();

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});