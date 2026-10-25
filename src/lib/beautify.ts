/**
 * Code formatting. Prettier for JavaScript, TypeScript and web formats;
 * WebAssembly builds of each language's own formatter for the rest
 * (clang-format, gofmt, Ruff, Mago, StyLua, shfmt); sql-formatter and
 * a small built-in XML formatter (src/lib/xml.ts) for SQL and XML. Each loads
 * only when its language is used.
 */
import * as wasm from './wasmFormatters';
import { checkJson } from './json';
import { stringifyJson } from './jsonTools';
import { parseJson } from './jsonValue';
import { minifyCss, minifyHtml } from './minify';
import { formatXml, minifyXml } from './xml';

export { minifyCss, minifyHtml } from './minify';

export type CodeLang =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'cpp'
  | 'c'
  | 'go'
  | 'php'
  | 'lua'
  | 'shell'
  | 'html'
  | 'css'
  | 'json'
  | 'yaml'
  | 'xml'
  | 'markdown'
  | 'sql';

type PluginName = 'babel' | 'estree' | 'typescript' | 'postcss' | 'html' | 'markdown' | 'yaml';

const PLUGINS: Record<PluginName, () => Promise<unknown>> = {
  babel: () => import('prettier/plugins/babel'),
  estree: () => import('prettier/plugins/estree'),
  typescript: () => import('prettier/plugins/typescript'),
  postcss: () => import('prettier/plugins/postcss'),
  html: () => import('prettier/plugins/html'),
  markdown: () => import('prettier/plugins/markdown'),
  yaml: () => import('prettier/plugins/yaml'),
};

export interface LangInfo {
  id: CodeLang;
  label: string;
  group: 'Programming languages' | 'Web and data';
  ext: string;
  mime: string;
  /** Formatted by Prettier with this parser and these plugins. */
  prettier?: { parser: string; plugins: PluginName[] };
}

export const LANGS: LangInfo[] = [
  { id: 'javascript', label: 'JavaScript', group: 'Programming languages', ext: 'js', mime: 'text/javascript', prettier: { parser: 'babel', plugins: ['babel', 'estree'] } },
  { id: 'typescript', label: 'TypeScript', group: 'Programming languages', ext: 'ts', mime: 'text/plain', prettier: { parser: 'typescript', plugins: ['typescript', 'estree'] } },
  { id: 'python', label: 'Python', group: 'Programming languages', ext: 'py', mime: 'text/x-python' },
  { id: 'java', label: 'Java', group: 'Programming languages', ext: 'java', mime: 'text/x-java' },
  { id: 'csharp', label: 'C#', group: 'Programming languages', ext: 'cs', mime: 'text/plain' },
  { id: 'cpp', label: 'C++', group: 'Programming languages', ext: 'cpp', mime: 'text/x-c++src' },
  { id: 'c', label: 'C', group: 'Programming languages', ext: 'c', mime: 'text/x-csrc' },
  { id: 'go', label: 'Go', group: 'Programming languages', ext: 'go', mime: 'text/x-go' },
  { id: 'php', label: 'PHP', group: 'Programming languages', ext: 'php', mime: 'text/plain' },
  { id: 'lua', label: 'Lua', group: 'Programming languages', ext: 'lua', mime: 'text/plain' },
  { id: 'shell', label: 'Shell (Bash)', group: 'Programming languages', ext: 'sh', mime: 'text/x-shellscript' },
  // HTML formats its <script> and <style> blocks too, so it needs those parsers
  { id: 'html', label: 'HTML', group: 'Web and data', ext: 'html', mime: 'text/html', prettier: { parser: 'html', plugins: ['html', 'babel', 'estree', 'postcss'] } },
  // The SCSS parser also reads plain CSS
  { id: 'css', label: 'CSS', group: 'Web and data', ext: 'css', mime: 'text/css', prettier: { parser: 'scss', plugins: ['postcss'] } },
  { id: 'json', label: 'JSON', group: 'Web and data', ext: 'json', mime: 'application/json', prettier: { parser: 'json', plugins: ['babel', 'estree'] } },
  { id: 'yaml', label: 'YAML', group: 'Web and data', ext: 'yaml', mime: 'application/yaml', prettier: { parser: 'yaml', plugins: ['yaml'] } },
  { id: 'xml', label: 'XML', group: 'Web and data', ext: 'xml', mime: 'application/xml' },
  { id: 'markdown', label: 'Markdown', group: 'Web and data', ext: 'md', mime: 'text/markdown', prettier: { parser: 'markdown', plugins: ['markdown', 'babel', 'estree', 'postcss', 'yaml'] } },
  { id: 'sql', label: 'SQL', group: 'Web and data', ext: 'sql', mime: 'application/sql' },
];

export const langInfo = (id: CodeLang) => LANGS.find((l) => l.id === id)!;

/** A messy sample per language, for "Load example". */
export const EXAMPLES: Record<CodeLang, string> = {
  javascript:
    'function greet(name){if(!name){return"Hello, stranger"}const parts=["Hello",name];return parts.join(", ")+"!"}const users=[{id:1,name:"Ada"},{id:2,name:"Grace"}];users.forEach(u=>console.log(greet(u.name)));',
  typescript:
    'interface User{id:number;name:string;email?:string}\nexport async function load(ids:number[]):Promise<User[]>{const out:User[]=[];for(const id of ids){if(id<0){continue}out.push({id,name:`user ${id}`})}return out}',
  python:
    'import math\ndef area(shape,**kw):\n  if shape=="circle":return math.pi*kw["r"]**2\n  elif shape=="rect":\n    return kw["w"]*kw["h"]\n  raise ValueError(f"unknown shape {shape}")\nclass Point:\n  def __init__(self,x,y):self.x,self.y=x,y\n  def dist(self,o):return math.hypot(self.x-o.x,self.y-o.y)',
  java: 'import java.util.*;\npublic class Greeter{private final List<String> names=new ArrayList<>();\npublic void add(String name){if(name==null||name.isEmpty()){throw new IllegalArgumentException("name");}names.add(name);}\npublic static void main(String[] args){Greeter g=new Greeter();g.add("Ada");g.add("Grace");for(String n:g.names){System.out.println("Hello, "+n+"!");}}}',
  csharp:
    'using System;using System.Collections.Generic;\nnamespace Demo{public class Greeter{private readonly List<string> names=new();public void Add(string name){if(string.IsNullOrEmpty(name)){throw new ArgumentException("name");}names.Add(name);}\npublic static void Main(){var g=new Greeter();g.Add("Ada");foreach(var n in g.names){Console.WriteLine($"Hello, {n}!");}}}}',
  cpp: '#include <iostream>\n#include <vector>\nint sum(const std::vector<int>&v){int s=0;for(int x:v){if(x>0){s+=x;}}return s;}\nint main(){std::vector<int> v{1,-2,3};std::cout<<"sum: "<<sum(v)<<std::endl;return 0;}',
  c: '#include <stdio.h>\nint factorial(int n){if(n<=1){return 1;}return n*factorial(n-1);}\nint main(void){for(int i=1;i<=5;i++){printf("%d! = %d\\n",i,factorial(i));}return 0;}',
  go: 'package main\nimport ("fmt";"strings")\ntype User struct{ID int;Name string}\nfunc greet(u User)string{if u.Name==""{return "Hello, stranger"}\nreturn fmt.Sprintf("Hello, %s!",strings.Title(u.Name))}\nfunc main(){users:=[]User{{1,"ada"},{2,"grace"}}\nfor _,u:=range users{fmt.Println(greet(u))}}',
  php: '<?php\nclass Greeter{private array $names=[];public function add(string $name):void{if($name===""){throw new InvalidArgumentException("name");}$this->names[]=$name;}\npublic function all():array{return array_map(fn($n)=>"Hello, $n!",$this->names);}}\n$g=new Greeter();$g->add("Ada");foreach($g->all() as $line){echo $line,PHP_EOL;}',
  lua: 'local function greet(name) if name==nil then return "Hello, stranger" end return "Hello, "..name.."!" end\nlocal users={"Ada","Grace"} for i,u in ipairs(users) do print(i,greet(u)) end',
  shell: '#!/bin/bash\nfor f in *.log;do\nif [ -s "$f" ];then\necho "$f has $(wc -l < "$f") lines"\nelse\nrm "$f"\nfi\ndone',
  html: '<!doctype html><html><head><title>Demo</title><style>body{font-family:sans-serif;margin:0}</style></head><body><nav><ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li></ul></nav><main><h1>Hello</h1><p>Some <b>text</b>.</p></main></body></html>',
  css: '.card{display:flex;gap:8px;padding:16px;border-radius:12px}.card:hover{box-shadow:0 2px 8px rgba(0,0,0,.1)}@media (max-width:600px){.card{flex-direction:column}}',
  json: '{"name":"toolspace","version":"1.0.0","scripts":{"dev":"vite","build":"vite build"},"tags":["tools","json"],"config":{"port":8080,"debug":false}}',
  yaml: 'name:   app\nservices:\n    web:\n      image:  nginx:1.27\n      ports: [ "80:80" ]\n    db:\n        image: postgres:16\n        environment:\n              POSTGRES_PASSWORD:   example',
  xml: '<?xml version="1.0"?><catalog><book id="1"><title>Dune</title><author>Frank Herbert</author></book><book id="2"><title>Emma</title><author>Jane Austen</author></book></catalog>',
  markdown: '#  Project\nSome *intro* text.\n* one\n* two\n    * nested\n\n|a|b|\n|-|-|\n|1|2|',
  sql: "select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.active=true and o.created_at>'2026-01-01' group by u.id,u.name having count(o.id)>2 order by orders desc limit 10",
};

/** Each language's usual indentation (PEP 8 for Python, 4 for Java, C#, C/C++ and PHP, tabs for Go). */
export const DEFAULT_INDENT: Record<CodeLang, 2 | 4 | 'tab'> = {
  javascript: 2,
  typescript: 2,
  python: 4,
  java: 4,
  csharp: 4,
  cpp: 4,
  c: 4,
  go: 'tab',
  php: 4,
  lua: 2,
  shell: 2,
  html: 2,
  css: 2,
  json: 2,
  yaml: 2,
  xml: 2,
  markdown: 2,
  sql: 2,
};

/** SQL dialects offered (sql-formatter's names). */
export const SQL_DIALECTS = [
  { id: 'sql', label: 'Standard SQL' },
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'mariadb', label: 'MariaDB' },
  { id: 'tsql', label: 'SQL Server (T-SQL)' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'plsql', label: 'Oracle PL/SQL' },
  { id: 'bigquery', label: 'BigQuery' },
  { id: 'snowflake', label: 'Snowflake' },
] as const;
export type SqlDialect = (typeof SQL_DIALECTS)[number]['id'];
export type KeywordCase = 'upper' | 'lower' | 'preserve';

export interface FormatOptions {
  indent: 2 | 4 | 'tab';
  /** Line length to wrap at, where the formatter supports it. */
  printWidth: number;
  /** JavaScript, TypeScript and Python: single instead of double quotes. */
  singleQuote: boolean;
  /** SQL only (defaults: standard SQL, upper case keywords). */
  sqlDialect?: SqlDialect;
  keywordCase?: KeywordCase;
}

/** Languages with a Minify mode. */
export const MINIFIABLE: ReadonlySet<CodeLang> = new Set(['css', 'json', 'xml', 'html']);

export type FormatResult = { ok: true; text: string } | { ok: false; message: string; line: number | null; column: number | null };

/** First line of a parser error, with its position when the formatter gives one. */
function errorResult(e: unknown): FormatResult {
  const err = e as { message?: string; loc?: { start?: { line: number; column: number } } };
  const raw = err.message ?? String(e);
  // A formatter engine that couldn't be downloaded (offline before its first use)
  if (/dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(raw)) {
    return {
      ok: false,
      message: 'This language’s formatter couldn’t be downloaded. Each one is saved the first time it’s used online, then works offline.',
      line: null,
      column: null,
    };
  }
  const first = raw.split('\n').find((l) => l.trim()) ?? raw;
  const message = first
    .replace(/\s*\(\d+:\d+\)$/, '')
    .replace(/^\w*SyntaxError:\s*/, '')
    // Prettier's HTML errors end with a long aside and a link
    .replace(/\s*It may happen when[^.]*\./, '')
    .replace(/\s*For more info see \S+/, '');
  if (err.loc?.start) return { ok: false, message, line: err.loc.start.line, column: err.loc.start.column };
  // "line 3, column 7", "line 3 column 7", "3:7: …" and similar
  const m = /\b(?:line\s+)?(\d+)(?::|,?\s*column\s+)(\d+)\b/i.exec(raw);
  return { ok: false, message, line: m ? Number(m[1]) : null, column: m ? Number(m[2]) : null };
}

const withNewline = (s: string) => (s.endsWith('\n') ? s : s + '\n');

/** clang-format style for the options, starting from each language's usual style. */
function clangStyle(lang: CodeLang, o: FormatOptions): string {
  const base = lang === 'csharp' ? 'Microsoft' : 'Google';
  const width = o.indent === 'tab' ? 4 : o.indent;
  // Always break blocks onto their own lines, so the chosen indentation shows even in short code
  return (
    `{BasedOnStyle: ${base}, IndentWidth: ${width}, TabWidth: ${width}, UseTab: ${o.indent === 'tab' ? 'ForIndentation' : 'Never'}, ` +
    `ColumnLimit: ${o.printWidth}, AllowShortFunctionsOnASingleLine: None, AllowShortBlocksOnASingleLine: Never, ` +
    `AllowShortIfStatementsOnASingleLine: Never, AllowShortLoopsOnASingleLine: false, AllowShortCaseLabelsOnASingleLine: false}`
  );
}

const CLANG_FILE: Partial<Record<CodeLang, string>> = { c: 'main.c', cpp: 'main.cpp', java: 'Main.java', csharp: 'main.cs' };

export async function formatCode(code: string, lang: CodeLang, o: FormatOptions): Promise<FormatResult> {
  try {
    const tabs = o.indent === 'tab';
    const width: number = o.indent === 'tab' ? 4 : o.indent;
    switch (lang) {
      case 'c':
      case 'cpp':
      case 'java':
      case 'csharp': {
        // clang-format reformats whatever it's given, so catch broken Java before it does
        if (lang === 'java') {
          const bad = checkBrackets(code);
          if (bad) return bad;
        }
        const m = await wasm.clangFormat();
        return { ok: true, text: withNewline(m.format(code, CLANG_FILE[lang] as never, clangStyle(lang, o))) };
      }
      case 'go': {
        const m = await wasm.gofmt();
        const text = withNewline(m.format(code));
        // gofmt always indents with tabs; turn them into spaces when spaces were asked for
        return { ok: true, text: tabs ? text : text.replace(/^\t+/gm, (t) => ' '.repeat(t.length * width)) };
      }
      case 'json': {
        // Fully expanded, numbers kept exactly (the JSON formatter's rules), rather than Prettier's inline objects
        try {
          return { ok: true, text: stringifyJson(parseJson(code), o.indent, false) };
        } catch {
          const c = checkJson(code);
          return c.status === 'invalid' ? { ok: false, message: c.message, line: c.line, column: c.column } : { ok: false, message: 'Invalid JSON', line: null, column: null };
        }
      }
      case 'python': {
        const m = await wasm.ruff();
        try {
          return {
            ok: true,
            text: m.format(code, 'main.py', { indent_style: tabs ? 'tab' : 'space', indent_width: width, line_width: o.printWidth, quote_style: o.singleQuote ? 'single' : 'double' }),
          };
        } catch (e) {
          return byteRangeError(e, code);
        }
      }
      case 'php': {
        const m = await wasm.mago();
        return { ok: true, text: withNewline(m.format(code, 'main.php', { 'print-width': o.printWidth, 'tab-width': width, 'use-tabs': tabs })) };
      }
      case 'lua': {
        const m = await wasm.luaFmt();
        return { ok: true, text: withNewline(m.format(code, { indent_style: tabs ? 'tab' : 'space', indent_width: width, line_width: o.printWidth })) };
      }
      case 'shell': {
        const m = await wasm.shfmt();
        return { ok: true, text: withNewline(m.format(code, 'main.sh', { indent: tabs ? 0 : width })) };
      }
      case 'sql': {
        const { format } = await import('sql-formatter');
        const dialect = o.sqlDialect ?? 'sql';
        const keywordCase = o.keywordCase ?? 'upper';
        try {
          return { ok: true, text: withNewline(format(code, { language: dialect, tabWidth: width, useTabs: tabs, keywordCase, dataTypeCase: keywordCase })) };
        } catch (e) {
          return sqlError(e, dialect);
        }
      }
      case 'xml':
        return formatXml(code, tabs ? '\t' : ' '.repeat(width));
    }
    const { parser, plugins } = langInfo(lang).prettier!;
    const [prettier, ...loaded] = await Promise.all([import('prettier/standalone'), ...plugins.map((p) => PLUGINS[p]())]);
    const text = await prettier.format(code, {
      parser,
      plugins: loaded as never[],
      tabWidth: width,
      useTabs: tabs,
      printWidth: o.printWidth,
      singleQuote: o.singleQuote,
    });
    return { ok: true, text };
  } catch (e) {
    return errorResult(e);
  }
}

/** Ruff reports "… at byte range 22..23" (UTF-8 offsets); turn that into a line and column. */
export function byteRangeError(e: unknown, code: string): FormatResult {
  const r = errorResult(e);
  if (r.ok) return r;
  const m = /\s*at byte range (\d+)\.\.\d+/.exec(r.message);
  if (!m) return r;
  const prefix = new TextDecoder().decode(new TextEncoder().encode(code).slice(0, Number(m[1])));
  const line = prefix.split('\n').length;
  return { ok: false, message: r.message.replace(m[0], ''), line, column: prefix.length - prefix.lastIndexOf('\n') };
}

/** sql-formatter's parse errors, shortened, with a hint about the dialect. */
function sqlError(e: unknown, dialect: SqlDialect): FormatResult {
  const r = errorResult(e);
  if (r.ok) return r;
  let message = r.message.replace(/^Parse error:?\s*/i, '').replace(/\s*at line \d+ column \d+\.?$/i, '');
  if (/«EOF»/.test(message)) message = 'The query ends too early (an unclosed bracket or an unfinished clause?)';
  else if (/^at token:/i.test(message)) message = `Unexpected ${message.replace(/^at token:\s*/i, '')}`;
  if (dialect === 'sql') message += '. If this is valid in your database, choose its dialect.';
  return { ...r, message };
}

/**
 * Brackets, braces and parentheses in Java must pair up. Strings, character
 * literals, text blocks and comments are skipped.
 */
export function checkBrackets(code: string): FormatResult | null {
  const stack: { ch: string; pos: number }[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const lineCol = (pos: number) => {
    const before = code.slice(0, pos);
    const line = before.split('\n').length;
    return { line, column: pos - before.lastIndexOf('\n') };
  };
  const fail = (message: string, pos: number): FormatResult => ({ ok: false, message, ...lineCol(pos) });
  const n = code.length;
  for (let i = 0; i < n; i++) {
    const c = code[i]!;
    if (c === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i);
      i = nl === -1 ? n : nl;
    } else if (c === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      if (end === -1) return fail('Comment is never closed (missing */)', i);
      i = end + 1;
    } else if (code.startsWith('"""', i)) {
      const end = code.indexOf('"""', i + 3);
      if (end === -1) return fail('Text block is never closed (missing """)', i);
      i = end + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && code[j] !== c && code[j] !== '\n') j += code[j] === '\\' ? 2 : 1;
      if (code[j] !== c) return fail(c === '"' ? 'String is never closed (missing ")' : "Character literal is never closed (missing ')", i);
      i = j;
    } else if (c === '(' || c === '[' || c === '{') stack.push({ ch: c, pos: i });
    else if (c === ')' || c === ']' || c === '}') {
      const open = stack.pop();
      if (!open) return fail(`Unexpected ${c}: nothing is open here`, i);
      if (open.ch !== pairs[c]) return fail(`Unexpected ${c}: the ${open.ch} from line ${lineCol(open.pos).line} is still open`, i);
    }
  }
  const open = stack.pop();
  return open ? fail(`${open.ch} is never closed`, open.pos) : null;
}

/**
 * Minify CSS, JSON, XML or HTML. CSS and HTML are first parsed by Prettier, so
 * syntax errors are reported instead of being minified.
 */
export async function minifyCode(code: string, lang: CodeLang): Promise<FormatResult> {
  try {
    switch (lang) {
      case 'json':
        try {
          return { ok: true, text: stringifyJson(parseJson(code), 'minify', false) };
        } catch {
          const c = checkJson(code);
          return c.status === 'invalid' ? { ok: false, message: c.message, line: c.line, column: c.column } : { ok: false, message: 'Invalid JSON', line: null, column: null };
        }
      case 'xml':
        return minifyXml(code);
      case 'css':
      case 'html': {
        const check = await formatCode(code, lang, { indent: 2, printWidth: 80, singleQuote: false });
        if (!check.ok) return check;
        return { ok: true, text: lang === 'css' ? minifyCss(code) : minifyHtml(code) };
      }
      default:
        return { ok: false, message: `${langInfo(lang).label} can’t be minified here`, line: null, column: null };
    }
  } catch (e) {
    return errorResult(e);
  }
}

/** Only the start of a long file is needed to guess its language. */
const DETECT_CHARS = 20_000;

/** Guess the language from the code. */
export function detectLang(code: string): CodeLang {
  const t = code.slice(0, DETECT_CHARS).trim();
  if (!t) return 'javascript';
  if (/^<\?php\b/.test(t)) return 'php';
  if (/^#!.*\b(ba|z|da|k)?sh\b/.test(t)) return 'shell';
  if (/^<\?xml\b/.test(t) || (/^<[\w:-]+[\s>]/.test(t) && /xmlns[:=]/.test(t))) return 'xml';
  if (/^<(!doctype|html|head|body|div|p|span|a |section|main|nav|ul|table|svg|button|form|img|h[1-6]|template|script|style)\b/i.test(t)) return 'html';
  if (/^[[{]/.test(t)) {
    try {
      JSON.parse(t);
      return 'json';
    } catch {
      // Not JSON; keep looking
    }
  }
  if (/^\s*#\s*include\s*[<"]/m.test(t)) {
    return /#\s*include\s*<(iostream|vector|string|map|memory|algorithm|unordered_map|cstdio|cstdlib)>|\bstd::|\bnamespace\b|\bclass\b|\btemplate\s*<|\bcout\b/.test(t) ? 'cpp' : 'c';
  }
  if (/^\s*package\s+\w+\s*$/m.test(t) && /\bfunc\b/.test(t)) return 'go';
  if (/\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\s*\(/.test(t) && /:=|\bfmt\./.test(t)) return 'go';
  if (/^\s*using\s+System\b|\bConsole\.Write(Line)?\(|\bnamespace\s+[\w.]+\s*[{;]|\{\s*get;\s*(set;)?\s*\}/m.test(t)) return 'csharp';
  if (/^\s*import\s+java\.|\bSystem\.out\.print|\bpublic\s+static\s+void\s+main\s*\(\s*String/m.test(t)) return 'java';
  if (/\b(public|private|protected)\s+(static\s+)?(final\s+)?(class|interface|enum)\s+\w+/.test(t) && !/\bfunction\b|=>/.test(t)) return 'java';
  if (/^\s*(def\s+\w+\s*\(.*\)\s*(->\s*[\w\[\], ]+)?:|class\s+\w+(\(.*\))?:|from\s+[\w.]+\s+import\s|import\s+\w+(\s+as\s+\w+)?\s*$|if\s+__name__\s*==)/m.test(t) && !/[;{]\s*$/m.test(t)) return 'python';
  if (/^\s*local\s+\w+\s*=|^\s*(local\s+)?function\s+[\w.:]+\s*\(/m.test(t) && /\bend\b/.test(t) && !/[{};]\s*$/m.test(t)) return 'lua';
  if (/^\s*(echo|export|alias|source)\s|^\s*(if|while)\s+\[\[?\s|^\s*fi\s*$|\$\{?\w+\}?/m.test(t) && /^\s*(echo|export|fi|done|then|esac)\b/m.test(t)) return 'shell';
  if (/^\s*(select|insert\s+into|update|delete\s+from|create\s+(table|view|index)|alter\s+table|with\s+\w+\s+as|drop\s+table)\b/i.test(t)) return 'sql';
  if (/^[^{}()]*\{[^}]*:[^}]*;?[^}]*\}/.test(t) && !/\b(function|const|let|var|=>|return|import|export)\b/.test(t)) return 'css';
  if (/^\s*\$[\w-]+\s*:|@mixin|@include/m.test(t)) return 'css';
  if (/^(---\s*\n)?[\w"'-]+:\s*\S?/.test(t) && /^[\w"'-]+:(\s|$)/m.test(t) && !/[;{}]\s*$/m.test(t)) return 'yaml';
  if (/^#{1,6}\s|^\s*[-*+]\s+\S|^\s*\d+\.\s+\S/m.test(t) && !/[;{}]\s*$/m.test(t)) return 'markdown';
  if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean|any|unknown|void)\b|\bas\s+const\b|\benum\s+\w+/.test(t)) return 'typescript';
  return 'javascript';
}
