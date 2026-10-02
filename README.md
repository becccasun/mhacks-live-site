# MHacks Live

Static replica of [mhacks.org/live](https://www.mhacks.org/live) with a redesigned hero: a looping carousel of MHacks wildflower bouquet stickers.

- Hover a sticker to see who made it. The scroll wheel or trackpad spins the carousel (up → right, down → left).
- Timeline, Hacker Guide and Prizes tabs, event search, day picker, category filters, and event drawer work like the live page.

## Run locally

```bash
python3 -m http.server 3009
```

Then open http://localhost:3009.

## Files

- `index.html`: page markup
- `app.js`: tabs, timeline, drawer, and the sticker carousel
- `data.js`: events and page settings
- `styles.css`: additions on top of the mirrored mhacks.org stylesheets in `css/`
- `stickers/`: bouquet sticker art · `media/`: fonts
