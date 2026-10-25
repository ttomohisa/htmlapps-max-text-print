# v1.1.0 verification

The release preparation keeps A4, automatic paper orientation, horizontal writing,
automatic wrapping, and per-page maximum sizes as defaults. No release or merge
is performed by this change.

## Reproducible checks

- `scripts/check-repository.ps1` builds and validates the readable and
  self-extracting standalone artifacts with the existing source tests.
- `node --test tests/*.test.cjs`: 422 passing assertions in the final local run.
- `node tests/print-settings.test.cjs dist/index.html dist/index.self-extract.html max-text-print.html`:
  72 passing assertions against the generated distributions.
- CI installs development-only Playwright 1.57.0 and pdf-lib 1.17.1, then runs
  `node tests/browser-print.cjs`. The application itself has no runtime packages.
- Chromium QA: 124 assertions, zero failures. Japanese and English at 1360 px
  desktop and 320 px mobile widths; wrapping, shared sizing, all paper sizes,
  horizontal/vertical writing, all physical alignments, tight leading and thick
  outlines, local-file launch of all distributions, and absence of runtime HTTP
  requests and browser errors.
- The 200-page boundary produces 200 print pages at a common size and supports
  direct navigation to page 180. 201 pages disables printing.
- Sixteen two-page PDFs cover four paper sizes, both paper orientations and both
  writing directions. A separate one-page mixed Japanese/Latin vertical sample
  checks punctuation and sideways Latin. PDF media boxes and page counts are
  asserted; glyph rectangles are checked against the printable area before PDF
  generation. The PDFs were also inspected for text outside the physical page.
- Visual inspection covered Japanese/English screenshots, horizontal/vertical
  output, and mixed-script Japanese punctuation in the generated PDF.
- Independent review findings about hidden print UI and malformed persisted
  paper settings were fixed with regression tests. Existing split modes,
  persistence/Undo and pending-print cancellation remain covered.

A reproducible successful source run is
[40156301391](https://github.com/ttomohisa/htmlapps-max-text-print/actions/runs/40156301391)
at commit `e754592dc8e7886b8c2ae212dbf9b41760206094`.
The PR's final checks rerun the same suite after distribution/screenshot updates.
PDFs, screenshots and detailed assertion results are retained as CI artifacts.

## Limits

No physical printer was used. Browser/OS print settings can override paper,
orientation, scaling, headers/footers and background printing. Users must check
those settings in the print dialog. Font metrics and vertical glyph behavior
vary across installed fonts and browser engines; this verification uses Chromium,
not every Safari/Firefox version or printer driver.
