import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/demo/data-table';
import { FilterSelectField } from '@/components/demo/filter-select-field';
import { SearchFilterField } from '@/components/demo/search-filter-field';
import { StatusBadge } from '@/components/demo/status-badge';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockAgents } from '../mockData';
import { getAgentStatusVariant } from '../helpers';
import { useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const AgentsListView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedAgentId } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const filteredData = useMemo(() => {
    return mockAgents.filter((row) => {
      const q = search.toLowerCase();
      if (q) {
        const haystack = `${row.agent_code} ${row.agent_name} ${row.contact_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (status && row.status !== status) return false;
      return true;
    });
  }, [search, status]);

  const resetFilters = () => {
    setSearch('');
    setStatus(undefined);
  };

  const columns = [
    { key: 'agent_code', title: 'Agent Code', accessor: 'agent_code' as const },
    { key: 'agent_name', title: 'Agent Name', accessor: 'agent_name' as const },
    { key: 'contact_name', title: 'Contact Name', accessor: 'contact_name' as const },
    { key: 'email', title: 'Email', accessor: 'email' as const },
    { key: 'tel', title: 'Telephone', accessor: 'tel' as const },
    { key: 'branch_count', title: 'Branches', align: 'right' as const, accessor: 'branch_count' as const },
    {
      key: 'commission_rate',
      title: 'Commission %',
      align: 'right' as const,
      render: (row: (typeof mockAgents)[number]) => `${row.commission_rate.toFixed(1)}%`,
    },
    {
      key: 'status',
      title: 'Status',
      render: (row: (typeof mockAgents)[number]) => (
        <StatusBadge status={row.status} variant={getAgentStatusVariant(row.status)} />
      ),
    },
    {
      key: 'action',
      title: 'Action',
      render: (row: (typeof mockAgents)[number]) => (
        <Button
          variant="link"
          className="h-auto px-0"
          onClick={() => {
            setSelectedAgentId(row.id);
            openDetail({ setDemoMode, setDetailReturnMode }, 'agent-detail', 'agents');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Agents List"
      description="Manage partner agent organizations, commission rates, and branch assignments."
      extra={
        <Button>
          <Users data-icon="inline-start" />
          Add Agent
        </Button>
      }
    >
      <PageContentCard>
        <FiltersContainer>
          <SearchFilterField
            id="agent-search"
            label="Search"
            placeholder="Agent name or code..."
            value={search}
            onChange={setSearch}
          />
          <FilterSelectField
            id="agent-status"
            label="Status"
            placeholder="Filter by Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'SUSPENDED', label: 'SUSPENDED' },
              { value: 'INACTIVE', label: 'INACTIVE' },
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

export default AgentsListView;
