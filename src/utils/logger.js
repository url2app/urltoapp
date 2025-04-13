const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { LOGS_DIR } = require('./config');

class Logger {
  constructor(component) {
    this.component = component;
    this.logFile = path.join(LOGS_DIR, `${component}-${new Date().toISOString().split('T')[0]}.log`);
  }

  _format(status, message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    return `[${timestamp}] - ${status} | ${message}`;
  }

  _writeToFile(formattedMessage) {
    fs.appendFileSync(this.logFile, formattedMessage + '\n');
  }

  info(message) {
    const formattedMessage = this._format('INFO', message);
    console.log(chalk.blueBright(formattedMessage));
    this._writeToFile(formattedMessage);
  }

  success(message) {
    const formattedMessage = this._format('SUCCESS', message);
    console.log(chalk.green(formattedMessage));
    this._writeToFile(formattedMessage);
  }

  warn(message) {
    const formattedMessage = this._format('WARN', message);
    console.log(chalk.yellow(formattedMessage));
    this._writeToFile(formattedMessage);
  }

  error(message, error = '') {
    const formattedMessage = this._format('ERROR', `${message}${error ? ' ' + error : ''}`);
    console.log(chalk.red(formattedMessage));
    this._writeToFile(formattedMessage);
    
    if (error && error.stack) {
      this._writeToFile(`Stack trace: ${error.stack}`);
    }
  }

  debug(message) {
    const formattedMessage = this._format('DEBUG', message);
    if (process.env.DEBUG) {
      console.log(chalk.gray(formattedMessage));
    }
    this._writeToFile(formattedMessage);
  }
}

module.exports = Logger;
