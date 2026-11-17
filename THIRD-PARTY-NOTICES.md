# Third-party software

CodeLab's own source code is MIT licensed (see `LICENSE`). The **installer** you
download from the Releases page also contains the following separate programs,
each under its own license. They are **not** stored in this repository:
`scripts/fetch-runtimes.ps1` downloads them when you build.

| Component | Used for | License | Source |
|---|---|---|---|
| Electron (includes Node.js and Chromium) | The app window and JavaScript execution | MIT, plus Chromium's component licenses (`LICENSES.chromium.html` ships inside the app) | https://github.com/electron/electron |
| Python (embeddable distribution) | Running Python programs | PSF License | https://www.python.org/downloads/ |
| w64devkit: GCC / G++, binutils, mingw-w64 | Compiling C and C++ programs | GCC and binutils are GPL-3.0 (the GCC Runtime Library Exception applies to programs students compile); mingw-w64 and w64devkit's own scripts use permissive or public-domain terms | https://github.com/skeeto/w64devkit |

The exact license terms are those published by each project. Check them before
you redistribute a build. In particular, if you distribute the GCC binaries you
must be able to provide the corresponding source. The w64devkit release page
links to it.

Programs that students write and compile with CodeLab belong to the students.
The GCC Runtime Library Exception means they carry no GPL obligation.
