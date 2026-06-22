import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <main className="flex h-dvh w-full items-center justify-center bg-base px-6 text-copy-primary">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-surface-border bg-surface text-copy-secondary">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="mt-3 text-sm leading-6 text-copy-muted">
          This project does not exist, or you do not have access to open it.
        </p>
        <Button asChild className="mt-6">
          <Link href="/editor">Back to editor</Link>
        </Button>
      </div>
    </main>
  );
}
