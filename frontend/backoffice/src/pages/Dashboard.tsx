import React, { useEffect, useState } from 'react';
import { Archive, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, PageContentCard } from '@/components/layout';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { usePermission } from '@/hooks/usePermission';
import { apiErrorMessage } from '@/lib/apiError';
import * as staffApi from '@/lib/staffApiClient';

const Dashboard: React.FC = () => {
  const { message } = useAppFeedback();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageStaff = usePermission('profiles:list');
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  const isAdmin = user?.role === 'platform_admin' || user?.role === 'branch_admin';

  useEffect(() => {
    let cancelled = false;
    const isAdmin = user?.role === 'platform_admin' || user?.role === 'branch_admin';

    const load = async () => {
      setLoading(true);
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      try {
        const [activeRes, archivedRes] = await Promise.all([
          staffApi.listProfiles({ status: 'active', page: 1, limit: 1 }),
          staffApi.listProfiles({ status: 'archived', page: 1, limit: 1 }),
        ]);
        if (cancelled) return;
        setActiveCount(activeRes.pagination?.total ?? 0);
        setArchivedCount(archivedRes.pagination?.total ?? 0);
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, 'Failed to load dashboard stats'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  return (
    <PageContainer
      title="Dashboard"
      description="Welcome to Zero Platform Admin. Here is an overview of your system."
    >
      {isAdmin && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <StatCard title="Total Active Staff" value={activeCount} icon={Users} />
              <StatCard
                title="New Profiles (This Week)"
                value="—"
                suffix="no new profiles this week"
                icon={UserPlus}
                iconTone="success"
              />
              <StatCard title="Archived Profiles" value={archivedCount} icon={Archive} iconTone="warning" />
            </>
          )}
        </div>
      )}

      <PageContentCard className="mt-6 border-dashed">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>More dashboard widgets coming soon</EmptyTitle>
            <EmptyDescription>
              {canManageStaff
                ? 'Select Staff Management from the sidebar to manage profiles.'
                : 'Additional insights and shortcuts will appear here in a future release.'}
            </EmptyDescription>
          </EmptyHeader>
          {canManageStaff ? (
            <EmptyContent>
              <Button variant="outline" onClick={() => navigate('/staff')}>
                Open Staff Management
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      </PageContentCard>
    </PageContainer>
  );
};

export default Dashboard;
