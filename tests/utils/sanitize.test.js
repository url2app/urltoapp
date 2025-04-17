const { sanitizeInput, sanitizeCommand } = require('../../src/utils/sanitize');

console.log = jest.fn();


describe('sanitizeInput', () => {
    it('should sanitize inputs like urls with _ to avoid injections', () => {
        expect(sanitizeInput("Hello, World!")).toBe("Hello_ World_");
        expect(sanitizeInput("Test_123-abc.def:ghi@jkl%")).toBe("Test_123-abc.def:ghi@jkl%");
        expect(sanitizeInput("")).toBe("");
        expect(sanitizeInput(" multiple   spaces ")).toBe(" multiple   spaces ");
    });
});

describe('sanitizeCommand', () => {
    it('should sanitize commands to avoid injections', () => {
        expect(sanitizeCommand("ls -la /tmp/")).toBe("ls -la /tmp/");
        expect(sanitizeCommand("echo 'Hello, World!'")).toBe("echo 'Hello_ World_'");
        expect(sanitizeCommand("")).toBe("");
        expect(sanitizeCommand("C:\\Windows\\System32")).toBe("C:\\Windows\\System32");
    });
});