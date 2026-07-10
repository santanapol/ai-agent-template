import type React from "react";
import { useEffect, useState } from "react";

import { Archive, LayoutDashboard, Users } from "lucide-react";

import { ListPageCard } from "@/components/layout";
import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { apiErrorMessage } from "@/lib/apiError";
import { getDashboardShortcuts } from "@/lib/dashboardShortcuts";
import * as staffApi from "@/lib/staffApiClient";
import { cn } from "@/lib/utils";
import { Link } from "@/navigation/compat";

const Dashboard: React.FC = () => {
  const { message } = useAppFeedback();
  const { user, permissions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  const isAdmin = user?.role === "platform_admin" || user?.role === "branch_admin";
  const shortcuts = getDashboardShortcuts(user?.role, permissions ?? []);

  useEffect(() => {
    let cancelled = false;
    const admin = user?.role === "platform_admin" || user?.role === "branch_admin";

    const load = async () => {
      setLoading(true);
      if (!admin) {
        setLoading(false);
        return;
      }
      try {
        const [activeRes, archivedRes] = await Promise.all([
          staffApi.getProfileCounts({ status: "active" }),
          staffApi.getProfileCounts({ status: "archived" }),
        ]);
        if (cancelled) return;
        setActiveCount(activeRes?.total ?? 0);
        setArchivedCount(archivedRes?.total ?? 0);
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, "Failed to load dashboard stats"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.role, message]);

  return (
    <ListPageCard title="Dashboard" description="Jump to common admin tasks for your role.">
      <div className="flex flex-col gap-6 px-4 pb-4">
        {isAdmin ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {loading ? (
              <>
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-muted-foreground text-sm">Total Active Staff</p>
                    <Users className="text-primary" aria-hidden="true" />
                  </div>
                  <p className="font-bold text-2xl tabular-nums">{activeCount}</p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-muted-foreground text-sm">Archived Profiles</p>
                    <Archive className="text-warning" aria-hidden="true" />
                  </div>
                  <p className="font-bold text-2xl tabular-nums">{archivedCount}</p>
                </div>
              </>
            )}
          </div>
        ) : null}

        {shortcuts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {shortcuts.map((shortcut) => (
              <Link key={shortcut.href} to={shortcut.href} className={cn(buttonVariants({ variant: "outline" }))}>
                {shortcut.label}
              </Link>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutDashboard aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No shortcuts available</EmptyTitle>
              <EmptyDescription>Your role does not include dashboard shortcuts yet.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link to="/profile" className={cn(buttonVariants({ variant: "outline" }))}>
                Open my profile
              </Link>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </ListPageCard>
  );
};

export default Dashboard;
