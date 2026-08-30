"use client";

import * as React from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { waitlistSchema } from "@/lib/validations";

// Contexto para qualquer CTA da página poder abrir o mesmo modal.
const WaitlistContext = React.createContext<(() => void) | null>(null);

export function useWaitlist() {
  const open = React.useContext(WaitlistContext);
  if (!open) {
    throw new Error("useWaitlist must be used inside <WaitlistProvider>");
  }
  return open;
}

export function WaitlistProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const openModal = React.useCallback(() => setOpen(true), []);

  return (
    <WaitlistContext.Provider value={openModal}>
      {children}
      <WaitlistDialog open={open} onOpenChange={setOpen} />
    </WaitlistContext.Provider>
  );
}

/** Botão que abre o modal. Usado no header e no hero. */
export function WaitlistButton({ children, ...props }: ButtonProps) {
  const open = useWaitlist();
  return (
    <Button onClick={open} {...props}>
      {children}
    </Button>
  );
}

type Status = "idle" | "loading" | "done";

function WaitlistDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  // Reset ao fechar, para o próximo abrir começar limpo.
  React.useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStatus("idle");
        setError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const parsed = waitlistSchema.safeParse({
      email: String(form.get("email") ?? "").trim(),
      project: String(form.get("project") ?? "").trim() || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {status === "done" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted">
              <Check className="h-5 w-5" />
            </div>
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-center">
                You&apos;re on the list
              </DialogTitle>
              <DialogDescription className="text-center">
                We&apos;ll email you as soon as early access opens up.
              </DialogDescription>
            </DialogHeader>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Get early access</DialogTitle>
              <DialogDescription>
                Join the waitlist. No spam — one email when we launch.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={status === "loading"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">
                  What are you building?{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="project"
                  name="project"
                  rows={3}
                  placeholder="An LLM wrapper for legal docs…"
                  disabled={status === "loading"}
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Joining…
                  </>
                ) : (
                  "Get early access"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
