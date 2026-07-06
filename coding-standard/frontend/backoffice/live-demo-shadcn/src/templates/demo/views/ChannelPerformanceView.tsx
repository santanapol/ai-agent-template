import { useMemo, useState } from 'react';
import { Download, TrendingUp, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/demo/data-table';
import { DateFilterField } from '@/components/demo/date-filter-field';
import { FilterSelectField } from '@/components/demo/filter-select-field';
import { SearchFilterField } from '@/components/demo/search-filter-field';
import { StatCard } from '@/components/demo/stat-card';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { mockChannelPerformance, mockCampaignDailyStats } from '../mockData';
import { formatCurrency, formatNumber, statisticNumberFormatter, statisticRateFormatter } from '../helpers';
import { useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const CHANNEL_MAP: Record<string, string> = {
  facebook: 'Facebook Ads',
  google: 'Google Ads',
  line: 'LINE OA',
  email: 'Email',
};

const campaignMatchesDateRange = (campaignId: number, start: string, end: string) => {
  const stats = mockCampaignDailyStats.filter((s) => s.campaign_id === campaignId);
  if (stats.length === 0) return true;
  return stats.some((s) => s.date >= start && s.date <= end);
};

const ChannelPerformanceView: React.FC<DemoViewProps> = (props) => {
  const { setDemoMode, setDetailReturnMode, setSelectedCampaignId } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<string | undefined>();
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const filteredData = useMemo(() => {
    return mockChannelPerformance.filter((row) => {
      if (search && !row.campaign_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (channel && row.channel !== CHANNEL_MAP[channel]) return false;
      if (dateStart && dateEnd && !campaignMatchesDateRange(row.id, dateStart, dateEnd)) return false;
      return true;
    });
  }, [search, channel, dateStart, dateEnd]);

  const totalSpend = filteredData.reduce((sum, row) => sum + row.spend, 0);
  const totalConversions = filteredData.reduce((sum, row) => sum + row.conversions, 0);
  const avgRoi = filteredData.length
    ? filteredData.reduce((sum, row) => sum + row.roi, 0) / filteredData.length
    : 0;

  const resetFilters = () => {
    setSearch('');
    setChannel(undefined);
    setDateStart('');
    setDateEnd('');
  };

  const columns = [
    { key: 'campaign_name', title: 'Campaign', accessor: 'campaign_name' as const },
    { key: 'channel', title: 'Channel', accessor: 'channel' as const },
    {
      key: 'impressions',
      title: 'Impressions',
      align: 'right' as const,
      render: (row: (typeof mockChannelPerformance)[number]) => formatNumber(row.impressions),
    },
    {
      key: 'clicks',
      title: 'Clicks',
      align: 'right' as const,
      render: (row: (typeof mockChannelPerformance)[number]) => formatNumber(row.clicks),
    },
    {
      key: 'conversions',
      title: 'Conversions',
      align: 'right' as const,
      render: (row: (typeof mockChannelPerformance)[number]) => formatNumber(row.conversions),
    },
    {
      key: 'spend',
      title: 'Spend',
      align: 'right' as const,
      render: (row: (typeof mockChannelPerformance)[number]) => formatCurrency(row.spend),
    },
    {
      key: 'roi',
      title: 'ROI',
      align: 'right' as const,
      render: (row: (typeof mockChannelPerformance)[number]) => `${row.roi.toFixed(1)}x`,
    },
    {
      key: 'action',
      title: 'Action',
      render: (row: (typeof mockChannelPerformance)[number]) => (
        <Button
          variant="link"
          className="h-auto px-0"
          onClick={() => {
            setSelectedCampaignId(row.id);
            openDetail({ setDemoMode, setDetailReturnMode }, 'campaign-detail', 'channel-performance');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Channel Performance Report"
      description="Marketing campaign statistics across channels. Filter by date range and channel type."
      extra={
        <Button variant="outline">
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
      }
    >
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard title="Total Spend" value={statisticNumberFormatter(totalSpend)} suffix="THB" icon={Wallet} />
        <StatCard title="Total Conversions" value={statisticNumberFormatter(totalConversions)} icon={Zap} iconTone="success" />
        <StatCard title="Average ROI" value={statisticRateFormatter(avgRoi)} suffix="x" icon={TrendingUp} iconTone="warning" />
      </div>

      <PageContentCard>
        <FiltersContainer>
          <SearchFilterField
            id="campaign-search"
            label="Search"
            placeholder="Campaign name..."
            value={search}
            onChange={setSearch}
          />
          <FilterSelectField
            id="campaign-channel"
            label="Channel"
            placeholder="Filter by Channel"
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'facebook', label: 'Facebook Ads' },
              { value: 'google', label: 'Google Ads' },
              { value: 'line', label: 'LINE OA' },
              { value: 'email', label: 'Email' },
            ]}
          />
          <DateFilterField
            id="campaign-date-start"
            label="Start Date"
            value={dateStart}
            onChange={setDateStart}
            placeholder="Start date"
          />
          <DateFilterField
            id="campaign-date-end"
            label="End Date"
            value={dateEnd}
            onChange={setDateEnd}
            placeholder="End date"
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

export default ChannelPerformanceView;
