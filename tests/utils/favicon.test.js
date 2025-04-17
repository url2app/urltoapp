const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getFavicon, processFavicon } = require('../../src/utils/favicon');
const { getDomainName, normalizeUrl } = require('../../src/utils/url');
const { APPS_DIR } = require('../../src/utils/config');

console.log = jest.fn();
jest.mock('axios');
jest.mock('fs');
jest.mock('../../src/utils/logger', () => {
    return jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        debug: jest.fn(),
    }));
});
jest.mock('../../src/utils/url', () => ({
    getDomainName: jest.fn(() => 'example.com'),
    normalizeUrl: jest.fn(() => Promise.resolve('https://example.com')),
}));
jest.mock('icojs', () => ({
    parseICO: jest.fn(() => Promise.resolve([
        { buffer: Buffer.from([0x00, 0x01, 0x02]), width: 256, height: 256 },
    ])),
}));


describe('getFavicon', () => {
    const url = 'https://example.com';
    const iconBuffer = Buffer.from([0x00, 0x01, 0x02]);
    const iconPathInAppDir = path.join(APPS_DIR, 'example.com.ico');
    const defaultIconPath = path.join(__dirname, '../../src/utils/favicon.ico');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should download and save favicon.ico', async () => {
        axios.get.mockResolvedValueOnce({
            headers: { 'content-type': 'image/x-icon' },
            data: iconBuffer,
        });

        fs.writeFileSync.mockImplementation(() => { });
        fs.existsSync.mockReturnValue(false);

        const result = await getFavicon(url);

        expect(result).toBe(iconPathInAppDir);
        expect(fs.writeFileSync).toHaveBeenCalledWith(iconPathInAppDir, iconBuffer);
    });

    test('should return default icon if download fails and default exists', async () => {
        axios.get.mockRejectedValueOnce(new Error('Download failed'));
        fs.existsSync.mockReturnValue(true);

        const result = await getFavicon(url);

        expect(result).toBe(defaultIconPath);
    });

    test('should return null if no default icon exists', async () => {
        axios.get.mockRejectedValueOnce(new Error('Download failed'));
        fs.existsSync.mockReturnValue(false);

        const result = await getFavicon(url);

        expect(result).toBeNull();
    });
});

describe('processFavicon', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should skip processing if name is favicon.ico', async () => {
        const inputPath = path.join('/some/folder', 'favicon.ico');
        const expectedPath = path.join('/some/folder', 'favicon256.ico');

        const result = await processFavicon(inputPath);
        expect(result).toBe(expectedPath);
    });

    test('should return path on error', async () => {
        fs.readFileSync.mockImplementation(() => {
            throw new Error('read error');
        });

        const result = await processFavicon('/some/icon.ico');
        expect(result).toBe('/some/icon.ico');
    });
});
