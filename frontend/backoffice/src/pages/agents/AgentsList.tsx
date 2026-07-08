import React, { useCallback, useEffect, useState } from 'react';
import { Link2, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FilterSelect } from '@/components/FilterSelect';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { LoadingButton } from '@/components/LoadingButton';
import { SearchFilterField } from '@/components/SearchFilterField';
import { PageContainer, PageContentCard, FiltersContainer } from '@/components/layout';
import { ActiveBadge } from '@/components/StatusBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgents } from './hooks/useAgents';
import { fieldErrorIds } from '@/lib/fieldA11y';
import type { Agent } from '@/types/agents';

function normalizeRefFeeBranchId(refId: unknown): string {
  if (typeof refId === 'object' && refId !== null && (refId as { $oid?: string }).$oid) {
    return (refId as { $oid?: string }).$oid!;
  }
  return String(refId);
}

const AgentsList: React.FC = () => {
  const { agents, unsyncedBranches, total, loading, loadingUnsynced, fetchAgents, fetchUnsyncedBranches, syncData, deleteData } = useAgents();
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [branchError, setBranchError] = useState<string | undefined>();
  const [syncing, setSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const navigate = useNavigate();

  const refreshAgents = useCallback(() => {
    fetchAgents({ page, limit: pageSize, search: searchText });
  }, [fetchAgents, page, pageSize, searchText]);

  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  const handleOpenSyncModal = () => {
    setIsSyncModalOpen(true);
    setBranchId(undefined);
    setBranchError(undefined);
    fetchUnsyncedBranches(showInactive);
  };

  const handleSync = async () => {
    if (!branchId) {
      setBranchError('Please select a branch!');
      return;
    }
    setSyncing(true);
    try {
      const success = await syncData(branchId);
      if (success) {
        setIsSyncModalOpen(false);
        setBranchId(undefined);
        refreshAgents();
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteData(deleteTarget._id, deleteTarget.upd_date);
    setDeleteTarget(null);
    if (success) {
      refreshAgents();
    }
  };

  const columns: DataTableColumn<Agent>[] = [
    {
      key: 'branch_code',
      title: 'Branch Code',
      render: (record) => <Badge variant="outline">{record.branch_code}</Badge>,
    },
    { key: 'branch_name', title: 'Branch Name', accessor: 'branch_name' },
    {
      key: 'branch_type',
      title: 'Type',
      render: (record) => (
        <Badge variant={record.branch_type === 'MA' ? 'default' : 'secondary'}>{record.branch_type}</Badge>
      ),
    },
    {
      key: 'ref_fee_branch_id',
      title: 'Ref Fee Branch',
      render: (record) => {
        const refId = record.ref_fee_branch_id;
        if (!refId) return <span className="text-muted-foreground">—</span>;
        const normalizedRefId = normalizeRefFeeBranchId(refId);
        return record.ref_fee_branch_name ? (
          <Badge variant="outline">
            <Link2 data-icon="inline-start" />
            {record.ref_fee_branch_name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">{normalizedRefId}</span>
        );
      },
    },
    {
      key: 'default_fee_rate',
      title: 'Default Fee (%)',
      align: 'right',
      render: (record) => <strong>{record.default_fee_rate ?? 0}%</strong>,
    },
    {
      key: 'active',
      title: 'Status',
      render: (record) => <ActiveBadge active={record.active} />,
    },
    {
      key: 'action',
      title: 'Action',
      render: (record) => (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Manage fees for ${record.branch_name}`}
                  onClick={() => navigate(`/agents/${record._id}/fees`)}
                >
                  <Settings aria-hidden="true" />
                </Button>
              }
            />
            <TooltipContent>Manage fees</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label={`Delete ${record.branch_name}`}
                  onClick={() => setDeleteTarget(record)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              }
            />
            <TooltipContent>Delete agent</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ];

  const branchOptions = unsyncedBranches.map((b) => ({
    value: b.branch_id,
    label: `${b.branch_code} - ${b.branch_name}${b.active === false ? ' [Inactive]' : ''}`,
  }));

  return (
    <PageContainer
      title="Agents"
      description="View and configure agent branches, fee overrides, and reference fees."
      extra={
        <Button onClick={handleOpenSyncModal}>
          <RefreshCw data-icon="inline-start" />
          Sync Branch
        </Button>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <SearchFilterField
            id="agent-search"
            label="Search"
            placeholder="Search by branch code or name..."
            value={searchText}
            onChange={(val) => {
              setSearchText(val);
              setPage(1);
            }}
          />
        </FiltersContainer>

        <DataTable
          columns={columns}
          data={agents}
          loading={loading}
          rowKey="_id"
          pagination={{
            page,
            pageSize,
            total,
            pageSizeOptions: [10, 20, 50],
            onChange: (nextPage, nextSize) => {
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
        />
      </PageContentCard>

      <Dialog open={isSyncModalOpen} onOpenChange={(open) => !open && setIsSyncModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Agent Branch</DialogTitle>
            <DialogDescription>Select a branch to sync as an agent record.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={!!branchError}>
              <FieldLabel htmlFor="sync-branch">Branch</FieldLabel>
              <FilterSelect
                id="sync-branch"
                placeholder={loadingUnsynced ? 'Loading branches…' : 'Select a branch to sync'}
                value={branchId}
                disabled={loadingUnsynced}
                onChange={(val) => {
                  setBranchId(val);
                  if (branchError) setBranchError(undefined);
                }}
                options={branchOptions}
                width="w-full"
                aria-invalid={!!branchError}
                aria-describedby={branchError ? fieldErrorIds('sync-branch').describedBy : undefined}
              />
              {branchError ? (
                <FieldDescription
                  id={fieldErrorIds('sync-branch').errorId}
                  className="text-destructive"
                  role="alert"
                >
                  {branchError}
                </FieldDescription>
              ) : null}
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setShowInactive(next);
                  fetchUnsyncedBranches(next);
                }}
              />
              <FieldLabel htmlFor="show-inactive">Show Inactive branches</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncModalOpen(false)}>
              Cancel
            </Button>
            <LoadingButton onClick={() => void handleSync()} loading={syncing}>
              Sync
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.branch_name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};

export default AgentsList;
