"use client";

import * as React from "react";
import { LoaderCircle, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/actions";
import { fieldErrors } from "@/lib/form";
import { forgotPasswordSchema } from "@/lib/validations";

import { Field } from "./field";

export function ForgotPasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const form = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({
      email: String(form.get("email") ?? "").trim(),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setPending(true);
    const result = await requestPasswordReset(parsed.data);
    setPending(false);

    if (result.status === "error") {
      setFormError(result.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted">
          <MailCheck className="h-5 w-5" />
        </div>
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          If that email has an account, we&apos;ve sent a recovery link. It
          expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id="forgot-email" label="Email" error={errors.email}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={pending}
          />
        )}
      </Field>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send recovery link"
        )}
      </Button>
    </form>
  );
}
