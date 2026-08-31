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

- On screen, only the selected preview page is displayed and visually scaled to fit the preview stage.
- On print media, all generated `.paper` elements are displayed at unscaled A4 geometry in sequence.
- Each paper uses millimeter dimensions and the selected safe margin inside the paper itself.
- `@page` is set to A4 portrait or landscape with zero browser page margin.
- Page breaks are inserted between generated papers.

Using the same paper DOM elements for preview and printing keeps line wrapping and fitted sizes as consistent as the browser allows.

## Persistence

Text, language choice, page-splitting mode, and print settings are serialized to local storage under `max-text-print:v1`. The app remains usable when local storage is unavailable; persistence is simply skipped.

## Printing

`window.print()` opens the native browser/OS print dialog. The application does not bypass that dialog and does not implement its own PDF encoder. Users who need a PDF can select the browser or OS **Save as PDF** destination.

## Network

There are no third-party runtime dependencies. The generated application CSP blocks runtime connections with `connect-src 'none'`; external fonts, scripts, analytics, telemetry, and APIs are not used.
