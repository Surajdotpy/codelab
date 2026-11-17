// Smoke test: runs hello + stdin programs in every language, plus error cases.
// Usage: node scripts/smoke.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createRunner } = require('../runner');

const runner = createRunner({
  runtimesDir: path.join(__dirname, '..', 'runtimes'),
  jsRuntime: { cmd: process.execPath, env: {} },
});

const cases = [
  { name: 'python stdin', lang: 'python', code: 'n=input()\nprint("Hi", n)', stdin: 'Asha\n', expect: (r) => r.stdout.trim() === 'Hi Asha' },
  { name: 'javascript', lang: 'javascript', code: 'console.log(2+3)', expect: (r) => r.stdout.trim() === '5' },
  { name: 'c stdin', lang: 'c', code: '#include <stdio.h>\nint main(){int a,b;scanf("%d %d",&a,&b);printf("%d\\n",a+b);return 0;}', stdin: '4 5', expect: (r) => r.stdout.trim() === '9' },
  { name: 'cpp stdin', lang: 'cpp', code: '#include <iostream>\n#include <string>\nint main(){std::string s;std::cin>>s;std::cout<<"Hi "<<s<<std::endl;}', stdin: 'Ravi', expect: (r) => r.stdout.trim() === 'Hi Ravi' },
  { name: 'c math.h (sqrt, pow)', lang: 'c', code: '#include <stdio.h>\n#include <math.h>\nint main(){printf("%.1f %.0f\\n",sqrt(16.0),pow(2,10));return 0;}', expect: (r) => r.stdout.trim() === '4.0 1024' },
  { name: 'c windows.h (Sleep)', lang: 'c', code: '#include <stdio.h>\n#include <windows.h>\nint main(){Sleep(10);printf("ok\\n");return 0;}', expect: (r) => r.stdout.trim() === 'ok' },
  { name: 'cpp STL (vector, sort, map)', lang: 'cpp', code: '#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <map>\n#include <string>\nint main(){std::vector<int> v{3,1,2};std::sort(v.begin(),v.end());std::map<std::string,int> m;m["a"]=v[2];std::cout<<v[0]<<v[1]<<v[2]<<m["a"]<<std::endl;}', expect: (r) => r.stdout.trim() === '1233' },
  { name: 'cpp C++17 features', lang: 'cpp', code: '#include <iostream>\n#include <optional>\nint main(){std::optional<int> o=5;auto [a,b]=std::pair{1,2};std::cout<<*o+a+b<<std::endl;}', expect: (r) => r.stdout.trim() === '8' },
  { name: 'python error', lang: 'python', code: 'print(1/0)', expect: (r) => r.exitCode !== 0 && /ZeroDivisionError/.test(r.stderr) },
  { name: 'c compile error', lang: 'c', code: 'int main(){ return x; }', expect: (r) => r.phase === 'compile' && r.exitCode !== 0 },
  { name: 'infinite loop stops', lang: 'javascript', code: 'while(true){}', expect: (r) => r.timedOut === true },
  { name: 'output flood capped', lang: 'python', code: 'while True: print("x"*100)', expect: (r) => /too long/.test(r.stderr) },
];

// ---- Safety tests: the things a curious or careless student might do -----------------------

// Count of `exe` processes whose command line contains `marker` (our own leftovers).
function leftovers(exe, marker) {
  const ps = `(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq '${exe}' -and $_.CommandLine -like '*${marker}*' } | Measure-Object).Count`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  return Number((r.stdout || '').trim());
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Memory-bomb checks fill memory up to the 256 MB cap. On a PC that is already short of memory
// that can starve other apps, so they are skipped there. In CI (GitHub sets CI=true) a skip
// counts as a failure, so the checks always really run before a release.
const MIN_FREE_FOR_HEAVY = 1.5 * 1024 ** 3;
const lowMemory = os.freemem() < MIN_FREE_FOR_HEAVY;

const sleeperSrc = (marker) => `import subprocess, sys\nsubprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)  # ${marker}"])\n`;

const safetyCases = [
  {
    name: 'limiter is active (memory and process caps)',
    run: async () => runner.limited,
  },
  {
    name: 'python memory bomb (2 GB) is stopped with a clear message',
    run: async () => {
      const r = await runner.run({ lang: 'python', code: 'x = bytearray(2 * 10**9)\nprint("ALLOCATED")' });
      return !r.stdout.includes('ALLOCATED') && /too much memory/.test(r.stderr);
    },
  },
  {
    name: 'python memory creep is stopped',
    heavy: true,
    run: async () => {
      const r = await runner.run({ lang: 'python', code: 'a = []\nfor i in range(300):\n    a.append(bytearray(10 * 1024 * 1024))\nprint("ALLOCATED")' });
      return !r.stdout.includes('ALLOCATED') && /too much memory/.test(r.stderr);
    },
  },
  {
    name: 'javascript memory bomb is stopped',
    heavy: true,
    run: async () => {
      const r = await runner.run({ lang: 'javascript', code: 'const a = [];\nfor (;;) a.push(new Array(1e6).fill(1));\n' });
      return r.exitCode !== 0 && !r.timedOut;
    },
  },
  {
    name: 'c memory bomb: malloc fails instead of freezing the PC',
    heavy: true,
    run: async () => {
      const code = '#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\nint main() {\n  for (;;) {\n    char *p = malloc(1 << 20);\n    if (!p) { puts("malloc failed"); return 0; }\n    memset(p, 1, 1 << 20);\n  }\n}\n';
      const r = await runner.run({ lang: 'c', code });
      return /malloc failed/.test(r.stdout) || /too much memory/.test(r.stderr);
    },
  },
  {
    name: 'a normal 100 MB allocation still works',
    run: async () => {
      const r = await runner.run({ lang: 'python', code: 'x = bytearray(100 * 10**6)\nprint(len(x))' });
      return r.stdout.trim() === '100000000';
    },
  },
  {
    // Fast child processes (cmd.exe), so the cap is reached well inside the time limit.
    name: 'process cap: a program cannot start more than 16 processes',
    run: async () => {
      const marker = 'CAPTEST' + process.pid;
      const code = '#include <stdio.h>\n#include <windows.h>\nint main(void) {\n  int started = 0;\n  for (int i = 0; i < 40; i++) {\n    STARTUPINFOA si = { sizeof si };\n    PROCESS_INFORMATION pi;\n    char cmd[] = "cmd.exe /c ping -n 30 127.0.0.1 >nul & rem ' + marker + '";\n    if (!CreateProcessA(NULL, cmd, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {\n      printf("CAPPED at %d\\n", started);\n      return 0;\n    }\n    started++;\n  }\n  printf("STARTED %d\\n", started);\n  return 0;\n}\n';
      const r = await runner.run({ lang: 'c', code });
      await sleep(1500);
      const m = /CAPPED at (\d+)/.exec(r.stdout);
      const left = leftovers('cmd.exe', marker);
      const ok = Boolean(m) && Number(m[1]) < 16 && left === 0;
      if (!ok) console.log('       detail:', JSON.stringify({ stdout: r.stdout, stderr: r.stderr.slice(-300), timedOut: r.timedOut, phase: r.phase, left }));
      return ok;
    },
  },
  {
    // On a slow PC the time limit may stop this before the cap does; either way nothing may survive.
    name: 'python fork bomb is stopped and nothing is left running',
    run: async () => {
      const marker = 'FORKTEST' + process.pid;
      const code = `import subprocess, sys\nkids = []\ntry:\n    for i in range(60):\n        kids.append(subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)  # ${marker}"]))\n    print("STARTED", len(kids))\nexcept Exception as e:\n    print("CAPPED at", len(kids))\n`;
      const r = await runner.run({ lang: 'python', code });
      await sleep(1500);
      const stopped = /CAPPED at \d+/.test(r.stdout) || r.timedOut;
      return stopped && !r.stdout.includes('STARTED') && leftovers('python.exe', marker) === 0;
    },
  },
  {
    name: 'a child process cannot outlive the time limit',
    run: async () => {
      const marker = 'ORPHANTEST' + process.pid;
      const r = await runner.run({ lang: 'python', code: sleeperSrc(marker) + 'while True:\n    pass\n' });
      await sleep(1500);
      return r.timedOut === true && leftovers('python.exe', marker) === 0;
    },
  },
  {
    name: 'secrets in the parent environment are not visible to programs',
    run: async () => {
      process.env.CODELAB_SECRET_TEST = 'topsecret';
      try {
        const py = await runner.run({ lang: 'python', code: 'import os\nprint(os.environ.get("CODELAB_SECRET_TEST"), "SystemRoot" in os.environ)' });
        const js = await runner.run({ lang: 'javascript', code: 'console.log(process.env.CODELAB_SECRET_TEST, "SystemRoot" in process.env)' });
        return py.stdout.trim() === 'None True' && js.stdout.trim() === 'undefined true';
      } finally { delete process.env.CODELAB_SECRET_TEST; }
    },
  },
  {
    name: 'works when the temp folder path contains spaces',
    run: async () => {
      const saved = { TEMP: process.env.TEMP, TMP: process.env.TMP };
      const spaced = fs.mkdtempSync(path.join(os.tmpdir(), 'code lab test '));
      process.env.TEMP = process.env.TMP = spaced;
      try {
        const py = await runner.run({ lang: 'python', code: 'print("py ok")' });
        const c = await runner.run({ lang: 'c', code: '#include <stdio.h>\nint main(){puts("c ok");return 0;}' });
        return py.stdout.trim() === 'py ok' && c.stdout.trim() === 'c ok';
      } finally {
        process.env.TEMP = saved.TEMP; process.env.TMP = saved.TMP;
        fs.rmSync(spaced, { recursive: true, force: true });
      }
    },
  },
  {
    name: 'oversized program and input are refused',
    run: async () => {
      const big = await runner.run({ lang: 'python', code: '#' + 'x'.repeat(300 * 1024) });
      const bigIn = await runner.run({ lang: 'python', code: 'print(1)', stdin: 'y'.repeat(70 * 1024) });
      return big.phase === 'setup' && /too big/.test(big.stderr) && bigIn.phase === 'setup' && /too big/.test(bigIn.stderr);
    },
  },
  {
    name: 'exit code of the program is passed through',
    run: async () => (await runner.run({ lang: 'python', code: 'import sys\nsys.exit(7)' })).exitCode === 7,
  },
];

(async () => {
  console.log('Tools:', runner.tools, '| limiter:', runner.limited);
  let failed = 0;
  for (const c of cases) {
    const r = await runner.run(c);
    const ok = c.expect(r);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
    if (!ok) console.log('      ', JSON.stringify({ ...r, stdout: r.stdout.slice(0, 200), stderr: r.stderr.slice(0, 300) }));
  }
  console.log('\nSafety checks:');
  let skipped = 0;
  for (const c of safetyCases) {
    if (c.heavy && lowMemory) {
      skipped++;
      console.log(`SKIP  ${c.name} (less than 1.5 GB of free memory)`);
      continue;
    }
    let ok = false;
    try { ok = await c.run(); } catch (e) { console.log('      ', e.message); }
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
  }
  if (skipped && process.env.CI) {
    console.log(`\n${skipped} memory checks were skipped, which is not allowed in CI`);
    failed += skipped;
  }
  const note = skipped ? ` (${skipped} memory checks skipped: free some memory and run again to cover them)` : '';
  console.log(failed ? `\n${failed} failed` : `\nAll passed${note}`);
  process.exit(failed ? 1 : 0);
})();
