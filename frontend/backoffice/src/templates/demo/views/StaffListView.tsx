import { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActiveBadge } from '@/components/demo/status-badge';
import { DataTable } from '@/components/demo/data-table';
import { FilterSelectField } from '@/components/demo/filter-select-field';
import { SearchFilterField } from '@/components/demo/search-filter-field';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockStaff, ROLE_LABELS, ROLE_OPTIONS } from '../mockData';
import { useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const StaffListView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedStaffId } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    return mockStaff.filter((row) => {
      const q = search.toLowerCase();
      if (q) {
        const haystack = `${row.code} ${row.firstname} ${row.lastname} ${row.username}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (role && row.role !== role) return false;
      if (activeFilter === 'active' && !row.active) return false;
      if (activeFilter === 'inactive' && row.active) return false;
      return true;
    });
  }, [search, role, activeFilter]);

  const resetFilters = () => {
    setSearch('');
    setRole(undefined);
    setActiveFilter(undefined);
  };

  const columns = [
    { key: 'code', title: 'Staff Code', accessor: 'code' as const },
    { key: 'firstname', title: 'First Name', accessor: 'firstname' as const },
    { key: 'lastname', title: 'Last Name', accessor: 'lastname' as const },
    { key: 'email', title: 'Email', accessor: 'email' as const },
    { key: 'tel', title: 'Telephone', accessor: 'tel' as const },
    { key: 'username', title: 'Username', accessor: 'username' as const },
    {
      key: 'active',
      title: 'Status',
      render: (row: (typeof mockStaff)[number]) => <ActiveBadge active={row.active} />,
    },
    {
      key: 'role',
      title: 'System Role',
      render: (row: (typeof mockStaff)[number]) => ROLE_LABELS[row.role] ?? row.role,
    },
    {
      key: 'action',
      title: 'Action',
      render: (row: (typeof mockStaff)[number]) => (
        <Button
          variant="link"
          className="h-auto px-0"
          onClick={() => {
            setSelectedStaffId(row.id);
            openDetail({ setDemoMode, setDetailReturnMode }, 'staff-detail', 'staff');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Staff Management"
      description="Manage system staff profiles. Search by name or code, filter by role or status."
      extra={
        <Button>
          <UserPlus data-icon="inline-start" />
          Add Staff
        </Button>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <SearchFilterField
            id="staff-search"
            label="Search"
            placeholder="Name or staff code..."
            value={search}
            onChange={setSearch}
          />
          <FilterSelectField
            id="staff-role"
            label="Role"
            placeholder="Filter by Role"
            value={role}
            onChange={setRole}
            options={ROLE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <FilterSelectField
            id="staff-status"
            label="Status"
            placeholder="Filter by Status"
            value={activeFilter}
            onChange={setActiveFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            width="w-[160px]"
          />
        </FiltersContainer>
        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          rowKey="id"
          emptyAction={{ label: 'Clear filters', onClick: resetFilters }}
        />
      </PageContentCard>
    </PageContainer>
  );
};

export default StaffListView;
