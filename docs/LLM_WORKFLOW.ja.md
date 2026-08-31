# コーディングエージェント向け手順

1. `AGENTS.md` と `APP_SPEC.md` を読む。
2. 変更前に `src/index.template.html` の現状を確認する。
3. ブラウザ直接印刷の主導線を維持し、変更範囲を必要最小限にする。
4. 生成物 `dist/` を手編集しない。
5. Windowsで `scripts/check-repository.ps1` を実行し、再ビルドと検証を行う。
6. PC/スマホ、日本語/英語、A4縦横、印刷、ローカル直接起動を確認する。
7. 挙動変更時は README / APP_SPEC / CHANGELOG / ヘルプ / スクリーンショットも同期する。
