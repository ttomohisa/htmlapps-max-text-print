# Offline verification

1. Run `build-standalone.bat`.
2. Disconnect the network.
3. Open `dist/index.html` directly with `file://`.
4. Enter Japanese text and confirm the A4 preview updates.
5. Switch to English and confirm labels and help text update without reloading.
6. Test Page splitting with one page, blank-line blocks, one line per page, and one character per page.
7. Confirm previous/next controls and Left/Right keys move through multi-page previews when focus is not in a form field.
8. Change portrait/landscape/auto, margins, typeface, and advanced settings, then confirm fitting updates.
9. Reset print settings and advanced settings, then confirm Undo restores the previous values.
10. Open the print dialog and confirm only generated A4 paper content is present and all generated pages are included.
11. Repeat with `dist/index.self-extract.html`.
12. Confirm the browser DevTools Network panel shows no runtime requests from the application.

The operating system may independently contact printer services; that is outside the app's runtime network behavior.
