const { test, expect } = require('@playwright/test');
const { startServer } = require('../lib/server.js');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const tmpFile = path.join(os.tmpdir(), `big-text-visual-${Date.now()}.txt`);

let server;

test.beforeAll(async () => {
  fs.writeFileSync(tmpFile, 'Ship\n\n---\n\nShip it today\n\n---\n\nThe best way to predict the future is to invent it\n\n---\n\nWe choose to go to the moon in this decade and do the other things, not because they are easy, but because they are hard');
  server = await startServer({ filePath: tmpFile, theme: 'ink', font: 'sans', openBrowser: false });
});

test.afterAll(async () => {
  if (server) await server.close();
  try { fs.unlinkSync(tmpFile); } catch {}
});

test('single word is never broken across lines', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  const lines = await page.evaluate(() => {
    const el = document.getElementById('text');
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = range.getClientRects();
    return rects.length;
  });

  expect(lines).toBe(1);
});

test('single word fills significant viewport width', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  const ratio = await page.evaluate(() => {
    const el = document.getElementById('text');
    return el.getBoundingClientRect().width / window.innerWidth;
  });

  expect(ratio).toBeGreaterThan(0.5);
});

test('multi-word text wraps at spaces not mid-word', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship it today');

  const hasBrokenWords = await page.evaluate(() => {
    const el = document.getElementById('text');
    const text = el.textContent;
    const words = text.split(/\s+/);
    const range = document.createRange();
    const textNode = el.firstChild;
    let pos = 0;
    for (const word of words) {
      const start = text.indexOf(word, pos);
      range.setStart(textNode, start);
      range.setEnd(textNode, start + word.length);
      const rects = range.getClientRects();
      if (rects.length > 1) return true;
      pos = start + word.length;
    }
    return false;
  });

  expect(hasBrokenWords).toBe(false);
});

test('text does not overflow viewport', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  for (let i = 0; i < 4; i++) {
    const overflow = await page.evaluate(() => {
      const slide = document.getElementById('slide');
      const text = document.getElementById('text');
      const slideRect = slide.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();
      return {
        overflowRight: textRect.right > slideRect.right + 1,
        overflowBottom: textRect.bottom > slideRect.bottom + 1,
      };
    });

    expect(overflow.overflowRight).toBe(false);
    expect(overflow.overflowBottom).toBe(false);

    if (i < 3) await page.keyboard.press('ArrowRight');
  }
});

test('keyboard navigation works', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#text')).toHaveText('Ship it today');

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#text')).toContainText('best way to predict');

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#text')).toHaveText('Ship it today');

  await page.keyboard.press('Home');
  await expect(page.locator('#text')).toHaveText('Ship');

  await page.keyboard.press('End');
  await expect(page.locator('#text')).toContainText('choose to go to the moon');
});

test('themes apply correct colors', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  const colors = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const fg = getComputedStyle(document.getElementById('text')).color;
    return { bg, fg };
  });

  expect(colors.bg).toBe('rgb(17, 17, 17)');
  expect(colors.fg).toBe('rgb(240, 240, 240)');
});

test('live reload updates content', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  fs.writeFileSync(tmpFile, 'UPDATED');
  await page.waitForFunction(() => document.getElementById('text').textContent === 'UPDATED', { timeout: 5000 });

  const text = await page.locator('#text').textContent();
  expect(text).toBe('UPDATED');

  fs.writeFileSync(tmpFile, 'Ship\n\n---\n\nShip it today\n\n---\n\nThe best way to predict the future is to invent it\n\n---\n\nWe choose to go to the moon in this decade and do the other things, not because they are easy, but because they are hard');
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship', { timeout: 5000 });
});
