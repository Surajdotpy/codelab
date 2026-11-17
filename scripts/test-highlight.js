// Tests for highlight.js. Usage: node scripts/test-highlight.js
const assert = require('assert');
const { highlight } = require('../highlight');

const unescape = (h) => h.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}

const samples = {
  python: 'import os\n# note <b>\nname = input("x & y")\nprint(f"hi {name}", 3.14, 0xFF)\n"""doc\nstring"""\n@deco\ndef f(): return None\nbad = "unterminated\n',
  javascript: '// c\nconst s = `tpl ${1}`; /* multi\nline */ let n = 10;\nconsole.log("a<b", \'x\');\n',
  c: '#include <stdio.h>\n  #define N 5\nint main() { char c = \'a\'; printf("%d\\n", 1 < 2); return 0; } // end\n/* unterminated',
  cpp: '#include <iostream>\nusing namespace std;\nint main(){ cout << "hi" << endl; vector<int> v; return 0; }',
};

for (const [lang, code] of Object.entries(samples)) {
  test(lang + ': no characters lost or altered', () => assert.strictEqual(unescape(highlight(code, lang)), code));
}

test('python tokens', () => {
  const h = highlight('print("hi") # c\nx = 5', 'python');
  assert(h.includes('<span class="tok-builtin">print</span>'));
  assert(h.includes('<span class="tok-string">"hi"</span>'));
  assert(h.includes('<span class="tok-comment"># c</span>'));
  assert(h.includes('<span class="tok-number">5</span>'));
});
test('keyword is not matched inside a word', () => {
  assert(!highlight('classify = 1', 'python').includes('tok-keyword'));
  assert(!highlight('int interval;', 'c').includes('tok-keyword'));
});
test('c preprocessor line', () => assert(highlight('#include <stdio.h>', 'c').includes('<span class="tok-pre">#include &lt;stdio.h&gt;</span>')));
test('hash in python string is not a comment', () => assert(!highlight('s = "a # b"', 'python').includes('tok-comment')));
test('html in code is escaped', () => {
  const h = highlight('console.log("<script>alert(1)</script>")', 'javascript');
  assert(!h.includes('<script>'));
  assert(h.includes('&lt;script&gt;'));
});
test('unknown language and empty input', () => {
  assert.strictEqual(highlight('a<b', 'ruby'), 'a&lt;b');
  assert.strictEqual(highlight('', 'python'), '');
});

console.log(failed ? `\n${failed} failed` : '\nAll passed');
process.exit(failed ? 1 : 0);
