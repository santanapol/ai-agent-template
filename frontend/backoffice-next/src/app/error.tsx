"use client";

import { useEffect } from "react";

import Error500 from "@/views/Error500";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Route error:", error);
    }
  }, [error]);

  return <Error500 />;
}
