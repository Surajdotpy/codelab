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

### Security
- Every program runs inside a Windows Job Object: 256 MB memory cap, at most 16 processes, and
  everything it started is killed when it ends. Memory bombs and fork bombs no longer freeze the PC.
- The whole process tree is killed at the time limit; programs only see a short allowlist of
  environment variables; oversized programs (over 256 KB) and input (over 64 KB) are refused.
- Window hardening: navigation, redirects and new windows blocked (a dropped file can't replace the
  app), IPC accepted only from CodeLab's own page, all permissions denied, all renderers sandboxed,
  DevTools disabled in the installed app, stricter Content-Security-Policy.
- Electron upgraded from 33 to 45 and electron-builder from 25 to 26 (fixes known vulnerabilities).
- Downloaded runtimes are verified against pinned SHA-256 checksums; release notes list the
  installer's SHA-256.
- Dependabot updates, CODEOWNERS for security-critical files, read-only token for CI.

### Fixed
- `npm run make-icon` now regenerates the icon instead of launching the app.

<!--
When you publish a release, rename "Unreleased" to the version and date, for example:
## [1.0.0] - 2026-11-20
then add a new empty "Unreleased" section above it.
-->
