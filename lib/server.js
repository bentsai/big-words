const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const { parseSlides } = require('./parser.js');

function startServer({ filePath, port = 0, openBrowser = true }) {
  return new Promise((resolve) => {
    const absPath = path.resolve(filePath);
    const clientHtmlPath = path.join(__dirname, 'client.html');
    const title = path.basename(filePath, path.extname(filePath));

    let parsed = parseSlides(fs.readFileSync(absPath, 'utf-8'));

    const httpServer = http.createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(clientHtmlPath, 'utf-8'));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    const wss = new WebSocketServer({ server: httpServer });

    function buildMessage() {
      return JSON.stringify({ slides: parsed.slides, theme: parsed.config.theme, font: parsed.config.font, transition: parsed.config.transition, title });
    }

    function broadcast() {
      const msg = buildMessage();
      for (const client of wss.clients) {
        if (client.readyState === 1) client.send(msg);
      }
    }

    wss.on('connection', (ws) => {
      ws.send(buildMessage());
    });

    const watcher = chokidar.watch(absPath, { ignoreInitial: true });
    watcher.on('change', () => {
      try {
        parsed = parseSlides(fs.readFileSync(absPath, 'utf-8'));
        broadcast();
      } catch (err) {
        console.error('Error reading file:', err.message);
      }
    });

    httpServer.listen(port, () => {
      const assignedPort = httpServer.address().port;

      if (openBrowser) {
        const { exec } = require('node:child_process');
        const url = `http://localhost:${assignedPort}`;
        const cmd = process.platform === 'darwin' ? 'open'
          : process.platform === 'win32' ? 'start'
          : 'xdg-open';
        exec(`${cmd} ${url}`);
      }

      resolve({
        port: assignedPort,
        close() {
          return new Promise((res) => {
            watcher.close();
            wss.close();
            httpServer.close(res);
          });
        },
      });
    });
  });
}

module.exports = { startServer };
