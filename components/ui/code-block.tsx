"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { highlight, type CodeLang } from "@/lib/highlight";
import { cn } from "@/lib/utils";

type CodeBlockProps = {
  code: string;
  lang: CodeLang;
  /** Label da barra de topo (ex.: nome do ficheiro ou "Terminal"). */
  filename?: string;
  className?: string;
};

export function CodeBlock({ code, lang, filename, className }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  // Volta ao ícone normal passados 2s.
  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard bloqueado (http, permissões) — não vale a pena avisar.
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-muted/30",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          {filename ?? lang}
        </span>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy code"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono">{highlight(code, lang)}</code>
      </pre>
    </div>
  );
}
