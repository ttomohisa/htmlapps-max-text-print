# Architecture

## Runtime

Max Text Print is a dependency-free single-page application whose editable source is `src/index.template.html`. The Windows build injects app metadata and the embedded-asset manifest, then writes the self-contained `dist/index.html` and the gzip self-extracting `dist/index.self-extract.html`.

## Text splitting

Before fitting, the input is converted into one or more page strings according to the selected mode:

- Keep on one page: the complete input stays together.
- Blank lines: one or more blank lines separate page blocks.
- Each line: every non-empty line becomes one page.
- Each character: every non-whitespace grapheme becomes one page. `Intl.Segmenter` is used when available, with Unicode code-point splitting as a fallback.

A maximum of 200 generated pages is enforced before printing.

## Fitting algorithm

Each generated page is measured independently in an off-screen measurement box using the same font family, weight, line height, letter spacing, wrapping rules, and safe-area dimensions as the visible paper. The app binary-searches from 0.5 to 1200 pt and rounds the result down to 0.5 pt.

For a fixed orientation, every page receives its own maximum size. In Auto orientation, portrait and landscape are evaluated for the full page set and one shared orientation is selected for the whole print job. Mixed portrait/landscape output is intentionally not generated.

## Preview / print invariant

The app creates one `.paper` DOM element for each generated page.

- On screen, only the selected preview page is displayed and visually scaled to fit the preview stage. Previous/Next, arrow shortcuts, and a validated page-number jump share the same `showPage` path. The page field is transient, accepts integers from 1 to the current total on Go/Enter, and does not alter stored text/settings or the print subset.
- On print media, all generated `.paper` elements are displayed at unscaled A4 geometry in sequence.
- Each paper uses millimeter dimensions and the selected safe margin inside the paper itself.
- `@page` is set to A4 portrait or landscape with zero browser page margin.
- Page breaks are inserted between generated papers.

Using the same paper DOM elements for preview and printing keeps line wrapping and fitted sizes as consistent as the browser allows.

## Persistence

Text, language choice, page-splitting mode, and print settings are serialized to local storage under `max-text-print:v1`. The app remains usable when local storage is unavailable; persistence is simply skipped.

## Interaction boundaries

Clear Undo belongs to the current clear operation. Starting text editing (including IME composition) invalidates it; both its operation identity and the empty editor/state are checked before restoring. Toast generations reject callbacks from expired or replaced toasts. Print-setting changes do not end Clear Undo, and editing text does not invalidate a settings-reset Undo. Page arrow shortcuts are suspended while a dialog is open.

## Printing

Text and print-setting changes invalidate an output revision and disable both Print buttons until the debounced fit completes. A Print request recomputes before checking validity, then captures that revision and a request token. At the final animation-frame handoff it rejects superseded requests, recomputes, and checks validity again. Preview navigation does not change the output revision, so printing still includes every page. `beforeprint` continues to refresh output for native browser shortcuts; Ctrl/Cmd+P is not intercepted.

`window.print()` opens the native browser/OS print dialog. The application does not bypass that dialog and does not implement its own PDF encoder. Users who need a PDF can select the browser or OS **Save as PDF** destination.

## Network

There are no third-party runtime dependencies. The generated application CSP blocks runtime connections with `connect-src 'none'`; external fonts, scripts, analytics, telemetry, and APIs are not used.
