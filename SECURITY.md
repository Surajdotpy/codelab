# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for a security problem.

Use GitHub's private reporting instead: open the repository's **Security** tab, choose
**Report a vulnerability**, and describe what you found. You'll get a reply as soon as the
maintainers can, and we'll work on a fix before details are made public.

Helpful details: what you did, what happened, your Windows version, and the CodeLab version
(shown on the release you installed).

## What counts

In scope, for example:
- A way for the CodeLab window (or a file opened with **Open**) to run code or read files
  it shouldn't, such as a weakness in the bridge in `preload.js` or the handlers in `main.js`.
- A way around the run limits in `runner.js` that freezes the app or the PC.
- A problem in how the installer or the release build is made.

## Known limitation (not a vulnerability)

**Student code is not sandboxed.** A program run in CodeLab has the same permissions as the
Windows user who started it, so it can read and delete that user's files. This is by design
and is explained in the [user guide](docs/USER-GUIDE.md#for-teachers-and-it-staff). The
protection is to run CodeLab under a standard (non-administrator) Windows account, and
the 5-second and 64 KB limits keep runaway programs from hanging the PC.

## Supported versions

Only the latest release gets security fixes.
