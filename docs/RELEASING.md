# Releases / リリース

## Release policy

The repository owner merges reviewed PRs. No tag or GitHub Release is created while the PR is open.

When a new version is merged into **main**, the **Publish GitHub Release** workflow:

1. Reads the stable SemVer from `app.config.json` and checks the matching section in `CHANGELOG.md`.
2. Skips publishing if a GitHub Release for that version already exists.
3. Builds both standalone HTML variants from the *exact main commit*, runs `scripts/check-repository.ps1` and Chromium/PDF tests, and creates a verified versioned release ZIP and checksums.
4. Creates `v<version>` as a lightweight tag at that commit only after those checks pass. Existing tags are never moved or replaced.
5. Publishes a GitHub Release named **Max Text Print v<version>** with the four downloadable assets.

For v1.2.0, the expected downloads are:

- `htmlapps-max-text-print-v1.2.0.html` — readable standalone HTML.
- `htmlapps-max-text-print-v1.2.0.self-extract.html` — compressed, self-extracting standalone HTML.
- `htmlapps-max-text-print-v1.2.0.zip` — HTML variants, bilingual documentation, manifests, licenses, and build provenance.
- `SHA256SUMS.txt` — SHA-256 checksums for the three files above.

The source release version, tag, release title, and download names are derived from the config. New versions require a version bump and a changelog entry before merging.

## Recovery and safeguards

- A PR validation run generates a **release-candidate** artifact for review but does **not** create a tag or a public Release.
- If a published Release already exists, the workflow skips publishing and does not alter its assets or tag.
- If the tag exists but the Release does not (for example after a failed upload), rerunning the workflow for the **same commit** resumes publication. It refuses to reuse a tag that points to another commit.
- To retry, open **Actions → Publish GitHub Release → the failed run → Re-run all jobs**. The manual `workflow_dispatch` action is allowed only on `main`.
- GitHub Actions must permit `GITHUB_TOKEN` to write repository contents, and no repository ruleset may forbid creation of the version tag.
- Both app variants remain local-only at runtime. CI validates generated HTML and Chromium/PDF output, not native Android/iOS print dialogs.

## 日本語

リリース用の変更も通常のPRでレビューし、**マージはリポジトリ所有者が行います**。マージ後に `main` 上でチェックがすべて成功した場合だけ、バージョンのタグとGitHub Releaseを公開します。

PRのチェックでは配布候補ファイルのみ生成し、タグやReleaseは作成しません。すでに公開済みのバージョンは変更せずにスキップします。途中で失敗した場合は該当コミットのActions実行を再試行してください。別のコミットを指す既存タグを上書きすることはありません。

ネイティブのAndroid・iOS印刷画面はCIでは検証できないため、必要に応じて実機で最終確認してください。
