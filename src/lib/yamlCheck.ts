/**
 * YAML validation with the `yaml` package: syntax errors with their line and
 * column, duplicate keys as warnings, multi-document files, and the parsed
 * result as JSON.
 */
import { isScalar, parseAllDocuments, visit, type Document } from 'yaml';

export type YamlVersion = '1.2' | '1.1';

export interface YamlIssue {
  message: string;
  line: number | null;
  column: number | null;
  /** 1-based document number in a multi-document file. */
  doc: number;
}

export type YamlResult =
  | { status: 'empty' }
  | {
      status: 'valid';
      documents: number;
      json: string;
      warnings: YamlIssue[];
    }
  | { status: 'invalid'; errors: YamlIssue[]; warnings: YamlIssue[]; documents: number };

/** Plain words that YAML 1.1 reads as booleans but YAML 1.2 keeps as strings. */
const YAML11_BOOLS = /^(?:y|Y|yes|Yes|YES|n|N|no|No|NO|on|On|ON|off|Off|OFF)$/;

/** The first line of a yaml error message, without the "at line X, column Y:" part (shown separately). */
function cleanMessage(msg: string): string {
  const first = msg.split('\n')[0] ?? msg;
  return first.replace(/ at line \d+, column \d+:?$/, '').replace(/:$/, '');
}

function toIssue(e: { message: string; linePos?: [{ line: number; col: number }, ...unknown[]] }, doc: number): YamlIssue {
  const pos = e.linePos?.[0];
  return { message: cleanMessage(e.message), line: pos?.line ?? null, column: pos?.col ?? null, doc };
}

/** Line and column (1-based) of a character offset. */
function position(lineStarts: number[], offset: number): { line: number; column: number } {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid]! <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - lineStarts[lo]! + 1 };
}

export function checkYaml(text: string, version: YamlVersion = '1.2'): YamlResult {
  if (!text.trim()) return { status: 'empty' };
  let docs: Document.Parsed[];
  try {
    docs = parseAllDocuments(text, { prettyErrors: true, uniqueKeys: true, version }) as Document.Parsed[];
  } catch (e) {
    return { status: 'invalid', errors: [{ message: e instanceof Error ? e.message : String(e), line: null, column: null, doc: 1 }], warnings: [], documents: 0 };
  }
  if (!Array.isArray(docs)) docs = [];

  const errors: YamlIssue[] = [];
  const warnings: YamlIssue[] = [];
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) lineStarts.push(i + 1);

  docs.forEach((doc, i) => {
    for (const e of doc.errors) {
      const issue = toIssue(e as never, i + 1);
      if (e.code === 'DUPLICATE_KEY') warnings.push({ ...issue, message: `${issue.message}: a key appears twice in one mapping` });
      else errors.push(issue);
    }
    for (const w of doc.warnings) warnings.push(toIssue(w as never, i + 1));
    if (version === '1.2') {
      visit(doc, {
        Scalar(_key, node) {
          if (isScalar(node) && node.type === 'PLAIN' && typeof node.value === 'string' && YAML11_BOOLS.test(node.value) && node.range) {
            const p = position(lineStarts, node.range[0]);
            warnings.push({
              message: `${node.value} is the string "${node.value}" in YAML 1.2 but a boolean in YAML 1.1; quote it if it’s meant to be text`,
              line: p.line,
              column: p.column,
              doc: i + 1,
            });
          }
        },
      });
    }
  });

  if (errors.length) return { status: 'invalid', errors, warnings, documents: docs.length };

  if (docs.length === 0) return { status: 'valid', documents: 0, json: '', warnings };
  let nonFinite = 0;
  const replacer = (_k: string, v: unknown) => {
    if (typeof v === 'number' && !Number.isFinite(v)) {
      nonFinite++;
      return null;
    }
    if (typeof v === 'bigint') return v.toString();
    return v;
  };
  let json: string;
  try {
    const values = docs.map((d) => d.toJS() ?? null);
    json = JSON.stringify(docs.length === 1 ? values[0] : values, replacer, 2) ?? 'null';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const message = /circular/i.test(msg)
      ? 'An alias refers to a node that contains it, so the result can’t be shown as JSON'
      : msg;
    return { status: 'invalid', errors: [{ message, line: null, column: null, doc: 1 }], warnings, documents: docs.length };
  }
  if (nonFinite) warnings.push({ message: `${nonFinite} value${nonFinite === 1 ? '' : 's'} like .inf or .nan shown as null: JSON has no infinity or NaN`, line: null, column: null, doc: 1 });
  return { status: 'valid', documents: docs.length, json: json + '\n', warnings };
}
