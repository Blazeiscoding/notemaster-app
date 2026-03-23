export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          NoteMaster can still open cached content and store local changes. Reconnect to sync
          authenticated notes.
        </p>
      </div>
    </main>
  );
}
