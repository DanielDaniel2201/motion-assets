# Motion Assets

A browser-local tool for creating animated assets with a real alpha channel — export transparent ProRes 4444 MOVs and drop them straight into CapCut / JianYing as overlay effects. Nothing is uploaded; everything renders locally.

![Demo](docs/demo.gif)

## Assets

- **Card Stack** — stack 2–8 images, tune order and motion parameters, export.
- **Progress Bar** — chapter labels on timestamps, adjustable ticks, thickness and color, five aspect ratios.
- **Chat Dialog** — left/right conversation with avatars, bubble colors, fonts and reveal timing.
- **Video PiP Drag** — a cursor drags open a video rectangle (up to 15 s), ratio-preserving, silent output.

All assets share the same preview and export path: what you see is the MOV you get.

## Run locally

```bash
npm install
npm run dev
```

Preview and export share one Canvas renderer; MOV frames are rendered and encoded in a Web Worker with [`prores-wasm-encoder`](https://www.npmjs.com/package/prores-wasm-encoder).

## Verification

```bash
npm run verify
```

The automated test generates a small real MOV and validates its QuickTime container, ProRes 4444 codec marker, dimensions, frame rate, duration, and alpha-bearing pixel format with `ffprobe` when available.

## Contributing

Have an idea or a demo? Start a [Discussion](https://github.com/DanielDaniel2201/motion-assets/discussions). Found a bug? Open an [Issue](https://github.com/DanielDaniel2201/motion-assets/issues). Ready to contribute an implementation? Read [CONTRIBUTING.md](CONTRIBUTING.md), fork the repository, and open a pull request.

The bundled `sticker-forge/` checkout is reference-only and is not part of this app.
