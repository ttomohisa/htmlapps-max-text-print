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

## Common UI manual acceptance (not yet performed)

Open both readable and self-extract HTML, with networking disabled, in supported desktop and mobile browsers. Enter a multi-page sign and change print settings; reload. Pass: saved text/settings return and no startup writes occur. Deny storage, edit again, change language and retry after restoring storage. Pass: current draft survives, error stays visible until a successful retry, unrelated errors are retained, and the saved timestamp advances only on success. With malformed stored JSON, pass: editing/Retry never overwrites it; Print remains available.

Clear text, focus Undo with the keyboard for longer than five seconds, and change language. Pass: translated Undo remains usable and restores the exact text; newer typing invalidates Clear Undo. Test both settings-reset scopes. Enter an invalid/intermediate page number, switch language. Pass: draft remains intact and validation relocalizes.

Rapidly activate desktop/mobile Print, change inputs during pending handoff, cancel native print, and print again. Pass: one dialog per accepted action, stale jobs do not print, buttons recover, all pages retain their original fit/geometry, and the PDF destination/name is chosen in the native dialog. Check A3/A4/A5/Letter, horizontal/vertical, wrapping, common sizing and 200-page bounds.

At narrow and short viewports, pass: status/retry are readable, buttons reachable with keyboard/touch, Help can scroll to its end and close via buttons/Escape/backdrop, and print output contains no UI/status elements. These native/device checks are incomplete because the managed browser policy denied file and local HTTP access; VM/CLI evidence is not a substitute.
