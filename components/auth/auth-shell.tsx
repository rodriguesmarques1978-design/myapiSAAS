import * as React from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  /** Linha de baixo, com o link para o outro fluxo. */
  footer?: React.ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 p-6">
        {children}
      </div>

      {footer ? (
        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      ) : null}
    </div>
  );
}
