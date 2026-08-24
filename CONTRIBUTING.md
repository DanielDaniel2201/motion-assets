# Contributing Motion Assets

New Motion Asset contributions are welcome. If you only have an idea or demo, please share it in [Discussions](https://github.com/DanielDaniel2201/motion-assets/discussions) first. If an existing feature is broken, please open an [Issue](https://github.com/DanielDaniel2201/motion-assets/issues).

## Contributing a Motion Asset

1. Fork this repository and create a branch that describes the Motion Asset.
2. Follow the existing Motion Asset implementations:
   - Add `definition.ts`, `timeline.ts`, and `render.ts` under `src/assets/<motion-id>/`.
   - Add the corresponding editor under `src/components/`.
   - Register the Motion Asset and its entry point in `src/assets/registry.ts` and `src/App.tsx`.
   - Add tests under `tests/` that cover the main timeline or parameter logic.
3. Change only the files required for the Motion Asset. Do not include unrelated refactoring.
4. Verify locally:

   ```bash
   npm ci
   npm run verify
   ```

5. Open a pull request and include a GIF, screenshot, or screen recording that documents the adjustable parameters, input requirements, and known limitations.

## Contribution Requirements

- Keep each pull request limited to one Motion Asset or one independent fix.
- The preview and export must use the same animation logic.
- Do not submit images, videos, fonts, or other assets that you do not have the right to use and redistribute.
- By contributing, you confirm that you have the right to contribute the relevant code and assets.
- Contributions are licensed under this repository's [MIT License](LICENSE).

Maintainers may request changes or decline a contribution based on product direction, quality, or maintenance cost.
