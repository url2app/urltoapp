const { execSync } = require('child_process');
const { sanitizeCommand } = require('./sanitize');

function secureExec(command, options = {}) {
    const sanitizedCommand = sanitizeCommand(command);
    const result = execSync(sanitizedCommand, options);

    return result;
  }
  
module.exports = {
    secureExec
}