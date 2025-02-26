<div align="center">
  <a href="#" style="display: block; text-align: center;">
    <img
      alt="Image of this repo"
      src="https://togp.xyz?owner=douxxtech&repo=urltoapp&theme=json-dark-all&cache=false"
      type="image/svg+xml"
      style="border-radius: 20px; overflow: hidden;"
    />
    <h1 align="center">U2A (URL to App)</h1>
  </a>
</div>

![U2A Banner](https://img.shields.io/badge/U2A-URL%20to%20App-blue)
![License](https://img.shields.io/badge/license-GPL--3.0-green)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

**Convert any website into a desktop application with a single command.**

U2A is a command-line utility that allows you to transform any web URL into a standalone desktop application using Electron. It works across Windows, macOS, and Linux platforms.

## Features

- 🚀 Transform any website into a desktop app with one command
- 🖥️ Cross-platform support (Windows, macOS, Linux)
- 🔄 Automatic favicon retrieval for app icons
- 📋 Easy management of created applications
- 📊 Detailed logging for troubleshooting
- 🏷️ Customizable application names and window sizes

## Installation

```bash
npm install -g u2a
```

## Usage

### Creating an App

To create a desktop application from a website:

```bash
u2a create <url> [--name <appName>] [--width <width>] [--height <height>]
```

Example:
```bash
u2a create github.com --name "GitHub App" --width 1200 --height 800
```

This will:
1. Download the website's favicon (if available)
2. Create an Electron wrapper application with the specified name and window size
3. Add the application to your system menu/launcher
4. Track the application in the U2A database

### Listing Your Apps

To see all the applications you've created:

```bash
u2a list
```

This will display a list of all created applications with their details:
- Application name
- Original URL
- Creation date
- Application directory

### Removing an App

To remove an application:

```bash
u2a remove <appName>
```

Example:
```bash
u2a remove "GitHub App"
```

This will:
1. Remove the application from your system menu/launcher
2. Delete the application files
3. Remove the entry from the U2A database

## How It Works

U2A creates a minimal Electron application that loads the specified website URL. It:

1. Downloads the site's favicon to use as the application icon
2. Generates a main.js file with Electron configuration
3. Creates a package.json with necessary dependencies
4. Installs required Node modules
5. Adds appropriate desktop integration for your operating system
6. Maintains a database of created applications for easy management

## System Requirements

- Node.js 12.0 or higher
- npm 6.0 or higher
- Windows, macOS, or Linux

## Configuration

U2A stores all configuration, application data, and logs in the `.u2a` directory in your home folder:

- `~/.u2a/apps/` - Application files
- `~/.u2a/logs/` - Log files
- `~/.u2a/db.json` - Application database

## Troubleshooting

If you encounter any issues, check the log files in the `~/.u2a/logs/` directory. Each component has its own log file with detailed information.

Set the `DEBUG` environment variable to see additional debug messages:

```bash
DEBUG=1 u2a create example.com
```

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Author

Created by [Douxx](https://douxx.tech)
