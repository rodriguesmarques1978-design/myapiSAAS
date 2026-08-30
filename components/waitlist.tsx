"use client";

import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WaitlistForm } from "@/components/waitlist-form";

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

/** Botão que abre o modal. Usado no header, hero e pricing. */
export function WaitlistButton({ children, ...props }: ButtonProps) {
  const open = useWaitlist();
  return (
    <Button onClick={open} {...props}>
      {children}
    </Button>
  );
}

function WaitlistDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Remontar o formulário a cada abertura para começar sempre limpo.
  const [instance, setInstance] = React.useState(0);

  React.useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setInstance((n) => n + 1), 200);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get early access</DialogTitle>
          <DialogDescription>
            Join the waitlist and help shape the product before launch.
          </DialogDescription>
        </DialogHeader>

        <WaitlistForm key={instance} idPrefix="dialog" />
      </DialogContent>
    </Dialog>
  );
}
