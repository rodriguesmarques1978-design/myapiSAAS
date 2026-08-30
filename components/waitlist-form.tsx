"use client";

import * as React from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STACKS, waitlistSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "done";

type WaitlistFormProps = {
  /** Prefixo dos ids — o formulário aparece duas vezes na página. */
  idPrefix: string;
  ctaLabel?: string;
  className?: string;
};

export function WaitlistForm({
  idPrefix,
  ctaLabel = "Get early access",
  className,
}: WaitlistFormProps) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const parsed = waitlistSchema.safeParse({
      email: String(form.get("email") ?? "").trim(),
      project: String(form.get("project") ?? "").trim() || undefined,
      stack: String(form.get("stack") ?? "") || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setStatus("idle");
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("done");
      toast.success("You're on the list", {
        description: "We'll email you when your gateway is ready.",
      });
    } catch {
      setStatus("idle");
      setError("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-6 py-10 text-center",
          className,
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted">
          <Check className="h-5 w-5" />
        </div>
        <p className="font-medium">You&apos;re on the list</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          We&apos;ll email you as soon as early access opens up — and again
          before we lock in pricing, so you get a say.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)} noValidate>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          disabled={status === "loading"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-project`}>
          What are you building?{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${idPrefix}-project`}
          name="project"
          rows={3}
          placeholder="An LLM wrapper for legal docs…"
          disabled={status === "loading"}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-stack`}>
          Your stack <span className="text-muted-foreground">(optional)</span>
        </Label>
        {/* Select nativo: evita mais uma dependência do Radix só para isto. */}
        <select
          id={`${idPrefix}-stack`}
          name="stack"
          defaultValue=""
          disabled={status === "loading"}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select one…</option>
          {STACKS.map((stack) => (
            <option key={stack} value={stack}>
              {stack}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Joining…
          </>
        ) : (
          ctaLabel
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        No spam. One email when we launch.
      </p>
    </form>
  );
}
