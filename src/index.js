#!/usr/bin/env node

const { program } = require('commander');
const { createApp } = require('./commands/create');
const { listApps } = require('./commands/list');
const { removeApp } = require('./commands/remove');
const { version } = require('../package.json');
const { setupConfig } = require('./utils/config');

setupConfig();

program
  .name('u2a')
  .description('Convert websites into desktop applications')
  .version(version);

program
  .command('create <url>')
  .description('Create a new application from a URL')
  .action(createApp);

program
  .command('list')
  .description('List all available applications')
  .action(listApps);

program
  .command('remove <url>')
  .description('Remove an existing application')
  .action(removeApp);

program.on('command:*', () => {
  console.error(`\nInvalid command: ${program.args.join(' ')}`);
  console.log(`\nUse --help to see the list of available commands.`);
  process.exit(1);
});

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
