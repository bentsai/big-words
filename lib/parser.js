function parseSlides(content) {
  const normalized = content.replace(/\r\n?|\u2028|\u2029/g, '\n');
  return normalized
    .split(/^\s*---\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

module.exports = { parseSlides };
