import * as React from "react";

export type CodeLang = "bash" | "ts" | "json";

/**
 * Highlighter minimalista, sem dependências.
 *
 * Cada regra é uma alternativa de uma regex única. A ordem importa: a primeira
 * que casar ganha, por isso comentários e strings vêm antes de tudo o resto.
 * As regras só podem usar grupos non-capturing — o índice do grupo é o que
 * mapeia o match de volta à classe CSS.
 */
type Rule = { className: string; source: string };

const COMMENT = "text-muted-foreground/60";
const STRING = "text-emerald-600 dark:text-emerald-400";
const KEYWORD = "text-violet-600 dark:text-violet-400";
const NUMBER = "text-amber-600 dark:text-amber-400";
const PROPERTY = "text-sky-600 dark:text-sky-400";

const RULES: Record<CodeLang, Rule[]> = {
  bash: [
    { className: COMMENT, source: "#[^\\n]*" },
    { className: STRING, source: "\"(?:[^\"\\\\]|\\\\.)*\"|'[^'\\n]*'" },
    {
      className: KEYWORD,
      source: "\\b(?:curl|npx|npm|export|echo|cd)\\b",
    },
    { className: PROPERTY, source: "--?[A-Za-z][\\w-]*" },
  ],
  ts: [
    { className: COMMENT, source: "//[^\\n]*" },
    {
      className: STRING,
      source: "\"(?:[^\"\\\\]|\\\\.)*\"|'[^'\\n]*'|`(?:[^`\\\\]|\\\\.)*`",
    },
    {
      className: KEYWORD,
      source:
        "\\b(?:const|let|var|await|async|function|return|import|from|export|new|type|interface)\\b",
    },
    { className: NUMBER, source: "\\b\\d+(?:\\.\\d+)?\\b" },
  ],
  json: [
    { className: PROPERTY, source: '"(?:[^"\\\\]|\\\\.)*"(?=\\s*:)' },
    { className: STRING, source: '"(?:[^"\\\\]|\\\\.)*"' },
    { className: KEYWORD, source: "\\b(?:true|false|null)\\b" },
    { className: NUMBER, source: "-?\\b\\d+(?:\\.\\d+)?\\b" },
  ],
};

export function highlight(code: string, lang: CodeLang): React.ReactNode[] {
  const rules = RULES[lang];
  const pattern = new RegExp(rules.map((r) => `(${r.source})`).join("|"), "g");

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    // Descobrir qual das alternativas casou para saber a cor.
    const group = match.findIndex(
      (value, index) => index > 0 && value !== undefined,
    );
    if (group < 1) continue;

    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }
    nodes.push(
      <span key={key++} className={rules[group - 1].className}>
        {match[0]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  nodes.push(code.slice(lastIndex));
  return nodes;
}
