# Changelog

## 1.1.0 - 2026-10-25

- Add automatic-wrapping ON/OFF and optional common maximum font size across all pages.
- Add A3, A5, Letter and genuine vertical Japanese writing, separate from paper orientation.
- Show a localized preprint summary and settings-dependent edge/background warnings without another confirmation dialog.
- Label line-height and letter-spacing sliders for assistive technology; remove the redundant Help dismissal sentence in both languages while preserving controls.
- Preserve A4, Auto orientation, horizontal writing, wrapping ON and independent-size defaults; include new settings in persistence and reset Undo.
- 自動折り返し・全ページサイズ統一・用紙追加・縦書き・印刷前確認・読み上げ名を追加。既存の分割・保存・Undoを維持。


- Clarify Japanese and English help by removing internal layout, implementation, and audit commentary while preserving usage guidance and cautions.

## 1.0.4 - 2026-10-11

- Stop background page scrolling only while Help is modal, preserving the existing scrollable Help, close controls, and print layout.
- ヘルプのモーダル表示中だけ背後のスクロールを停止し、ヘルプ内のスクロール・閉じる操作・印刷レイアウトを維持。
- Add source contracts for modal-only root/body locking, the existing Help shell, and the local-processing shield; cover repeated close-button/backdrop use in both languages.
- 日英のヘルプ・仕様・使い方を更新。実際のスクロール、Esc、フォーカス、印刷の確認には別途ブラウザ検証が必要。

## 1.0.3 - 2026-10-10

- Replace the app icon with the supplied artwork in the canonical SVG, full-size header, and embedded favicon.
- Regenerate release HTML and the Browser Kitty root alias; verify icon and compressed-payload parity.
- Keep the root download alias synchronized automatically during standard builds.

## 1.0.2 - 2026-10-09

- Normalize brand icon backgrounds to #16624f with exact 25% corner radii across SVG assets, header icons, and embedded favicons, preserving existing artwork.
- Add focused brand representation regression checks.

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
