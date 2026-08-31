# Printing behavior and limitations

The browser print dialog is intentionally part of the UX.

The app can define A4 page size and its own inner safe area, but it cannot reliably force every browser/OS/printer combination to use a specific physical printer scale or edge-to-edge capability. The UI therefore uses a 10 mm default safe margin and warns for 0 mm.

Max Text Print can generate one or multiple A4 pages. Page splitting supports one-page, blank-line, line, and grapheme-aware character modes. Every generated page is fitted independently, but the paper orientation is shared by the whole print job. Auto orientation evaluates both portrait and landscape across all pages and chooses one orientation for the job.

Up to 200 pages can be generated in one operation. This guard avoids accidentally creating extremely large print jobs, especially in character-per-page mode.

For colored backgrounds, users may need to enable a browser option such as **Background graphics**.

PDF output is provided by the print destination (for example, **Save as PDF**) rather than by a PDF library inside the app.
