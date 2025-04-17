const fs = require('fs');
const Logger = require('../../src/utils/logger');

jest.mock('fs');

describe('Logger', () => {
    const OLD_ENV = process.env;
    let logSpy;

    beforeEach(() => {
        process.env = { ...OLD_ENV };
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        fs.appendFileSync.mockClear();
    });

    afterEach(() => {
        logSpy.mockRestore();
        process.env = OLD_ENV;
    });

    test('info logs and writes to file', () => {
        const logger = new Logger('test');
        logger.info('This is info');

        expect(logSpy).toHaveBeenCalled();
        expect(fs.appendFileSync).toHaveBeenCalledWith(
            expect.stringContaining('test-'),
            expect.stringMatching(/INFO \| This is info/)
        );
    });

    test('success logs and writes to file', () => {
        const logger = new Logger('test');
        logger.success('Success!');

        expect(logSpy).toHaveBeenCalled();
        expect(fs.appendFileSync).toHaveBeenCalledWith(
            expect.stringContaining('test-'),
            expect.stringMatching(/SUCCESS \| Success!/)
        );
    });

    test('warn logs and writes to file', () => {
        const logger = new Logger('test');
        logger.warn('Careful!');

        expect(logSpy).toHaveBeenCalled();
        expect(fs.appendFileSync).toHaveBeenCalledWith(
            expect.stringContaining('test-'),
            expect.stringMatching(/WARN \| Careful!/)
        );
    });

    test('error logs and writes error and stack if provided', () => {
        const logger = new Logger('test');
        const error = new Error('oops');

        logger.error('Something went wrong', error);

        const hasErrorMessage = fs.appendFileSync.mock.calls.some(call =>
            call[1].includes('ERROR')
        );

        const hasStackTrace = fs.appendFileSync.mock.calls.some(call =>
            call[1].includes('Stack trace: Error: oops')
        );

        console.log('hasErrorMessage:', hasErrorMessage);
        console.log('hasStackTrace:', hasStackTrace);

        expect(hasErrorMessage).toBe(true);
        expect(hasStackTrace).toBe(true);
    });

    test('debug does not log to console if debug is off', () => {
        jest.mock('../../src/utils/settings', () => ({
            getSetting: () => false
        }));
        const logger = new Logger('test');
        logger.debug('Should not log');

        expect(logSpy).not.toHaveBeenCalled();
        expect(fs.appendFileSync).toHaveBeenCalledWith(
            expect.stringContaining('test-'),
            expect.stringMatching(/DEBUG \| Should not log/)
        );
    });

    test('debug logs to console if DEBUG is set', () => {
        process.env.DEBUG = '1';
        jest.mock('../../src/utils/settings', () => ({
            getSetting: () => false
        }));
        const logger = new Logger('test');
        logger.debug('Debug mode on');

        expect(logSpy).toHaveBeenCalled();
        expect(fs.appendFileSync).toHaveBeenCalledWith(
            expect.stringContaining('test-'),
            expect.stringMatching(/DEBUG \| Debug mode on/)
        );
    });
});
