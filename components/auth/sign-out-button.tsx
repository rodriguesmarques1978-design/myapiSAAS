"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut();
      }}
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Signing out…
        </>
      ) : (
        "Sign out"
      )}
    </Button>
  );
}
