#!/usr/bin/env node

const ver = process.versions.node;

if (ver < '22.0.0') {
  console.error("You need a nodejs installation equal or superior to 22.0.0. Please upgrade your node installation and retry.");
  process.exit(1);
}

const { program } = require('commander');
const { createApp } = require('./commands/create');
const { listApps } = require('./commands/list');
const { removeApp } = require('./commands/remove');
const { version } = require('../package.json');
const { setupConfig } = require('./utils/config');
const { checkNotRoot } = require('./utils/noroot');
const { checkVersion } = require('./utils/versionCheck');

(async () => {
  
  program
    .name('u2a')
    .description('Convert websites into desktop applications')
    .version(version)
    .option('--allowroot', 'Allow running the application as root/administrator');

  program
    .command('create <url>')
    .description('Create a new application from a URL')
    .option('--name <name>', 'Specify the application name')
    .option('--width <width>', 'Specify the window width', parseInt)
    .option('--height <height>', 'Specify the window height', parseInt)
    .option('--executable [windows|darwin|linux]', 'Create a single executable for the target system')
    .option('--arch [x64|armv7l|arm64|universal]', 'Specify the target architecture for the executable')
    .option('--setup', 'Creates a setup file for the executable')
    .action((url, options) => {
      createApp(url, options);
    });

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

  if (process.argv.length <= 2) {
    program.help();
  }

  const parsed = program.parse(process.argv);
  const options = parsed.opts();
  
  await checkNotRoot(options.allowroot).catch(() => {});
  await checkVersion().catch(() => {});

  setupConfig();

})();
