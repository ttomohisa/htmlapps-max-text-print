# Changelog

## 1.0.2 - 2026-10-09

- Normalize brand icon backgrounds to #16624f with exact 25% corner radii across SVG assets, header icons, and embedded favicons, preserving existing artwork.
- Add focused brand representation regression checks.

## Unreleased

## 1.0.1 - 2026-10-07

- Standardize the language button to EN / JA, with target-language labels and tooltips in the current UI language.
- Keep the Help tooltip synchronized with its localized accessible name.

- Add direct preview navigation with a localized page-number field, Go action, and Enter support.
- Validate page jumps on commit without clamping intermediate input; preserve all-page printing.
- Disable Print during pending fitting, reject invalid current output, and cancel queued requests after text or print-setting changes.
- Recheck fitted output at the final native-print handoff and prevent duplicate queued print requests.

- End Clear Undo when new typing, pasting, or IME composition starts, preserving newer saved text.
- Reject expired/replaced Undo actions and earlier Clear callbacks after repeated clears.
- Keep preview arrow shortcuts inactive while Help or another dialog is open.
- Add bilingual interaction regressions for source, root download, and both standalone variants.

## 1.0.0 - 2026-08-31

- Initial public release of Max Text Print.
- Added automatic maximum-size text fitting for A4 with portrait, landscape, and automatic orientation.
- Added page splitting modes for one page, blank-line blocks, one line per page, and one character per page.
- Added independent fitting for every generated page, paged preview controls, keyboard navigation, and one-job multi-page printing.
- Added 10 mm / 5 mm / 0 mm / custom margins, local system font choices, bold, alignment, colors, line height, letter spacing, and outline controls.
- Added locally persisted text and print settings, reset-to-default actions with Undo, Japanese/English UI, mobile bottom navigation, and help.
- Added a 200-page safety limit and grapheme-aware character splitting where `Intl.Segmenter` is available.
- Added standalone and gzip self-extracting HTML builds with runtime network access blocked by CSP.
