const Logger = require('./logger');
const logger = new Logger('sanitize');


function sanitizeInput(userInput) {
    const sInput = userInput.replace(/[^a-zA-Z0-9_\-.\s:/@%]/g, '_');
    logger.debug(`Original content: ${userInput} | Sanitized content: ${sInput}`);
    return sInput;
}

function sanitizeCommand(command) {
    const sCommand = command.replace(/[^\w\-.:/@\\ ="']/g, '_');
    logger.debug(`Original content: ${command} | Sanitized content: ${sCommand}`);
    return sCommand;
}


module.exports = {
    sanitizeInput,
    sanitizeCommand
}