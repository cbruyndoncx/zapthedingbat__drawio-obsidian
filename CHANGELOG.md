# Changelog

All notable changes from the upstream [zapthedingbat/drawio-obsidian](https://github.com/zapthedingbat/drawio-obsidian) plugin are documented here.

## [1.5.4-fork.1] — Fork by cbruyndoncx

Based on upstream version 1.5.4 (commit `9b50554`).

### Added

- **Read-only mode** — New toggle in plugin settings ("Read-only mode") that
  prevents all edits and saves, protecting diagrams from accidental corruption.
  When enabled:
  - The draw.io `Change` event is silently dropped in `DrawioClient.ts`,
    so no modifications are written back to the file.
  - The draw.io graph is fully locked: selection, connections, tooltips, and
    all interaction handlers are disabled. Panning remains enabled for
    navigation.
  - A "Read-only mode" indicator is shown in the draw.io status bar.
  - The `readOnly` URL parameter is passed through to draw.io via
    `ConfigurationManager`.

- **Multi-page diagram support** — Changed the `pages` URL parameter from `"0"`
  to `"1"`, enabling draw.io's built-in multi-page UI so diagrams with multiple
  pages are fully accessible.

- **MathJax URL parameter** — Added `math` URL parameter support in
  `ConfigurationManager` (defaults to `"0"`).

- **Full file data export on save** — Added `getFullFileData()` in `Plugin.ts`
  that retrieves the complete diagram XML (all pages) via
  `currentFile.updateFileData()` / `getData()` or `app.getFileData()`, instead
  of only exporting the currently visible SVG/XML. This ensures multi-page
  diagrams are saved correctly.

- **Early monkey-patches** — Added `applyEarlyPatches()` in
  `src/drawio-client/app/index.ts` that retries patching `EditorUi` and
  `Graph.addLightDarkColors` until the globals are available (up to 100
  attempts, 50 ms apart). This prevents crashes when draw.io initializes
  asynchronously.

- **`AGENTS.md`** — Repository guidelines file describing project structure,
  build commands, coding style, and contribution conventions.

### Fixed

- **Null reference crash on first Change event** — `DrawioClient.ts` now guards
  against `this.file` being `undefined` when the first `Change` message arrives,
  initializing it instead of crashing.

- **`statusContainer` null crash** — `Plugin.ts` no longer calls
  `app.statusContainer.remove()` unconditionally. Instead it checks for null,
  hides the element with `display: none`, and clears its text content.

- **`setStatusText` null guard** — Added a monkey-patch on
  `EditorUi.prototype.setStatusText` that returns early if `statusContainer` is
  missing, preventing errors during draw.io initialization.

- **`Graph.addLightDarkColors` crash** — Wrapped the call in a try/catch via
  monkey-patch so that errors in dark/light color resolution don't break the
  editor.

- **CSS interception rework** — Replaced the fragile
  `HTMLElement.prototype.style` Proxy-based CSS URL rewriting with a cleaner
  approach:
  - Patches `CSSStyleDeclaration.prototype.setProperty` to rewrite `url()`
    references.
  - Patches the `cssText` property descriptor for the same purpose.
  - Adds inline `<style>` injection for `<link>` stylesheet elements, working
    around Obsidian's Content Security Policy that blocks blob: URLs.
  - Removed the now-unnecessary `interceptCss()` call from `RequestManager`.

- **Restored original draw.io assets** — Switched from custom/patched CSS and JS
  files (`drawio.css`, `dark.css`, custom `shapes.js`/`extensions.js`) back to
  the original draw.io source files:
  - `common.css`, `grapheditor.css`
  - `stencils.min.js`, `extensions.min.js`, `shapes-14-6-5.min.js`

- **Iframe initialization** — Set `mxIsElectron = false` and
  `mxLoadStylesheets = false` on the iframe window, and apply `geEditor
  geClassic` body classes so draw.io renders correctly inside Obsidian.

- **Removed stray debug logging** — Removed `console.warn("XHR", ...)` from
  `RequestManager.ts`.

### Build

- Bumped TypeScript from 4.4.2 to 4.9.5.
- Added `skipLibCheck: true` to both `tsconfig.json` and `tsconfig.es5.json`.
- Added explicit `typescript: require("typescript")` to all three Rollup
  TypeScript plugin configurations in `rollup.config.js`.
- Updated the `drawio` git submodule to a newer commit.
- Extended `typings/drawio.d.ts` with `getData()`, `updateFileData()`, and
  `getFileData()` method signatures.
