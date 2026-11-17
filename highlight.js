// Tiny syntax highlighter (no dependencies). Turns source code into HTML made of
// escaped text plus <span class="tok-..."> wrappers. Works in the browser and in Node tests.
(function (root) {
  const words = (s) => '\\b(?:' + s.trim().split(/\s+/).join('|') + ')\\b';

  const NUMBER = '\\b(?:0[xX][0-9a-fA-F]+|\\d+\\.?\\d*(?:[eE][+-]?\\d+)?|\\.\\d+)\\b';
  const DQ = '"(?:\\\\.|[^"\\\\\\n])*"?';
  const SQ = "'(?:\\\\.|[^'\\\\\\n])*'?";
  const C_COMMENT = '//[^\\n]*|/\\*[\\s\\S]*?(?:\\*/|$)';

  const C_KEYWORDS = 'auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while';
  const C_TYPES = 'int char float double void long short unsigned signed size_t bool FILE NULL';

  // Each rule: [regex source (no capturing groups), token class]. Earlier rules win.
  const LANGS = {
    python: [
      ['#[^\\n]*', 'comment'],
      ['[rRbBfFuU]{0,2}(?:\'\'\'[\\s\\S]*?(?:\'\'\'|$)|"""[\\s\\S]*?(?:"""|$)|' + SQ + '|' + DQ + ')', 'string'],
      ['@[A-Za-z_][\\w.]*', 'deco'],
      [NUMBER, 'number'],
      [words('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'), 'keyword'],
      [words('print input len range int str float list dict set tuple bool open sum min max abs sorted enumerate zip map filter type isinstance round reversed any all'), 'builtin'],
    ],
    javascript: [
      [C_COMMENT, 'comment'],
      ['`(?:\\\\[\\s\\S]|[^`\\\\])*`?|' + DQ + '|' + SQ, 'string'],
      [NUMBER, 'number'],
      [words('break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return static super switch this throw try typeof var void while with yield async await null undefined true false'), 'keyword'],
      [words('console Math JSON Object Array String Number Boolean Promise Date Map Set parseInt parseFloat require process'), 'builtin'],
    ],
    c: [
      [C_COMMENT, 'comment'],
      ['(?<![^\\n])[ \\t]*#[^\\n]*', 'pre'],
      [DQ + '|' + SQ, 'string'],
      [NUMBER, 'number'],
      [words(C_KEYWORDS), 'keyword'],
      [words(C_TYPES), 'type'],
      [words('printf scanf puts gets fgets getchar putchar malloc free strlen strcpy strcmp sqrt pow'), 'builtin'],
    ],
    cpp: [
      [C_COMMENT, 'comment'],
      ['(?<![^\\n])[ \\t]*#[^\\n]*', 'pre'],
      [DQ + '|' + SQ, 'string'],
      [NUMBER, 'number'],
      [words(C_KEYWORDS + ' class namespace using template typename public private protected virtual override new delete this try catch throw nullptr true false operator friend explicit constexpr noexcept'), 'keyword'],
      [words(C_TYPES + ' string vector map set array pair'), 'type'],
      [words('cout cin cerr endl std getline sort printf scanf'), 'builtin'],
    ],
  };

  const compiled = {};
  function getLang(lang) {
    if (!LANGS[lang]) return null;
    if (!compiled[lang]) {
      compiled[lang] = { rules: LANGS[lang], re: new RegExp(LANGS[lang].map((r) => '(' + r[0] + ')').join('|'), 'g') };
    }
    return compiled[lang];
  }

  const escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  const esc = (s) => s.replace(/[&<>]/g, (c) => escMap[c]);

  function highlight(code, lang) {
    const l = getLang(lang);
    if (!l) return esc(code);
    const { rules, re } = l;
    re.lastIndex = 0;
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      if (m[0] === '') { re.lastIndex++; continue; }
      let i = 1;
      while (m[i] === undefined) i++;
      out += esc(code.slice(last, m.index)) + '<span class="tok-' + rules[i - 1][1] + '">' + esc(m[0]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  const api = { highlight };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CodeHighlight = api;
})(typeof window !== 'undefined' ? window : globalThis);
