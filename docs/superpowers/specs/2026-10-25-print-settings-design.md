# Max Text Print v1.1.0 design

## Intent and approved approach
Extend the existing single HTML app for wrapping control, common sizing, additional paper formats, vertical writing, and clear preprint information. The user approved this design on 2026-10-25. Retain the existing DOM/native-print implementation rather than adding a separate PDF encoder: sharing preview and print layout avoids divergent output and preserves offline use.

## Behavior
- Defaults remain A4, Auto paper orientation, horizontal writing, wrapping ON and independent page maxima.
- Wrapping OFF preserves explicit newlines and shrinks long lines rather than wrapping them.
- Optional common sizing uses the largest size that fits every generated page. Auto orientation evaluates this objective when enabled.
- Paper formats: A3 (297 × 420 mm), A4 (210 × 297 mm), A5 (148 × 210 mm), Letter (215.9 × 279.4 mm). All pages share one paper orientation.
- Vertical writing uses vertical-rl and mixed text orientation. Japanese columns advance right to left; Latin follows the browser's standard mixed orientation. Paper orientation remains independent.
- A localized summary shows page count, paper, orientation, margin and relevant settings near Print. Conditional warnings explain edge clipping and background printing. No extra confirmation dialog.
- Add localized accessible slider names. Remove only the requested help-dismissal sentence in Japanese and English, retaining dismissal behavior.
- Persist/reset/Undo new settings using the existing state model. Preserve existing splitting, limits, navigation, fonts, spacing, outlines, mobile tabs and native-print cancellation.

## Constraints and verification
No runtime dependencies, network/security changes, physical printing, merge or release. Version 1.1.0 and synchronized documentation/generated output. Test real layout and browser PDF paper sizes/page counts/clipping, both languages and mobile/desktop, plus existing regressions and exact-commit CI/preview. Browser/OS settings and hardware margins cannot be forced.
