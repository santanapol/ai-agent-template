import React, { useMemo } from 'react';
import { Archive, Eye, Pencil, RotateCcw } from 'lucide-react';
import { DataTable, type DataTableColumn, type ServerPaginationConfig } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { StaffProfile } from '@/types/staff';

export interface StaffTablePagination {
  current: number;
  pageSize: number;
  total: number;
}

interface StaffTableProps {
  profiles: StaffProfile[];
  loading: boolean;
  pagination: StaffTablePagination;
  onView: (record: StaffProfile) => void;
  onEdit?: (record: StaffProfile) => void;
  onArchive: (record: StaffProfile) => void;
  onRestore: (record: StaffProfile) => void;
  onTableChange: (page: number, pageSize: number) => void;
}

const StaffTable: React.FC<StaffTableProps> = ({
  profiles,
  loading,
  pagination,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onTableChange,
}) => {
  const columns = useMemo<DataTableColumn<StaffProfile>[]>(
    () => [
      { key: 'code', title: 'Code', accessor: 'code' },
      {
        key: 'name',
        title: 'Name',
        render: (record) => (
          <span className="font-medium">
            {record.firstname} {record.lastname}
          </span>
        ),
      },
      {
        key: 'username',
        title: 'Username',
        render: (record) => (
          <span className="text-muted-foreground">{record.user?.username ?? '—'}</span>
        ),
      },
      { key: 'email', title: 'Email', accessor: 'email' },
      { key: 'tel', title: 'Tel', accessor: 'tel' },
      {
        key: 'status',
        title: 'Status',
        render: (record) => (
          <StatusBadge
            status={record.status}
            variant={record.status === 'active' ? 'success' : 'secondary'}
          />
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (record) => (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="icon-sm" aria-label="View profile" onClick={() => onView(record)}>
                    <Eye />
                  </Button>
                }
              />
              <TooltipContent>View profile</TooltipContent>
            </Tooltip>
            {onEdit ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button variant="outline" size="icon-sm" aria-label="Edit profile" onClick={() => onEdit(record)}>
                      <Pencil />
                    </Button>
                  }
                />
                <TooltipContent>Edit profile</TooltipContent>
              </Tooltip>
            ) : null}
            {record.status === 'active' ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="text-destructive"
                      aria-label="Archive profile"
                      onClick={() => onArchive(record)}
                    >
                      <Archive />
                    </Button>
                  }
                />
                <TooltipContent>Archive profile</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="text-success"
                      aria-label="Restore profile"
                      onClick={() => onRestore(record)}
                    >
                      <RotateCcw />
                    </Button>
                  }
                />
                <TooltipContent>Restore profile</TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      },
    ],
    [onView, onEdit, onArchive, onRestore],
  );

  const serverPagination: ServerPaginationConfig = {
    page: pagination.current,
    pageSize: pagination.pageSize,
    total: pagination.total,
    pageSizeOptions: [10, 20, 50],
    onChange: onTableChange,
  };

  return (
    <DataTable
      columns={columns}
      data={profiles}
      loading={loading}
      rowKey="id"
      pagination={serverPagination}
    />
  );
};

export default StaffTable;
