"use client";

import { Spinner } from "@/components/ui/spinner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfirmDialogProvider } from "@/hooks/useConfirmDialog";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesStoreProvider>
      <ThemeProvider>
        <AuthProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </AuthProvider>
      </ThemeProvider>
    </PreferencesStoreProvider>
  );
}

export function AuthLoadingGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
