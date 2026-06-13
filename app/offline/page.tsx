import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-lg border border-border bg-card/80 p-6 text-center shadow-sm backdrop-blur">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <WifiOff className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">You&apos;re offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          NoteMaster can still open cached content and store local changes. Reconnect to sync
          authenticated notes.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to notes</Link>
        </Button>
      </section>
    </main>
  );
}
