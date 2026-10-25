# Printing behavior and limitations

The browser print dialog is intentionally part of the UX.

The app can request A3, A4, A5 or Letter page size and its own inner safe area, but it cannot reliably force every browser/OS/printer combination to use a specific physical printer scale or edge-to-edge capability. The UI therefore uses a 10 mm default safe margin and warns for 0 mm.

Max Text Print can generate one or multiple pages. Page splitting supports one-page, blank-line, line, and grapheme-aware character modes. Every generated page is fitted independently by default, but the paper orientation is shared by the whole print job. Auto orientation evaluates both portrait and landscape across all pages and chooses one orientation for the job.

Up to 200 pages can be generated in one operation. This guard avoids accidentally creating extremely large print jobs, especially in character-per-page mode.

For colored backgrounds, users may need to enable a browser option such as **Background graphics**.

PDF output is provided by the print destination (for example, **Save as PDF**) rather than by a PDF library inside the app.

A3 is 297×420 mm; A4 210×297 mm; A5 148×210 mm; Letter 215.9×279.4 mm. Landscape swaps the dimensions. Check that the print dialog respects the selected paper, orientation, 100% scale, and disabled headers/footers. Hardware margins and driver settings remain outside app control.

Wrapping OFF uses only explicit newlines and reduces font size for long lines. Common sizing uses the smallest independent maximum so every page fits. Auto evaluates the common size when enabled. Vertical writing uses right-to-left columns and standard mixed Latin orientation, separate from paper orientation. The same DOM and styling serve preview and print; font availability affects the result.
