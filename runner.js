// Runs student code with local toolchains. Plain Node — no Electron imports,
// so it can be tested with `node scripts/smoke.js`.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TIMEOUT_MS = 5000;
const COMPILE_TIMEOUT_MS = 20000; // first gcc run on a cold PC can be slow
const MAX_OUTPUT = 64 * 1024;
const MAX_CODE_BYTES = 256 * 1024;
const MAX_STDIN_BYTES = 64 * 1024;

// Student programs only see these environment variables (plus PATH). Everything else, such as
// API keys or tokens set in the teacher's session, is left out.
const ENV_ALLOWLIST = [
  'SystemRoot', 'windir', 'SystemDrive', 'TEMP', 'TMP', 'ComSpec', 'PATHEXT',
  'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS',
];

// child.kill() only ends one process. taskkill /T also ends everything it started, so a program
// that launches helpers can't keep running after the time limit.
function killTree(child) {
  try {
    if (process.platform === 'win32' && child.pid) {
      const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
      const k = spawn(taskkill, ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      k.on('error', () => child.kill());
      return;
    }
  } catch { /* fall through */ }
  child.kill();
}

// runtimesDir: folder holding bundled tools (may not exist in development).
// jsRuntime: { cmd, env } used to run JavaScript.
function createRunner({ runtimesDir, jsRuntime }) {
  const bundled = (...p) => {
    const full = path.join(runtimesDir || '', ...p);
    return runtimesDir && fs.existsSync(full) ? full : null;
  };

  const tools = {
    python: bundled('python', 'python.exe') || 'python',
    gcc: bundled('mingw', 'bin', 'gcc.exe') || 'gcc',
    gpp: bundled('mingw', 'bin', 'g++.exe') || 'g++',
  };

  // limiter.exe runs a program inside a Windows Job Object (memory cap, process cap, kill-all
  // on exit). See scripts/limiter.c. Without it (plain development setup) programs run unlimited.
  const limiter = bundled('limiter.exe');

  // Bundled MinGW needs its bin folder on PATH to find cc1/as/ld DLLs.
  const mingwBin = bundled('mingw', 'bin');
  function childEnv(extra) {
    const env = {};
    for (const key of ENV_ALLOWLIST) {
      if (process.env[key] !== undefined) env[key] = process.env[key];
    }
    env.PATH = (mingwBin ? mingwBin + path.delimiter : '') + (process.env.PATH || '');
    return { ...env, ...extra };
  }

  const languages = {
    javascript: { file: 'main.js', run: (d) => [jsRuntime.cmd, [path.join(d, 'main.js')], jsRuntime.env] },
    python: { file: 'main.py', run: (d) => [tools.python, ['-u', path.join(d, 'main.py')], { PYTHONIOENCODING: 'utf-8' }] },
    c: {
      file: 'main.c',
      compile: (d) => [tools.gcc, [path.join(d, 'main.c'), '-o', path.join(d, 'main.exe'), '-lm']],
      run: (d) => [path.join(d, 'main.exe'), []],
    },
    cpp: {
      file: 'main.cpp',
      compile: (d) => [tools.gpp, [path.join(d, 'main.cpp'), '-o', path.join(d, 'main.exe')]],
      run: (d) => [path.join(d, 'main.exe'), []],
    },
  };

  function runProcess(cmd, args, { cwd, stdin = '', extraEnv = {}, timeout }) {
    return new Promise((resolve) => {
      let stdout = '', stderr = '', timedOut = false, truncated = false;
      let child;
      try {
        child = spawn(cmd, args, { cwd, env: childEnv(extraEnv), windowsHide: true });
      } catch (e) {
        return resolve({ stdout: '', stderr: String(e.message), exitCode: -1, timedOut: false });
      }
      const append = (which, chunk) => {
        const s = chunk.toString('utf8');
        if (stdout.length + stderr.length + s.length > MAX_OUTPUT) {
          truncated = true;
          killTree(child);
          return;
        }
        if (which === 'out') stdout += s; else stderr += s;
      };
      const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeout);
      child.stdout.on('data', (c) => append('out', c));
      child.stderr.on('data', (c) => append('err', c));
      child.on('error', (e) => {
        clearTimeout(timer);
        const msg = e.code === 'ENOENT' ? `Tool not found: ${cmd}` : e.message;
        resolve({ stdout, stderr: stderr + msg, exitCode: -1, timedOut: false });
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (truncated) stderr += '\n[Output too long — stopped]';
        resolve({ stdout, stderr, exitCode: code, timedOut });
      });
      child.stdin.on('error', () => {}); // program may exit without reading stdin
      child.stdin.end(stdin);
    });
  }

  async function run({ lang, code, stdin = '' }) {
    const spec = languages[lang];
    const refuse = (msg) => ({ stdout: '', stderr: msg, exitCode: -1, timedOut: false, phase: 'setup' });
    if (!spec) return refuse(`Unknown language: ${lang}`);
    if (typeof code !== 'string' || typeof stdin !== 'string') return refuse('Bad request');
    if (Buffer.byteLength(code) > MAX_CODE_BYTES) return refuse(`Program is too big (limit ${MAX_CODE_BYTES / 1024} KB).`);
    if (Buffer.byteLength(stdin) > MAX_STDIN_BYTES) return refuse(`Input is too big (limit ${MAX_STDIN_BYTES / 1024} KB).`);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codelab-'));
    try {
      fs.writeFileSync(path.join(dir, spec.file), code, 'utf8');

      if (spec.compile) {
        const [cmd, args] = spec.compile(dir);
        const c = await runProcess(cmd, args, { cwd: dir, timeout: COMPILE_TIMEOUT_MS });
        if (c.exitCode !== 0 || c.timedOut) {
          return { ...c, stderr: c.timedOut ? 'Compile took too long.' : c.stderr, phase: 'compile' };
        }
      }

      const [cmd, args, extraEnv] = spec.run(dir);
      const start = Date.now();
      // With the limiter, the student's program is started *by* limiter.exe inside the job.
      const r = await runProcess(limiter || cmd, limiter ? [cmd, ...args] : args, { cwd: dir, stdin, extraEnv, timeout: TIMEOUT_MS });
      if (r.timedOut) r.stderr += `\n[Stopped: program ran longer than ${TIMEOUT_MS / 1000} seconds]`;
      return { ...r, phase: 'run', ms: Date.now() - start };
    } finally {
      // exe may still be locked for a moment after kill on Windows
      setTimeout(() => fs.rm(dir, { recursive: true, force: true }, () => {}), 500);
    }
  }

  return { run, tools, limited: Boolean(limiter) };
}

module.exports = { createRunner };
