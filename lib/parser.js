function parseSlides(content) {
  return content
    .split(/^\s*---\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

module.exports = { parseSlides };
