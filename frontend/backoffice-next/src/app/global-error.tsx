"use client";

import { useEffect } from "react";

import Error500 from "@/views/Error500";

function isChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /ChunkLoadError|Loading chunk [\d]+ failed|failed to fetch dynamically imported module/i.test(error.message);
}

export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("App error:", error);
    }
  }, [error]);

  if (isChunkError(error)) {
    return (
      <html lang="en">
        <body>
          <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
            <h1 className="font-semibold text-xl">Application update required</h1>
            <p className="text-muted-foreground text-sm">
              This page failed to load. Reload to fetch the latest assets.
            </p>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <Error500 />
      </body>
    </html>
  );
}
