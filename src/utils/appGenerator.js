//Todo: replace electron logo with the one of the app in popup windows


const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

const logger = new Logger('appGenerator');

function generateMainJs(appName, url, iconPath, options = {}) {
  const width = options.width || 1200;
  const height = options.height || 800;

  const templatePath = path.join(__dirname, 'app.js');
  let template;
  
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    logger.error('Error reading electronApp.js template', error);
    throw new Error('Failed to read Electron application template');
  }

  const mainJs = template
    .replace('{APP_NAME}', appName)
    .replace('{APP_URL}', url)
    .replace('{APP_ICON_PATH}', iconPath.replace(/\\/g, '\\\\'))
    .replace('{WINDOW_WIDTH}', width)
    .replace('{WINDOW_HEIGHT}', height);

  return mainJs;
}

async function createPackageJson(appName, iconPath, isExecutable = false, createSetup = false) {
  const u2aPackagePath = path.resolve(__dirname, '../../package.json');

  let u2aVersion = '1.0.0';
  try {
    const u2aPackageContent = fs.readFileSync(u2aPackagePath, 'utf8');
    const u2aPackage = JSON.parse(u2aPackageContent);
    u2aVersion = u2aPackage.version || u2aVersion;
  } catch (error) {
    logger.error('Error while fetching u2a package.json', error);
  }

  if (createSetup) {
    const { processFavicon } = require('./favicon');
    iconPath = await processFavicon(iconPath);
  }

  const packageJson = {
    name: `u2a-${appName.replace(/\s+/g, '-')}`,
    version: u2aVersion,
    description: `Web app for ${appName}`,
    main: 'main.js',
    author: `${appName}`,
    scripts: {
      start: 'electron .'
    },
    dependencies: {
      electron: '^22.0.0'
    },
    build: {
      appId: `com.u2a.${appName.replace(/\s+/g, '-')}`,
      productName: appName,
      icon: iconPath
    }
  };

  if (isExecutable) {
    packageJson.devDependencies = {
      "electron-packager": "^17.1.1",
      "electron-builder": "^24.6.3",
      "electron": "^22.0.0"
    };

    packageJson.dependencies = {};
    
    packageJson.scripts.package = "electron-packager . --overwrite --asar";
    packageJson.scripts.setup = "electron-builder";
  }

  if (isExecutable && createSetup) {
    packageJson.build = {
      ...packageJson.build,
      appId: `com.u2a.${appName.replace(/\s+/g, '-')}`,
      productName: appName,
      directories: {
        output: "installer"
      },
      files: [
        "**/*",
        "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
        "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
        "!**/node_modules/*.d.ts",
        "!**/node_modules/.bin",
        "!**/.{idea,git,cache,build,dist}",
        "!dist/**/*",
        "!installer/**/*"
      ],
      win: {
        target: "nsis",
        icon: iconPath
      },
      mac: {
        target: "dmg"
      },
      linux: {
        target: "AppImage",
        icon: iconPath
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true
      }
    };
  }

  return packageJson;
}

module.exports = {
  generateMainJs,
  createPackageJson
};