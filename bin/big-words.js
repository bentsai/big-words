#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('../lib/server.js');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: big-words <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

startServer({ filePath }).then(({ port }) => {
  console.log(`big-words running at http://localhost:${port}`);
  console.log(`Watching: ${path.resolve(filePath)}`);
  console.log('Press Ctrl+C to stop');
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
