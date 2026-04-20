# big-text Design Spec

A CLI tool that takes a plain text file, watches it for changes, and serves a local web page that renders each slide's text as large as possible to fill the viewport.

## Usage

```
big-text slides.txt [--theme ink|paper] [--font sans|mono|serif]
```

Starts a local web server, opens the browser, and renders the text. File changes trigger instant live reload via WebSocket.

Defaults: `--theme paper --font sans`

## Core Concept

Single-slide-at-a-time presentation tool. You edit a text file in your own editor, and the browser shows the current slide with text scaled to be as large as possible. No markdown rendering — text is displayed as-is.

## File Format & Parsing

Input is a plain text file (any extension). Slides are separated by `---` on its own line.

Example:
```
Ship it today

---

The best way to predict
the future is to invent it

---

We choose to go to the moon
```

Parsing rules:
- Split file content on `/^\s*---\s*$/m`
- Trim leading/trailing whitespace from each slide
- Empty slides (blank between two `---`) are skipped
- Newlines within a slide are preserved as line breaks

## Text Scaling

The core feature. Text must be aggressively large — filling both width and height of the viewport. Wrapping is expected and desired.

**Type scale:** Minor third ratio (1.2x). Predefined steps in pixels: 42, 50, 60, 72, 86, 104, 124, 149, 179, 215, 258, 310, 372, 446, 536, 643, 772.

**Algorithm:**
1. Start at the largest scale step
2. Set the text element's font-size to that step
3. Allow natural word wrap
4. Measure: does the rendered bounding box (scrollWidth/scrollHeight) exceed the viewport area (minus padding)?
5. If it overflows, step down to the next size
6. First step that fits wins

**Layout:**
- Text is left-aligned
- Vertically centered in the viewport
- Padding: ~3-4% margin from viewport edges
- Line-height: tight (0.95-1.0) to maximize space usage

**Behavior:**
- A single short word should fill the entire screen (height-constrained)
- A short phrase wraps to 2-3 lines and fills the frame
- A paragraph wraps freely and still uses aggressive sizing
- The 1.2x step ratio means at most ~17% undershoot from the theoretical maximum

## Themes

Two themes — color schemes only, no layout differences.

**paper (default):**
- Background: #ffffff
- Text: #1a1a1a

**ink:**
- Background: #111111
- Text: #f0f0f0

Implemented via CSS custom properties that the client swaps.

## Fonts

Three font options, independent of theme.

**sans (default):** -apple-system, Helvetica Neue, Arial, sans-serif
**mono:** SF Mono, Menlo, Consolas, monospace
**serif:** Georgia, Times New Roman, serif

## Navigation

Keyboard-only, no on-screen controls.

- Right arrow / Spacebar / Enter: next slide
- Left arrow / Backspace: previous slide
- Home: first slide
- End: last slide

## Architecture

### Components

1. **CLI entry point** — parses args (file path, --theme, --font), validates file exists, starts the server
2. **File watcher** — watches the input file for changes, on change re-parses and pushes update via WebSocket
3. **HTTP server** — serves a single HTML page with embedded CSS and JS (no build step, no external dependencies in the browser)
4. **WebSocket server** — pushes slide content and config to the browser
5. **Browser client** — receives content, runs the sizing algorithm, handles keyboard navigation

### Tech Stack

- Node.js
- `ws` package for WebSocket
- `chokidar` for reliable file watching
- Built-in `http` module for serving
- No frontend build step — the HTML/CSS/JS is served as a single inline page

### WebSocket Message Format

```json
{
  "slides": ["Slide 1 text", "Slide 2 text"],
  "theme": "ink",
  "font": "mono"
}
```

Sent on initial connection and on every file change.

### Client Behavior

- On WebSocket message: update slide array, re-render current slide, re-run sizing
- If current slide index exceeds new slide count, clamp to last slide
- On resize: re-run sizing algorithm for current slide

### Startup

1. Parse CLI args
2. Read and parse the input file
3. Start HTTP + WebSocket server on a random available port
4. Open browser automatically (`open` on macOS, `xdg-open` on Linux, `start` on Windows)
5. Print URL to terminal
6. Begin watching file for changes
