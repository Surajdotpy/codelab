# Releasing a new version

Releases are **automatic**. When you push a version tag such as `v1.1.0`, GitHub Actions
builds the Windows installer, runs the tests, and publishes it on the
[Releases page](https://github.com/Surajdotpy/codelab/releases). You never build or upload
the `.exe` by hand.

People who use CodeLab download the installer from Releases. Merged contributions do **not**
change anything for them until you publish a new release.

## How to publish

1. Make sure `main` has everything you want and CI is green (the **Actions** tab).
2. Pick the new version number ([semantic versioning](https://semver.org)):
   - `1.0.1` for bug fixes
   - `1.1.0` for new features that don't break anything
   - `2.0.0` for big or breaking changes
3. Set it in `package.json` (`"version": "1.1.0"`), then commit and push to `main`:
   ```
   git add package.json
   git commit -m "Release 1.1.0"
   git push
   ```
4. Create and push the tag. It must be `v` plus the **same** version as `package.json`:
   ```
   git tag v1.1.0
   git push origin v1.1.0
   ```
5. Watch the **Release** run in the Actions tab. It takes about 10–15 minutes. When it
   finishes, the release appears with `CodeLab-Setup-1.1.0.exe` attached and notes
   generated from the merged pull requests.

## What the release workflow does

[`.github/workflows/release.yml`](../.github/workflows/release.yml) runs on a Windows machine
and:

1. Checks that the tag matches the version in `package.json`. It stops if they differ.
2. Installs dependencies and downloads Python and GCC (`scripts/fetch-runtimes.ps1`).
3. Runs `npm test`. **If any test fails, nothing is published.**
4. Builds the installer with `npm run dist`.
5. Creates the GitHub release, uploads the installer, and puts its SHA-256 checksum in the
   release notes so users can verify their download.

## If something goes wrong

| Symptom | Fix |
|---|---|
| "Tag is v1.1.0 but package.json version is …" | Fix the version in `package.json`, push it, then delete and recreate the tag (below). |
| Tests fail in the release run | Fix the problem on `main`, then re-tag. No release was created. |
| The workflow can't create the release | In the repo go to **Settings → Actions → General → Workflow permissions** and choose **Read and write permissions**. |
| You tagged the wrong commit | Delete the tag (below), fix, tag again. |

To delete and redo a tag (only if no release was published from it):
```
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0
```

If a release already exists for the tag, delete that release on GitHub first, then delete the tag.

## Building by hand (fallback)

```
powershell -ExecutionPolicy Bypass -File scripts\fetch-runtimes.ps1
npm test
npm run dist
```

The installer is written to `dist\CodeLab-Setup-<version>.exe`. Upload it to a new release
yourself.

## Notes

- The installer is **not code-signed**, so Windows SmartScreen shows a warning. Signing needs
  a paid certificate. The release notes tell users to click *More info → Run anyway*.
- Each release bundles Python and GCC. When you update the versions in
  `scripts/fetch-runtimes.ps1`, update `THIRD-PARTY-NOTICES.md` as well.
