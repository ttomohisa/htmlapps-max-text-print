# Security and privacy

Max Text Print is designed to run entirely in the browser.

- Runtime network connections are blocked by Content Security Policy (`connect-src 'none'`).
- No analytics, telemetry, account, API, CDN, or remote font is used.
- When local storage is available, entered text and settings are stored only in that browser; the app still works if storage is unavailable.
- Printing is delegated to the browser/operating system through `window.print()`.
- The app does not silently send output to a printer and cannot bypass the native print dialog.

If you use a shared device, clear the text in the app or remove site/local storage after use if the content should not remain on that device.
