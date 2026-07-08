"use client";

import type { ReactNode } from "react";

import { AppProviders } from "@/components/app-providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <AppProviders>
        {children}
        <Toaster richColors closeButton />
      </AppProviders>
    </TooltipProvider>
  );
}
