#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { startServer } = require('../lib/server.js');

const args = process.argv.slice(2);
let filePath;
let port = 0;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[++i], 10);
    if (!Number.isFinite(port) || port < 0) {
      console.error('Invalid port number');
      process.exit(1);
    }
  }
  else if (!filePath) { filePath = args[i]; }
}

if (!filePath) {
  console.error('Usage: big-words [--port <port>] <file>');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

startServer({ filePath, port }).then(({ port }) => {
  console.log(`big-words running at http://localhost:${port}`);
  console.log(`Watching: ${path.resolve(filePath)}`);
  console.log('Press Ctrl+C to stop');
}).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
