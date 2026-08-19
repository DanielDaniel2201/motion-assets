# Motion Assets

A browser-local tool for creating reusable animated assets with real transparency.

The first asset is **Card Stack**: add 2–8 images, arrange their order, tune a compact set of motion parameters, preview the deterministic animation, and export a 1920×1080 / 30 FPS ProRes 4444 MOV with an Alpha channel.

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
