# Max Text Print v1.1.0 Implementation Plan

> For agentic workers: use superpowers:executing-plans task-by-task.

**Goal:** Implement the approved print-settings upgrade without changing existing defaults.
**Architecture:** Extend serializable state and the existing single-HTML UI. Share geometry and text styling between measurement, preview, and native printing; do not add a PDF encoder.
**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node regression tests, PowerShell build, browser PDF QA.
**Spec:** ../specs/2026-10-25-print-settings-design.md

## Global Constraints
- A4, Auto orientation, horizontal writing, automatic wrapping and independent sizing remain defaults.
- No runtime packages/network or broad security/CSS changes; no merge/release/physical print.
- Japanese/English and mobile/desktop remain supported, as do both standalone artifacts.

## Review Focus
- Vertical Japanese punctuation and Latin with outline must fit inside all paper edges.
- Wrapping OFF must preserve empty/manual lines and not hide leftward overflow.
- Common size must fit all 200 pages and Auto must optimize that common size.
- Saved pre-upgrade and malformed new settings must remain usable; reset Undo restores new controls.
- Pending printing must cancel after new-setting changes while preview-only navigation remains independent.

### Task 1: Settings and horizontal layout
Files: src/index.template.html, tests/interaction.test.cjs, tests/interaction-harness.cjs.
Interface: pageDims(orientation) returns {w,h} in mm from state.paperSize; styleTextNode(el,fontPt) applies state.autoWrap; evaluateOrientation(texts,orientation) returns common or per-page fits.
- [ ] Add failing tests for default/migrated state, controls, wrap CSS, A3/A5/Letter geometry, common-size objective, reset Undo and print cancellation.
- [ ] Run Node tests and observe expected failures.
- [ ] Implement paperSize, autoWrap, uniformFontSize controls/state/fit behavior.
- [ ] Run existing and new tests; commit focused changes.

### Task 2: Vertical layout and print information
Files: src/index.template.html, tests/interaction.test.cjs, tests/help-copy.test.cjs, browser QA script.
Interface: state.writingMode is horizontal-tb or vertical-rl; measurement and paper text share text-axis dimensions; updatePrintSummary() formats current settings/warnings.
- [ ] Add failing assertions for vertical CSS/geometry, Japanese punctuation/Latin/multiline fit, localized summary/warnings/slider names and removed help copy.
- [ ] Observe failures, then implement matching measurement/render layout and localized information.
- [ ] Verify minimum font failure, empty/201-page disabling, both languages, keyboard and mobile flows.
- [ ] Verify rendered character bounds and generated PDF dimensions/page counts; commit.

### Task 3: Release preparation and review
Files: app.config.json, APP_SPEC.md, README.md, README.ja.md, CHANGELOG.md, docs/ARCHITECTURE.md, docs/PRINTING.md, generated root HTML, representative screenshots.
- [ ] Update version to 1.1.0 and synchronized behavior/limitations documentation.
- [ ] Run full repository build/check, source and both generated variants, local opening, runtime-network checks and desktop/mobile browser QA.
- [ ] Obtain independent review, reproduce/fix findings with regression tests and rerun affected verification.
- [ ] Publish draft PR, verify exact commit CI and Cloudflare preview, then mark ready only after checks pass. Stop before merge/release.
