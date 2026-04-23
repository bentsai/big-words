const THEMES = ['paper', 'ink', 'presenter', 'gradient'];
const FONTS = ['sans', 'mono', 'serif'];
const TRANSITIONS = ['wipe'];
const DEFAULTS = { theme: 'paper', font: 'sans', transition: 'none' };

function parseFrontMatter(raw) {
  const config = { ...DEFAULTS };
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*(theme|font|transition)\s*:\s*(.+?)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    if (key === 'theme' && THEMES.includes(value)) config.theme = value;
    if (key === 'font' && FONTS.includes(value)) config.font = value;
    if (key === 'transition' && TRANSITIONS.includes(value)) config.transition = value;
  }
  return config;
}

function parseSlide(s) {
  // Strip one structural newline from each end (artifact of --- splitting)
  let trimmed = s;
  if (trimmed.startsWith('\n')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('\n')) trimmed = trimmed.slice(0, -1);

  const lines = trimmed.split('\n');
  const hasLeadingBlank = lines.length > 0 && lines[0].trim() === '';
  const hasTrailingBlank = lines.length > 0 && lines[lines.length - 1].trim() === '';

  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const text = lines.map(l => l.replace(/\s+$/, '').replace(/^[ ]+/, '')).join('\n');
  if (!text) return null;

  const hasSubtext = text.includes('\n\n');
  let align = 'center';
  if (!hasSubtext && hasTrailingBlank && !hasLeadingBlank) align = 'top';
  else if (!hasSubtext && hasLeadingBlank && !hasTrailingBlank) align = 'bottom';

  return { text, align };
}

function parseSlides(content) {
  const normalized = content.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const parts = normalized.split(/^[ \t]*---[ \t]*$/m);

  if (parts.length === 1) {
    const slide = parseSlide(parts[0]);
    return {
      config: { ...DEFAULTS },
      slides: slide ? [slide] : [],
    };
  }

  const config = parseFrontMatter(parts[0]);
  const slides = parts.slice(1)
    .map(parseSlide)
    .filter(s => s !== null);
  return { config, slides };
}

module.exports = { parseSlides };
