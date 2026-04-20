const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { startServer } = require('../lib/server.js');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

function connectAndWaitForMessage(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Message timeout'));
    }, 5000);

    ws.on('message', (data) => {
      clearTimeout(timeout);
      resolve({ ws, msg: JSON.parse(data.toString()) });
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

describe('server', () => {
  const tmpFile = path.join(os.tmpdir(), `big-text-test-${Date.now()}.txt`);
  let server;

  after(async () => {
    if (server) await server.close();
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it('serves HTML on GET /', async () => {
    fs.writeFileSync(tmpFile, 'Hello\n---\nWorld');
    server = await startServer({
      filePath: tmpFile,
      theme: 'paper',
      font: 'sans',
      openBrowser: false,
    });
    const res = await httpGet(`http://localhost:${server.port}/`);
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.body.includes('id="text"'));
  });

  it('sends slides over WebSocket on connect', async () => {
    const { ws, msg } = await connectAndWaitForMessage(server.port);
    assert.deepStrictEqual(msg.slides, ['Hello', 'World']);
    assert.equal(msg.theme, 'paper');
    assert.equal(msg.font, 'sans');
    ws.close();
  });

  it('sends updated slides when file changes', async () => {
    const { ws, msg: initialMsg } = await connectAndWaitForMessage(server.port);
    assert.deepStrictEqual(initialMsg.slides, ['Hello', 'World']);

    // Wait for file change and next message
    const updatePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('File change message timeout'));
      }, 2000);

      ws.once('message', (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });
    });

    // Small delay to ensure chokidar is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    fs.writeFileSync(tmpFile, 'Updated');

    const msg = await updatePromise;
    assert.deepStrictEqual(msg.slides, ['Updated']);
    ws.close();
  });
});
