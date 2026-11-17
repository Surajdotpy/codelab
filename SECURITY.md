# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for a security problem.

Use GitHub's private reporting instead: open the repository's **Security** tab, choose
**Report a vulnerability**, and describe what you found. You'll get a reply as soon as the
maintainers can, and we'll work on a fix before details are made public.

Helpful details: what you did, what happened, your Windows version, and the CodeLab version.

## What CodeLab protects against

CodeLab is built so a classroom of beginners can run programs without breaking the PC. Every
student program runs through a small launcher (`limiter.exe`, source in `scripts/limiter.c`) that
puts it inside a Windows **Job Object**, plus checks in the app itself:

| Risk | Protection |
|---|---|
| Endless loop | Stopped after **5 seconds**; compiling is limited to 20 seconds |
| Program eats all memory and freezes the PC | Memory capped at **256 MB** per program; allocations beyond that fail |
| Fork bomb (a program starting copies of itself) | At most **16 processes** per program |
| A program leaves helpers running after it is stopped | Everything it started is killed when it ends or is stopped |
| Output flood | Output capped at **64 KB** |
| Huge program or input pasted in | Programs over 256 KB or input over 64 KB are refused |
| Program reads secrets from the environment (API keys, tokens) | Programs only see a short list of basic Windows variables |
| Crash pop-ups, clipboard snooping, changing display or system settings | Blocked for student programs |
| Something other than CodeLab's own page using the app's bridge (a dropped file, a link) | Navigation and new windows are blocked; requests are only accepted from CodeLab's own page |
| Web attacks inside the window | Strict Content-Security-Policy (no remote content, no `eval`, no network requests), sandboxed renderer, no Node.js in the page, no DevTools in the installed app, all permissions (camera, microphone, …) denied |
| Tampered downloads when building | The bundled Python and GCC are checked against pinned SHA-256 checksums |
| Tampered installer | Each release lists the installer's SHA-256 so you can check your download |

## Known limitations (by design)

**CodeLab is not a sandbox.** A student program still runs as the signed-in Windows user, so it
**can read, change and delete that user's files, and can use the network.** Protecting against a
determined attacker would need a virtual machine, which is too heavy for school PCs.

What to do about it:
- Give students a **standard (non-administrator) Windows account**. Then a program can only affect
  that student's own files, never the system or other users.
- If programs must not reach the network, ask your IT staff for a Windows Firewall rule.
- The installer is not code-signed, so Windows SmartScreen shows a warning. Check the SHA-256 from
  the release page if you want to confirm the file is genuine.

In scope for reports, for example: a way for a page or file to use the app's bridge, a way around
the limits above, or a problem in how the installer or release build is made.

## For maintainers: protecting the repository

Do these once in the GitHub web interface (they can't be set from files in the repo):

1. **Two-factor authentication** on every maintainer account (profile → Settings → Password and authentication).
2. **Protect `main`**: repo **Settings → Rules → Rulesets → New branch ruleset**, target the default branch, and enable
   *Require a pull request before merging* (with *Require review from Code Owners*), *Require status checks to pass*
   (add the `test` check, which appears after CI has run once), *Block force pushes* and *Restrict deletions*.
3. **Protect release tags**: a second ruleset targeting tags matching `v*`, restricting creation, update and deletion.
   Pushing a `v*` tag publishes an installer.
4. **Settings → Advanced Security**: turn on Dependabot alerts and security updates, secret scanning with push
   protection, code scanning (CodeQL, default setup) and private vulnerability reporting.
5. **Settings → Actions → General**: keep *Workflow permissions* on **read-only** (the release workflow requests
   the one extra permission it needs), and require approval for workflows from outside contributors.

The repo already contains `.github/CODEOWNERS` (who must review security-critical files) and
`.github/dependabot.yml` (weekly update pull requests for Electron and the GitHub Actions).

## Supported versions

Only the latest release gets security fixes. Electron, the browser engine inside the app, receives
frequent security updates, which is one more reason to keep CodeLab up to date.
