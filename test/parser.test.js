const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseSlides } = require('../lib/parser.js');

const DEFAULTS = { theme: 'paper', font: 'sans', transition: 'none' };

describe('parseSlides', () => {
  it('returns a single slide when no separator', () => {
    const result = parseSlides('Hello world');
    assert.deepStrictEqual(result.slides, ['Hello world']);
    assert.deepStrictEqual(result.config, DEFAULTS);
  });

  it('treats content before first --- as front matter, not a slide', () => {
    const result = parseSlides('some text\n---\nSlide one\n---\nSlide two');
    assert.deepStrictEqual(result.slides, ['Slide one', 'Slide two']);
  });

  it('handles --- with surrounding whitespace', () => {
    const result = parseSlides('\n  ---  \nB');
    assert.deepStrictEqual(result.slides, ['B']);
  });

  it('trims leading spaces and trailing whitespace from each slide', () => {
    const result = parseSlides('\n---\n  Hello  \n---\n  World  ');
    assert.deepStrictEqual(result.slides, ['Hello', 'World']);
  });

  it('skips empty slides', () => {
    const result = parseSlides('\n---\nA\n---\n\n---\nB');
    assert.deepStrictEqual(result.slides, ['A', 'B']);
  });

  it('preserves newlines within a slide', () => {
    const result = parseSlides('Line one\nLine two');
    assert.deepStrictEqual(result.slides, ['Line one\nLine two']);
  });

  it('handles three slides', () => {
    const result = parseSlides('\n---\nOne\n---\nTwo\n---\nThree');
    assert.deepStrictEqual(result.slides, ['One', 'Two', 'Three']);
  });

  it('returns empty array for empty input', () => {
    const result = parseSlides('');
    assert.deepStrictEqual(result.slides, []);
    assert.deepStrictEqual(result.config, DEFAULTS);
  });

  it('returns empty array for whitespace-only input', () => {
    const result = parseSlides('   \n\n  ');
    assert.deepStrictEqual(result.slides, []);
    assert.deepStrictEqual(result.config, DEFAULTS);
  });

  it('parses theme from front matter', () => {
    const result = parseSlides('theme: gradient\n---\nSlide');
    assert.equal(result.config.theme, 'gradient');
    assert.deepStrictEqual(result.slides, ['Slide']);
  });

  it('parses font from front matter', () => {
    const result = parseSlides('font: mono\n---\nSlide');
    assert.equal(result.config.font, 'mono');
  });

  it('parses both theme and font', () => {
    const result = parseSlides('theme: ink\nfont: serif\n---\nSlide');
    assert.equal(result.config.theme, 'ink');
    assert.equal(result.config.font, 'serif');
  });

  it('uses defaults for unrecognized keys', () => {
    const result = parseSlides('title: Hello\nauthor: Me\n---\nSlide');
    assert.deepStrictEqual(result.config, DEFAULTS);
    assert.deepStrictEqual(result.slides, ['Slide']);
  });

  it('ignores invalid theme/font values', () => {
    const result = parseSlides('theme: neon\nfont: comic\n---\nSlide');
    assert.deepStrictEqual(result.config, DEFAULTS);
  });

  it('parses transition from front matter', () => {
    const result = parseSlides('transition: wipe\n---\nSlide');
    assert.equal(result.config.transition, 'wipe');
  });

  it('ignores invalid transition values', () => {
    const result = parseSlides('transition: fade\n---\nSlide');
    assert.equal(result.config.transition, 'none');
  });

  it('handles empty front matter', () => {
    const result = parseSlides('\n---\nSlide');
    assert.deepStrictEqual(result.config, DEFAULTS);
    assert.deepStrictEqual(result.slides, ['Slide']);
  });

  it('preserves leading tabs on lines', () => {
    const result = parseSlides('\n---\n\tcentered\nnot centered');
    assert.deepStrictEqual(result.slides, ['\tcentered\nnot centered']);
  });

  it('preserves leading tabs in single-slide mode', () => {
    const result = parseSlides('\tcentered');
    assert.deepStrictEqual(result.slides, ['\tcentered']);
  });

  it('strips leading spaces but keeps tabs', () => {
    const result = parseSlides('\n---\n  \tindented');
    assert.deepStrictEqual(result.slides, ['\tindented']);
  });

  it('preserves mid-line tabs without centering', () => {
    const result = parseSlides('hello\tworld');
    assert.deepStrictEqual(result.slides, ['hello\tworld']);
    assert.ok(!result.slides[0].startsWith('\t'));
  });
});
