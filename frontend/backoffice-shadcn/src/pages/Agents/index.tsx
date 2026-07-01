import React, { useEffect, useState } from 'react';
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FilterSelect } from '@/components/filter-select';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { LoadingButton } from '@/components/loading-button';
import { SearchFilterField } from '@/components/search-filter-field';
import { PageContainer, PageContentCard, FiltersContainer } from '@/components/layout';
import { ActiveBadge } from '@/components/status-badge';
import { useAgents } from './hooks/useAgents';
import type { Agent } from '@/types/agents';

const AgentsList: React.FC = () => {
  const { agents, unsyncedBranches, total, loading, loadingUnsynced, fetchAgents, fetchUnsyncedBranches, syncData, deleteData } = useAgents();
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [branchError, setBranchError] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents({ page, limit: pageSize, search: searchText });
  }, [fetchAgents, page, pageSize, searchText]);

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
    const success = await syncData(branchId);
    if (success) {
      setIsSyncModalOpen(false);
      setBranchId(undefined);
      fetchAgents({ page, limit: pageSize, search: searchText });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteData(deleteTarget._id, deleteTarget.upd_date);
    setDeleteTarget(null);
    if (success) {
      fetchAgents({ page, limit: pageSize, search: searchText });
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
        const normalizedRefId =
          typeof refId === 'object' && refId !== null && (refId as { $oid?: string }).$oid
            ? (refId as { $oid?: string }).$oid
            : String(refId);
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
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => navigate(`/agents/${record._id}/fees`)}>
            <Settings data-icon="inline-start" />
            Manage
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(record)}>
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
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
      title="Agent Fee Management"
      description="View and configure specific game fee overrides or reference fees across agent branches."
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
                onChange={(val) => {
                  setBranchId(val);
                  if (branchError) setBranchError(undefined);
                }}
                options={branchOptions}
                width="w-full"
              />
              {branchError ? <p className="text-sm text-destructive">{branchError}</p> : null}
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
            <LoadingButton onClick={() => void handleSync()} loading={loading}>
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
