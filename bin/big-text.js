#!/usr/bin/env node

const path = require('node:path');
const fs = require('node:fs');
const { startServer } = require('../lib/server.js');

const args = process.argv.slice(2);

const THEMES = ['paper', 'ink', 'presenter'];
const FONTS = ['sans', 'mono', 'serif'];

function parseArgs(args) {
  let filePath = null;
  let theme = 'paper';
  let font = 'sans';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--theme' && args[i + 1]) {
      theme = args[++i];
    } else if (args[i] === '--font' && args[i + 1]) {
      font = args[++i];
    } else if (!args[i].startsWith('-')) {
      filePath = args[i];
    }
  }

  return { filePath, theme, font };
}

const USAGE = 'Usage: big-text <file> [--theme paper|ink|presenter] [--font sans|mono|serif]';

if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

const { filePath, theme, font } = parseArgs(args);

if (!filePath) {
  console.error(USAGE);
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

if (!THEMES.includes(theme)) {
  console.error(`Invalid theme: ${theme}. Choose from: ${THEMES.join(', ')}`);
  process.exit(1);
}

if (!FONTS.includes(font)) {
  console.error(`Invalid font: ${font}. Choose from: ${FONTS.join(', ')}`);
  process.exit(1);
}

startServer({ filePath, theme, font }).then(({ port }) => {
  console.log(`big-text running at http://localhost:${port}`);
  console.log(`Watching: ${path.resolve(filePath)}`);
  console.log('Press Ctrl+C to stop');
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
