const STARTERS = {
  python: `# Python
name = input("What is your name? ")
print("Hello,", name + "!")

for i in range(1, 6):
    print(i, "x 2 =", i * 2)
`,
  javascript: `// JavaScript
console.log("Hello, CodeLab!");

for (let i = 1; i <= 5; i++) {
  console.log(i + " x 2 = " + i * 2);
}
`,
  c: `// C
#include <stdio.h>

int main() {
    char name[50];
    printf("What is your name? ");
    scanf("%49s", name);
    printf("Hello, %s!\\n", name);

    for (int i = 1; i <= 5; i++) {
        printf("%d x 2 = %d\\n", i, i * 2);
    }
    return 0;
}
`,
  cpp: `// C++
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cout << "What is your name? ";
    cin >> name;
    cout << "Hello, " << name << "!" << endl;

    for (int i = 1; i <= 5; i++) {
        cout << i << " x 2 = " << i * 2 << endl;
    }
    return 0;
}
`,
};

const FILE_NAMES = { python: 'main.py', javascript: 'main.js', c: 'main.c', cpp: 'main.cpp' };

const $ = (id) => document.getElementById(id);
const codeEl = $('code'), gutterEl = $('gutter'), outputEl = $('output');
const stdinEl = $('stdin'), statusEl = $('status'), runBtn = $('runBtn');

// Safe localStorage helpers (storage may be unavailable).
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

let lang = store.get('codelab.lang') || 'python';
let fontSize = Number(store.get('codelab.font')) || 16;

function codeFor(l) { return store.get('codelab.code.' + l) ?? STARTERS[l]; }

function setLang(l) {
  store.set('codelab.code.' + lang, codeEl.value);
  lang = l;
  store.set('codelab.lang', l);
  codeEl.value = codeFor(l);
  $('fileName').textContent = FILE_NAMES[l];
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.lang === l));
  updateGutter();
  codeEl.focus();
}

const highlightEl = $('highlight');

// Re-renders line numbers and colors; name kept from before the highlighter existed.
function updateGutter() {
  const n = codeEl.value.split('\n').length;
  let s = '';
  for (let i = 1; i <= n; i++) s += i + '\n';
  gutterEl.textContent = s;
  // Trailing newline keeps the last (possibly empty) line the same height as in the textarea.
  highlightEl.innerHTML = window.CodeHighlight.highlight(codeEl.value, lang) + '\n';
  syncScroll();
}

function syncScroll() {
  gutterEl.scrollTop = codeEl.scrollTop;
  highlightEl.scrollTop = codeEl.scrollTop;
  highlightEl.scrollLeft = codeEl.scrollLeft;
}

function applyFont() {
  fontSize = Math.min(32, Math.max(10, fontSize));
  document.documentElement.style.setProperty('--code-size', fontSize + 'px');
  store.set('codelab.font', String(fontSize));
}

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = 'status ' + (cls || '');
}

function show(result) {
  outputEl.textContent = '';
  const add = (text, cls) => {
    if (!text) return;
    const span = document.createElement('span');
    if (cls) span.className = cls;
    span.textContent = text;
    outputEl.appendChild(span);
  };
  if (result.phase === 'compile') add('Compile error:\n', 'err');
  add(result.stdout);
  if (result.stdout && result.stderr && !result.stdout.endsWith('\n')) add('\n');
  add(result.stderr, 'err');
  if (!result.stdout && !result.stderr) add('(no output)', 'muted');
}

async function run() {
  if (runBtn.disabled) return;
  store.set('codelab.code.' + lang, codeEl.value);
  runBtn.disabled = true;
  runBtn.textContent = '… Running';
  setStatus(lang === 'c' || lang === 'cpp' ? 'compiling…' : 'running…', 'busy');
  try {
    const r = await window.codelab.run(lang, codeEl.value, stdinEl.value);
    show(r);
    if (r.timedOut) setStatus('stopped (too long)', 'fail');
    else if (r.phase === 'compile') setStatus('compile failed', 'fail');
    else if (r.exitCode === 0) setStatus(`finished · ${r.ms} ms`, 'ok');
    else setStatus(`error (exit ${r.exitCode})`, 'fail');
  } catch (e) {
    show({ stdout: '', stderr: String(e) });
    setStatus('error', 'fail');
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '▶ Run';
  }
}

// Editor behaviour: Tab inserts spaces, Enter keeps indentation.
codeEl.addEventListener('keydown', (e) => {
  const { selectionStart: s, selectionEnd: end, value } = codeEl;
  if (e.key === 'Tab') {
    e.preventDefault();
    const indent = lang === 'python' || lang === 'c' || lang === 'cpp' ? '    ' : '  ';
    codeEl.setRangeText(indent, s, end, 'end');
    updateGutter();
  } else if (e.key === 'Enter' && !e.ctrlKey) {
    e.preventDefault();
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    let indent = value.slice(lineStart, s).match(/^[ \t]*/)[0];
    const prev = value.slice(lineStart, s).trimEnd();
    if (prev.endsWith(':') || prev.endsWith('{')) indent += lang === 'javascript' ? '  ' : '    ';
    codeEl.setRangeText('\n' + indent, s, end, 'end');
    updateGutter();
  }
});
codeEl.addEventListener('input', updateGutter);
codeEl.addEventListener('scroll', syncScroll);

async function saveFile() {
  const r = await window.codelab.save(lang, codeEl.value);
  if (r.ok) setStatus('saved ' + r.name, 'ok');
  else if (r.error) setStatus('save failed: ' + r.error, 'fail');
}

async function openFile() {
  const r = await window.codelab.open(lang);
  if (r.ok) {
    codeEl.value = r.code;
    store.set('codelab.code.' + lang, r.code);
    updateGutter();
    codeEl.scrollTop = 0;
    setStatus('opened ' + r.name, 'ok');
  } else if (r.error) setStatus('open failed: ' + r.error, 'fail');
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); run(); }
  else if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); }
  else if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(); }
  else if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); fontSize += 2; applyFont(); }
  else if (e.ctrlKey && e.key === '-') { e.preventDefault(); fontSize -= 2; applyFont(); }
});

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setLang(t.dataset.lang)));
runBtn.addEventListener('click', run);
$('saveBtn').addEventListener('click', saveFile);
$('openBtn').addEventListener('click', openFile);
$('clearBtn').addEventListener('click', () => { outputEl.textContent = ''; setStatus(''); });
$('resetBtn').addEventListener('click', () => {
  if (confirm('Replace your code with the starter program?')) {
    codeEl.value = STARTERS[lang];
    store.set('codelab.code.' + lang, codeEl.value);
    updateGutter();
  }
});

applyFont();
codeEl.value = codeFor(lang);
setLang(lang);
