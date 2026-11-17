# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org). GitHub also generates release notes from merged
pull requests; this file is the human-written summary.

## [Unreleased]

### Added
- First public version of CodeLab: an offline Windows app that runs Python, JavaScript, C and C++.
- Editor with syntax colors, line numbers, auto-indent, Tab key and zoom (Ctrl +/−).
- Input box for programs that read from the keyboard.
- Open (Ctrl+O) and Save (Ctrl+S) for program files; the last code in each language is remembered.
- Safety limits: 5 second run limit, 64 KB output cap, 20 second compile limit.
- Bundled Python 3.12, GCC (w64devkit) and Node.js, so nothing else needs installing.
- Per-user installer with desktop shortcut and app icon.
- Automatic releases: pushing a `v*` tag builds and publishes the installer.
- Documentation, license (MIT), contributing guide, code of conduct and security policy.

### Fixed
- `npm run make-icon` now regenerates the icon instead of launching the app.

<!--
When you publish a release, rename "Unreleased" to the version and date, for example:
## [1.0.0] - 2026-11-20
then add a new empty "Unreleased" section above it.
-->
