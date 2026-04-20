const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 720 },
  },
});
