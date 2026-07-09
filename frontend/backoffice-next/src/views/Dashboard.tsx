import type React from "react";
import { useEffect, useState } from "react";

import { Archive, Users } from "lucide-react";

import { ListPageCard } from "@/components/layout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAppFeedback } from "@/hooks/useAppFeedback";
import { apiErrorMessage } from "@/lib/apiError";
import { getDashboardShortcuts } from "@/lib/dashboardShortcuts";
import * as staffApi from "@/lib/staffApiClient";
import { useNavigate } from "@/navigation/compat";

const Dashboard: React.FC = () => {
  const { message } = useAppFeedback();
  const navigate = useNavigate();
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
    <ListPageCard title="Dashboard" description="Welcome to Zero Platform Admin. Here is an overview of your system.">
      <div className="flex flex-col gap-6 px-4 pb-4">
        {isAdmin ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </>
            ) : (
              <>
                <StatCard title="Total Active Staff" value={activeCount} icon={Users} />
                <StatCard title="Archived Profiles" value={archivedCount} icon={Archive} iconTone="warning" />
              </>
            )}
          </div>
        ) : null}

        {shortcuts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {shortcuts.map((shortcut) => (
              <Button key={shortcut.href} variant="outline" onClick={() => navigate(shortcut.href)}>
                {shortcut.label}
              </Button>
            ))}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>More dashboard widgets coming soon</EmptyTitle>
              <EmptyDescription>
                Additional insights and shortcuts will appear here in a future release.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </ListPageCard>
  );
};

export default Dashboard;
