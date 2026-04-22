const THEMES = ['paper', 'ink', 'presenter', 'gradient'];
const FONTS = ['sans', 'mono', 'serif'];
const DEFAULTS = { theme: 'paper', font: 'sans' };

function parseFrontMatter(raw) {
  const config = { ...DEFAULTS };
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*(theme|font)\s*:\s*(.+?)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'theme' && THEMES.includes(value)) config.theme = value;
    if (key === 'font' && FONTS.includes(value)) config.font = value;
  }
  return config;
}

function parseSlides(content) {
  const normalized = content.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const parts = normalized.split(/^\s*---\s*$/m);

  if (parts.length === 1) {
    const slide = parts[0].trim();
    return {
      config: { ...DEFAULTS },
      slides: slide.length > 0 ? [slide] : [],
    };
  }

  const config = parseFrontMatter(parts[0]);
  const slides = parts.slice(1).map(s => s.trim()).filter(s => s.length > 0);
  return { config, slides };
}

module.exports = { parseSlides };
