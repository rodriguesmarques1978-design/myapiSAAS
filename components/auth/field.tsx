import * as React from "react";

import { Label } from "@/components/ui/label";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  /** Recebe os ids de acessibilidade para pôr no input. */
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
};

/**
 * Label + input + mensagem de erro, com o aria já ligado.
 *
 * Existe para os três formulários de auth não divergirem no markup de erro,
 * que é a parte que se esquece de manter acessível.
 */
export function Field({ id, label, error, children }: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : undefined,
      })}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
