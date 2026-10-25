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

Each generated page is measured independently in an off-screen measurement box using the same font family, weight, line height, letter spacing, wrapping rules, and safe-area dimensions as the visible paper. The app binary-searches from 0.5 to 1200 pt and rounds the result down to 0.5 pt. Shared 0.2 em plus outline/1 px padding reserves room for font overhang; scroll extents and four-sided DOM Range bounds must both fit. The proportional gutter prevents tight leading and vertical glyphs from clipping at the safe-area boundary.

For a fixed orientation, every page receives its own maximum size by default. With common sizing enabled, the minimum of these maxima is used for all pages, and Auto compares the resulting common sizes. In Auto orientation, portrait and landscape are evaluated for the full page set and one shared orientation is selected for the whole print job. Mixed portrait/landscape output is intentionally not generated.

## Preview / print invariant

The app creates one `.paper` DOM element for each generated page.

- On screen, only the selected preview page is displayed and visually scaled to fit the preview stage. Previous/Next, arrow shortcuts, and a validated page-number jump share the same `showPage` path. The page field is transient, accepts integers from 1 to the current total on Go/Enter, and does not alter stored text/settings or the print subset.
- On print media, all generated `.paper` elements are displayed at unscaled selected-paper geometry in sequence.
- Each paper uses millimeter dimensions and the selected safe margin inside the paper itself.
- `@page` is set to the exact selected-paper dimensions in millimeters with zero browser page margin.
- Page breaks are inserted between generated papers.

Using the same paper DOM elements for preview and printing keeps line wrapping and fitted sizes as consistent as the browser allows.

## Persistence

Text, language choice, page-splitting mode, paper size, writing direction, wrapping, common sizing, and print settings are serialized to local storage under `max-text-print:v1`. The app remains usable when local storage is unavailable; persistence is simply skipped.

## Interaction boundaries

Clear Undo belongs to the current clear operation. Starting text editing (including IME composition) invalidates it; both its operation identity and the empty editor/state are checked before restoring. Toast generations reject callbacks from expired or replaced toasts. Print-setting changes do not end Clear Undo, and editing text does not invalidate a settings-reset Undo. Page arrow shortcuts are suspended while a dialog is open.

## Printing

Text and print-setting changes invalidate an output revision and disable both Print buttons until the debounced fit completes. A Print request recomputes before checking validity, then captures that revision and a request token. At the final animation-frame handoff it rejects superseded requests, recomputes, and checks validity again. Preview navigation does not change the output revision, so printing still includes every page. `beforeprint` continues to refresh output for native browser shortcuts; Ctrl/Cmd+P is not intercepted.

`window.print()` opens the native browser/OS print dialog. The application does not bypass that dialog and does not implement its own PDF encoder. Users who need a PDF can select the browser or OS **Save as PDF** destination.

## Network

There are no third-party runtime dependencies. The generated application CSP blocks runtime connections with `connect-src 'none'`; external fonts, scripts, analytics, telemetry, and APIs are not used.

## Brand assets

`assets/favicon.svg` is the canonical supplied artwork. The source template embeds the same SVG in the full-size header and favicon. The self-extracting loader inherits the readable HTML favicon; icon regression tests compare all source and generated copies.
The standard build also regenerates `max-text-print.html` byte-for-byte from the readable output. Explicit custom output builds leave the root alias untouched.

## Writing and paper geometry

A central paper-size table supplies portrait dimensions for A3/A4/A5/Letter; landscape swaps the physical axes. Dynamic @page uses those exact dimensions. Automatic wrapping uses pre-wrap/anywhere; OFF uses pre/normal. Both preserve explicit line breaks. Vertical writing uses vertical-rl and text-orientation:mixed in measurement and output; paper orientation is unchanged. Physical horizontal/vertical alignment is mapped onto the corresponding inline/block axes.

The preprint summary describes the entire job, not only the preview page. It discloses browser/OS control limits and shows conditional edge and background warnings.
