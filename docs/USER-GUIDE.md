# CodeLab user guide

CodeLab lets you write and run **Python, JavaScript, C and C++** in one window, with no
internet and nothing else to install.

- [Install](#install)
- [Your first program](#your-first-program)
- [Programs that ask for input](#programs-that-ask-for-input)
- [Saving and opening files](#saving-and-opening-files)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [What works and what doesn't](#what-works-and-what-doesnt)
- [Troubleshooting](#troubleshooting)
- [For teachers and IT staff](#for-teachers-and-it-staff)

## Install

You need a 64-bit **Windows 10 or 11** PC with about 600 MB of free disk space.

1. Go to the [latest release](https://github.com/Surajdotpy/codelab/releases/latest) and
   download **CodeLab-Setup-*.exe** (under *Assets*).
2. Double-click it. It installs for your own account, so you don't need an administrator.
3. Open **CodeLab** from the desktop shortcut or the Start menu.

Windows may say *"Windows protected your PC"* because the app isn't digitally signed.
Click **More info**, then **Run anyway**.

To update, download the newest installer and run it. It replaces the old version and
keeps the code you saved.

## Your first program

1. Pick a language with the tabs at the top: **Python**, **JavaScript**, **C** or **C++**.
   Each one starts with a small example.
2. Press **▶ Run** (or **Ctrl+Enter**).
3. The result appears in the **Output** box. Errors are shown in red.

Change the code and run it again. CodeLab remembers the code you wrote in each language
and brings it back next time. **Reset** puts the starter example back.

When you press Run:
- Python and JavaScript start right away.
- C and C++ are **compiled** first, so the first run takes a second or two. If the
  compiler finds a mistake you'll see "Compile error" with the line number.

## Programs that ask for input

Programs that read from the keyboard (`input()` in Python, `scanf` in C, `cin` in C++)
get their answers from the **Input** box, **not** from a prompt that appears while the
program runs. Type everything the program will ask for **before** you press Run, one
answer per line.

Example (Python):

```python
a = int(input("First number: "))
b = int(input("Second number: "))
print("Sum:", a + b)
```

Type this in the Input box:

```
4
5
```

and the output is `First number: Second number: Sum: 9`. If the Input box is empty, the
program stops with an error like `EOFError`. That just means it asked for input
and there was none.

Reading input in other languages:

```javascript
// JavaScript: read all the lines at once
const lines = require("fs").readFileSync(0, "utf8").trim().split("\n");
console.log("Hello, " + lines[0]);
```

```c
// C
int a, b;
scanf("%d %d", &a, &b);
```

```cpp
// C++
int a, b;
std::cin >> a >> b;
```

## Saving and opening files

- **Save** (Ctrl+S) writes your code to a file, such as `main.py`, in a folder you choose.
- **Open** (Ctrl+O) loads a file into the editor, replacing what's there.

Your code is also remembered automatically inside CodeLab, but save a file if you want
to keep a program, move it to another PC, or hand it in.

## Keyboard shortcuts

| Keys | What it does |
|---|---|
| Ctrl+Enter | Run the program |
| Ctrl+S | Save to a file |
| Ctrl+O | Open a file |
| Ctrl + `+` / Ctrl + `-` | Make the code bigger or smaller |
| Tab | Insert spaces (indent) |
| Enter | New line, keeping the indent. It indents further after `:` or `{`. |

## What works and what doesn't

**Works**
- The standard libraries of all four languages, including `math.h`, the C++ STL
  (`vector`, `map`, `sort`, …), C++17, and Node.js modules such as `fs` and `readline`.
- Python 3.12, a current GCC (C and C++), and Node.js.
- On Windows: `windows.h` for C and C++.

**Limits (on purpose or by design)**
- A program is **stopped after 5 seconds**. This protects the computer from endless loops.
- A program can use at most **256 MB of memory** and start at most **16 processes**. Beyond that,
  allocations fail (for example `MemoryError` in Python, or `malloc` returning `NULL` in C) and you'll
  see *"[Stopped: program used too much memory]"*.
- Output is capped at about **64 KB**; a program can be at most 256 KB, the Input box at most 64 KB.
- Programs can't use the clipboard and don't see your computer's environment variables
  (only a few basic Windows ones).
- **One file per program.** There are no multi-file projects.
- Python has the standard library only: **no `pip`, no `tkinter`, no `turtle`**.
  No graphics windows from any language.
- Programs can't wait for you to type while they run. See [input](#programs-that-ask-for-input).
- Each Run starts fresh. Nothing is kept between runs except the files your program saves.

## Troubleshooting

| Problem | What to do |
|---|---|
| Windows blocks the installer | Click **More info**, then **Run anyway**. The app is unsigned. |
| "stopped (too long)" | The program ran for more than 5 seconds, often an endless loop (`while True`, `while(1)`). Check the loop's exit condition. |
| `EOFError` (Python) or the program ends at `scanf`/`cin` | It asked for input and the Input box was empty. Type the values first. |
| "used too much memory" or `MemoryError` | The program needed more than 256 MB, often a list or array that keeps growing in a loop. |
| "Compile error" in C or C++ | Read the first error, since it is usually the real one. The message shows the line number. |
| "Tool not found" | The app is damaged or incomplete. Reinstall it from the latest release. |
| Antivirus quarantines a program or the compiler | Some antivirus tools dislike freshly compiled `.exe` files. Ask your IT staff to allow CodeLab and its temp folder. |
| The first C/C++ run is slow | Normal. The compiler is starting. Later runs are faster. |
| Something else | [Open an issue](https://github.com/Surajdotpy/codelab/issues/new/choose) with your Windows version, the language, and the code. |

## For teachers and IT staff

**Installing on many PCs**
- Put the installer on a USB stick or a network share and run it on each PC. It installs per
  user, so it must be run **for each Windows account** that will use it.
- For scripted installs, run `CodeLab-Setup-X.exe /S` for a silent install (the
  standard switch for this kind of installer).
- To uninstall, use **Settings → Apps → CodeLab**.

**Updating**
- Installing a newer installer over the old one is enough. There is no automatic update;
  see [RELEASING.md](RELEASING.md) for how new versions are published.

**Student accounts and safety**
- Each program is limited to 5 seconds, 256 MB of memory, 16 processes and 64 KB of output, and
  everything it starts is killed when it stops. A runaway program can't freeze the PC.
- Student code is still **not sandboxed**: it runs as the signed-in user and can read or delete that
  user's files and use the network. Use a standard (non-administrator) Windows account for students,
  so a program can only affect that student's own files. See [SECURITY.md](../SECURITY.md).

**Where data is stored**
- Saved editor contents live in `%APPDATA%\codelab` for each Windows user.
  To clear a PC's remembered code, close CodeLab and delete that folder.
- Programs run inside a temporary folder that is deleted afterwards.

**Network and privacy**
- CodeLab works fully offline and never sends anything over the network.
