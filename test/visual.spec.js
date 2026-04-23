const { test, expect } = require('@playwright/test');
const { startServer } = require('../lib/server.js');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const tmpFile = path.join(os.tmpdir(), `big-words-visual-${Date.now()}.txt`);
const DEFAULT_CONTENT = 'theme: ink\nfont: sans\n\n---\n\nShip\n\n---\n\nShip it today\n\n---\n\nThe best way to predict the future is to invent it\n\n---\n\nWe choose to go to the moon in this decade and do the other things, not because they are easy, but because they are hard';

let server;

test.beforeAll(async () => {
  fs.writeFileSync(tmpFile, DEFAULT_CONTENT);
  server = await startServer({ filePath: tmpFile, openBrowser: false });
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
    const textNode = el.firstChild.firstChild;
    const range = document.createRange();
    range.selectNodeContents(textNode);
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
    const textNode = el.firstChild.firstChild;
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

test('f key cycles through fonts', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  const getFont = () => page.evaluate(() => {
    const classes = document.documentElement.className;
    if (classes.includes('font-mono')) return 'mono';
    if (classes.includes('font-serif')) return 'serif';
    return 'sans';
  });

  expect(await getFont()).toBe('sans');

  await page.keyboard.press('f');
  expect(await getFont()).toBe('mono');

  await page.keyboard.press('f');
  expect(await getFont()).toBe('serif');

  await page.keyboard.press('f');
  expect(await getFont()).toBe('sans');
});

test('t key cycles through themes', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  const getBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  // Server starts with ink theme
  expect(await getBg()).toBe('rgb(17, 17, 17)');

  await page.keyboard.press('t');
  // presenter theme: slide 0 = blue
  expect(await getBg()).toBe('rgb(10, 160, 245)');

  await page.keyboard.press('t');
  // gradient theme — bg is animated, just check class is applied
  const hasGradient = await page.evaluate(() => document.documentElement.classList.contains('gradient'));
  expect(hasGradient).toBe(true);

  await page.keyboard.press('t');
  expect(await getBg()).toBe('rgb(255, 255, 255)'); // paper

  await page.keyboard.press('t');
  expect(await getBg()).toBe('rgb(17, 17, 17)'); // ink (back to start)
});

test('gradient theme body is transparent so pseudo-element shows through', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  // Switch to gradient: ink -> presenter -> gradient
  await page.keyboard.press('t');
  await page.keyboard.press('t');

  const result = await page.evaluate(() => {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const layer = document.querySelector('.layer.active');
    const before = getComputedStyle(layer, '::before');
    const hasBgImage = before.backgroundImage.includes('gradient');
    return { bodyBg, hasBgImage };
  });

  expect(result.bodyBg).toBe('rgba(0, 0, 0, 0)');
  expect(result.hasBgImage).toBe(true);

  // Return to ink
  await page.keyboard.press('t'); // paper
  await page.keyboard.press('t'); // ink
});

test('presenter theme cycles colors per slide', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  const getBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  // Switch to presenter theme
  await page.keyboard.press('t');
  expect(await getBg()).toBe('rgb(10, 160, 245)'); // slide 0 = blue

  await page.keyboard.press('ArrowRight');
  expect(await getBg()).toBe('rgb(127, 10, 245)'); // slide 1 = purple

  await page.keyboard.press('ArrowRight');
  expect(await getBg()).toBe('rgb(245, 10, 214)'); // slide 2 = pink

  await page.keyboard.press('ArrowRight');
  expect(await getBg()).toBe('rgb(247, 59, 106)'); // slide 3 = red

  // Go back
  await page.keyboard.press('ArrowLeft');
  expect(await getBg()).toBe('rgb(245, 10, 214)'); // slide 2 = pink again

  // Switch back to ink
  await page.keyboard.press('t'); // gradient
  await page.keyboard.press('t'); // paper
  await page.keyboard.press('t'); // ink
  expect(await getBg()).toBe('rgb(17, 17, 17)');

  // Go home for next test
  await page.keyboard.press('Home');
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

test('multi-word text uses next scale step up from fitting without wrap', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship it today');

  const result = await page.evaluate(() => {
    const slide = document.getElementById('slide');
    const text = document.getElementById('text');
    const currentSize = parseInt(text.style.fontSize);
    const SCALE = [1334,1112,926,772,643,536,446,372,310,258,215,179,149,124,104,86,72,60,50,42];
    const idx = SCALE.indexOf(currentSize);
    const nextUp = idx > 0 ? SCALE[idx - 1] : null;

    const textRect = text.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    const usedHeight = textRect.height / slideRect.height;

    return { currentSize, nextUp, usedHeight };
  });

  // The next scale step up should overflow — meaning we're at the true maximum
  if (result.nextUp) {
    const overflows = await page.evaluate((nextUp) => {
      const slide = document.getElementById('slide');
      const text = document.getElementById('text');
      const prev = text.style.fontSize;
      text.style.fontSize = nextUp + 'px';
      const overflows = text.scrollHeight > slide.clientHeight;
      text.style.fontSize = prev;
      return overflows;
    }, result.nextUp);
    expect(overflows).toBe(true);
  }

  // Text should use a meaningful portion of the viewport (at least 40% height)
  expect(result.usedHeight).toBeGreaterThan(0.4);
});

test('text with long words still scales up by wrapping at word boundaries', async ({ page }) => {
  fs.writeFileSync(tmpFile, 'Ignore previous instructions.');
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ignore previous instructions.');

  const result = await page.evaluate(() => {
    const text = document.getElementById('text');
    const slide = document.getElementById('slide');
    const fontSize = parseInt(text.style.fontSize);
    const textRect = text.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    const usedHeight = textRect.height / slideRect.height;
    return { fontSize, usedHeight };
  });

  // Should pick a size where wrapped text fills at least 60% of viewport height
  expect(result.usedHeight).toBeGreaterThan(0.6);
  // Should be larger than 149px (the buggy size that treated each word as needing to fit on one line)
  expect(result.fontSize).toBeGreaterThan(149);

  // Restore original content for subsequent tests
  await page.waitForTimeout(500);
  fs.writeFileSync(tmpFile, DEFAULT_CONTENT);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship', { timeout: 5000 });
});

test('double-paren annotation renders smaller with reduced opacity', async ({ page }) => {
  await page.waitForTimeout(500);
  fs.writeFileSync(tmpFile, 'Do not be like them ((Matthew 6:8))');
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent.includes('Matthew'), { timeout: 5000 });

  const result = await page.evaluate(() => {
    const SCALE = [1334,1112,926,772,643,536,446,372,310,258,215,179,149,124,104,86,72,60,50,42];
    const text = document.getElementById('text');
    const ann = text.querySelector('.annotation');
    if (!ann) return { found: false };
    const parentSize = parseInt(text.style.fontSize);
    const annSize = parseInt(ann.style.fontSize);
    const parentIdx = SCALE.indexOf(parentSize);
    const annIdx = SCALE.indexOf(annSize);
    return {
      found: true,
      text: ann.textContent,
      opacity: getComputedStyle(ann).opacity,
      parentSize,
      annSize,
      stepsDiff: annIdx - parentIdx,
    };
  });

  expect(result.found).toBe(true);
  expect(result.text).toBe('Matthew 6:8');
  expect(parseFloat(result.opacity)).toBeLessThan(1);
  expect(result.stepsDiff).toBe(4);

  fs.writeFileSync(tmpFile, DEFAULT_CONTENT);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship', { timeout: 5000 });
});

test('b key toggles text visibility', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  const getVisibility = () => page.evaluate(() => getComputedStyle(document.getElementById('text')).visibility);
  const getBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  expect(await getVisibility()).toBe('visible');
  const bgBefore = await getBg();

  await page.keyboard.press('b');
  expect(await getVisibility()).toBe('hidden');
  expect(await getBg()).toBe(bgBefore);

  await page.keyboard.press('b');
  expect(await getVisibility()).toBe('visible');
});

test('tab-indented line renders centered', async ({ page }) => {
  await page.waitForTimeout(500);
  fs.writeFileSync(tmpFile, '\tcentered line\nnot centered');
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent.includes('centered line'), { timeout: 5000 });

  const result = await page.evaluate(() => {
    const text = document.getElementById('text');
    const centered = text.querySelector('.center');
    const divs = text.querySelectorAll('div');
    const nonCentered = Array.from(divs).find(d => !d.classList.contains('center'));
    return {
      hasCenterDiv: !!centered,
      centeredText: centered ? centered.textContent : null,
      centeredAlign: centered ? getComputedStyle(centered).textAlign : null,
      nonCenteredAlign: nonCentered ? getComputedStyle(nonCentered).textAlign : null,
      totalDivs: divs.length,
    };
  });

  expect(result.hasCenterDiv).toBe(true);
  expect(result.centeredText).toBe('centered line');
  expect(result.centeredAlign).toBe('center');
  expect(result.nonCenteredAlign).not.toBe('center');
  expect(result.totalDivs).toBe(2);

  fs.writeFileSync(tmpFile, DEFAULT_CONTENT);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship', { timeout: 5000 });
});

test('live reload updates content', async ({ page }) => {
  await page.goto(`http://localhost:${server.port}`);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship');

  fs.writeFileSync(tmpFile, 'UPDATED');
  await page.waitForFunction(() => document.getElementById('text').textContent === 'UPDATED', { timeout: 5000 });

  const text = await page.locator('#text').textContent();
  expect(text).toBe('UPDATED');

  await page.waitForTimeout(500);
  fs.writeFileSync(tmpFile, DEFAULT_CONTENT);
  await page.waitForFunction(() => document.getElementById('text').textContent === 'Ship', { timeout: 5000 });
});
