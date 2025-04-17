const { secureExec } = require('../../src/utils/securexec');
const { sanitizeCommand } = require('../../src/utils/sanitize');
const child_process = require('child_process');

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

jest.mock('../../src/utils/sanitize', () => ({
    sanitizeCommand: jest.fn(),
}));

describe('secureExec', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should call execSync', () => {
        sanitizeCommand.mockReturnValue('safe_cmd');
        child_process.execSync.mockReturnValue(Buffer.from('result'));

        secureExec('');

        expect(child_process.execSync).toHaveBeenCalled();
    });

    test('should call sanitizeCommand with the original command', () => {
        sanitizeCommand.mockReturnValue('safe_cmd');
        child_process.execSync.mockReturnValue(Buffer.from('result'));

        secureExec('some dangerous command');

        expect(sanitizeCommand).toHaveBeenCalledWith('some dangerous command');
    });

    test('should call execSync with the sanitized command', () => {
        sanitizeCommand.mockReturnValue('echo safe');
        child_process.execSync.mockReturnValue(Buffer.from('ok'));

        secureExec('echo "hello"');

        expect(child_process.execSync).toHaveBeenCalledWith('echo safe', {});
    });

    test('should return the result of execSync', () => {
        sanitizeCommand.mockReturnValue('echo hello');
        const mockResult = Buffer.from('hello\n');
        child_process.execSync.mockReturnValue(mockResult);

        const result = secureExec('echo "hello"');

        expect(result).toBe(mockResult);
    });

    test('should pass options to execSync if provided', () => {
        sanitizeCommand.mockReturnValue('ls');
        const options = { cwd: '/tmp' };

        secureExec('ls', options);

        expect(child_process.execSync).toHaveBeenCalledWith('ls', options);
    });
});
