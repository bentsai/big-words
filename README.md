# big-words

Present text as large as possible. A CLI tool that watches a text file and displays each slide in the browser with text scaled to fill the viewport.

## Install

```
npm install
```

## Usage

```
big-words <file> [--theme paper|ink|presenter|gradient] [--font sans|mono|serif]
```

This starts a local server, opens the browser, and renders your text. Edit the file in your editor and the browser updates instantly.

### Example

Create a file called `slides.txt`:

```
Ship

---

Ship it today

---

The best way to predict
the future is to invent it
```

Then run:

```
big-words slides.txt
```

### Options

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--theme` | `paper`, `ink`, `presenter`, `gradient` | `paper` | Color scheme. Presenter cycles colors per slide. |
| `--font` | `sans`, `mono`, `serif` | `sans` | Font family. |
| `--help` | | | Show usage. |

### Slides

Slides are separated by `---` on its own line. Text is displayed as-is (no markdown rendering). Newlines within a slide are preserved.

### Navigation

| Key | Action |
|-----|--------|
| Right / Space / Enter | Next slide |
| Left / Backspace | Previous slide |
| Home | First slide |
| End | Last slide |
| t | Cycle theme |
| f | Cycle font |
| b | Toggle blank screen |

## How text scaling works

The app uses a minor third (1.2x) type scale. For each slide, it tries the largest font size first and steps down until the text fits both the width and height of the viewport. Words never break mid-word — they wrap at spaces and scale down to fit.

## Development

```
npm test              # unit tests (node:test)
npm run test:visual   # visual regression tests (playwright)
```
