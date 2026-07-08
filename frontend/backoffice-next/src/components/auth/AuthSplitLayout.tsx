import type { ReactNode } from "react";

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div>
          <p className="font-semibold text-lg">Zero Platform</p>
          <p className="mt-2 max-w-md text-primary-foreground/80 text-sm">
            Operations console for staff, billing, agents, and branch reporting — built for secure multi-branch
            administration.
          </p>
        </div>
        <p className="text-primary-foreground/70 text-xs">Authorized personnel only. Activity may be monitored.</p>
      </div>
      <div className="flex flex-col items-center justify-center p-6 md:p-10">{children}</div>
    </div>
  );
}
