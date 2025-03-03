function sanitizeInput(userInput) {
    return userInput.replace(/[^a-zA-Z0-9_-\s.]/g, '_');
}

module.exports = {
    sanitizeInput
}