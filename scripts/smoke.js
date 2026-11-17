// Smoke test: runs hello + stdin programs in every language, plus error cases.
// Usage: node scripts/smoke.js
const path = require('path');
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

(async () => {
  console.log('Tools:', runner.tools);
  let failed = 0;
  for (const c of cases) {
    const r = await runner.run(c);
    const ok = c.expect(r);
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}`);
    if (!ok) console.log('      ', JSON.stringify({ ...r, stdout: r.stdout.slice(0, 200), stderr: r.stderr.slice(0, 300) }));
  }
  console.log(failed ? `\n${failed} failed` : '\nAll passed');
  process.exit(failed ? 1 : 0);
})();
