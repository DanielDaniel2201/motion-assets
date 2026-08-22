# Motion Assets

A browser-local tool for creating reusable animated assets with real transparency.

The first asset is **Card Stack**: add 2–8 images, arrange their order, tune a compact set of motion parameters, preview the deterministic animation, and export a ProRes 4444 MOV with an Alpha channel.

The second asset is **Progress Bar**: set a total duration, drop chapter / theme labels on timestamps, scale thickness and type, choose minor and major tick intervals, pick a color, and export the same transparent MOV for 16:9, 9:16, 4:3, 3:4, or 1:1.

**Video PiP Drag** accepts one browser-readable video up to 15 seconds. A cursor moves from center to a safe upper-left anchor, then reveals the playing video by dragging a ratio-preserving rectangle toward the lower right. Drag speed is adjustable; MOV output is transparent and silent.

## Run locally

```bash
npm install
npm run dev
```

No uploaded image is sent to a server. Preview and export share the same Canvas renderer; MOV frames are rendered and encoded inside a Web Worker with [`prores-wasm-encoder`](https://www.npmjs.com/package/prores-wasm-encoder).

## Verification

```bash
npm run verify
```

The automated test generates a small real MOV and validates its QuickTime container, ProRes 4444 codec marker, dimensions, frame rate, duration, and Alpha-bearing pixel format with `ffprobe` when available. Final compatibility still requires importing a full-size exported file into the target Jianying version.

The bundled `sticker-forge/` checkout is reference-only and is not part of this app.
