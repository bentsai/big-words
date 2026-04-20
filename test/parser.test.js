const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseSlides } = require('../lib/parser.js');

describe('parseSlides', () => {
  it('returns a single slide when no separator', () => {
    assert.deepStrictEqual(parseSlides('Hello world'), ['Hello world']);
  });

  it('splits on --- separator', () => {
    const input = 'Slide one\n\n---\n\nSlide two';
    assert.deepStrictEqual(parseSlides(input), ['Slide one', 'Slide two']);
  });

  it('handles --- with surrounding whitespace', () => {
    const input = 'A\n  ---  \nB';
    assert.deepStrictEqual(parseSlides(input), ['A', 'B']);
  });

  it('trims leading and trailing whitespace from each slide', () => {
    const input = '  Hello  \n---\n  World  ';
    assert.deepStrictEqual(parseSlides(input), ['Hello', 'World']);
  });

  it('skips empty slides', () => {
    const input = 'A\n---\n\n---\nB';
    assert.deepStrictEqual(parseSlides(input), ['A', 'B']);
  });

  it('preserves newlines within a slide', () => {
    const input = 'Line one\nLine two';
    assert.deepStrictEqual(parseSlides(input), ['Line one\nLine two']);
  });

  it('handles three slides', () => {
    const input = 'One\n---\nTwo\n---\nThree';
    assert.deepStrictEqual(parseSlides(input), ['One', 'Two', 'Three']);
  });

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(parseSlides(''), []);
  });

  it('returns empty array for whitespace-only input', () => {
    assert.deepStrictEqual(parseSlides('   \n\n  '), []);
  });
});
