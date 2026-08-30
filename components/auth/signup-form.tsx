"use client";

import * as React from "react";
import { LoaderCircle, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth/actions";
import { fieldErrors } from "@/lib/form";
import { signupSchema } from "@/lib/validations";

import { Field } from "./field";

export function SignupForm() {
  const [pending, setPending] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setErrors({});

    const form = new FormData(event.currentTarget);
    const parsed = signupSchema.safeParse({
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setPending(true);
    const result = await signUp(parsed.data);
    setPending(false);

    // Com confirmação de email ligada não vem sessão, portanto não há redirect
    // e mostramos o ecrã de confirmação em vez do dashboard.
    if (result?.status === "check-email") {
      setConfirmEmail(true);
      return;
    }

    if (result?.status === "error") {
      setFormError(result.message);
    }
  }

  if (confirmEmail) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted">
          <MailCheck className="h-5 w-5" />
        </div>
        <p className="font-medium">Confirm your email</p>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent you a link. Click it and we&apos;ll finish setting up
          your workspace.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field id="signup-name" label="Name" error={errors.name}>
        {(props) => (
          <Input
            {...props}
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Ada Lovelace"
            disabled={pending}
          />
        )}
      </Field>

      <Field id="signup-email" label="Email" error={errors.email}>
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

      <Field id="signup-password" label="Password" error={errors.password}>
        {(props) => (
          <Input
            {...props}
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
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
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
