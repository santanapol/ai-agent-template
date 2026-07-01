import { DescriptionList } from '@/components/demo/description-list';
import { DataTable } from '@/components/demo/data-table';
import { DetailContainer, PageContentCard } from '../../index';
import { mockChannelPerformance, mockCampaignDailyStats } from '../mockData';
import { formatCurrency, formatNumber } from '../helpers';
import { useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';

const CampaignDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedCampaignId,
}) => {
  const loading = useDemoTableLoading();
  const campaign = mockChannelPerformance.find((c) => c.id === selectedCampaignId) ?? mockChannelPerformance[0];
  const filteredDailyStats = mockCampaignDailyStats.filter((row) => row.campaign_id === campaign.id);
  const dailyStats = filteredDailyStats.length > 0
    ? filteredDailyStats
    : [{
        id: 0,
        campaign_id: campaign.id,
        date: '2026-06-30',
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        conversions: campaign.conversions,
        spend: campaign.spend,
      }];

  const ctr = ((campaign.clicks / campaign.impressions) * 100).toFixed(2);
  const conversionRate = ((campaign.conversions / campaign.clicks) * 100).toFixed(2);

  const dailyColumns = [
    { key: 'date', title: 'Date', accessor: 'date' as const },
    {
      key: 'impressions',
      title: 'Impressions',
      align: 'right' as const,
      render: (row: (typeof dailyStats)[number]) => formatNumber(row.impressions),
    },
    {
      key: 'clicks',
      title: 'Clicks',
      align: 'right' as const,
      render: (row: (typeof dailyStats)[number]) => formatNumber(row.clicks),
    },
    {
      key: 'conversions',
      title: 'Conversions',
      align: 'right' as const,
      render: (row: (typeof dailyStats)[number]) => formatNumber(row.conversions),
    },
    {
      key: 'spend',
      title: 'Spend',
      align: 'right' as const,
      render: (row: (typeof dailyStats)[number]) => formatCurrency(row.spend),
    },
  ];

  return (
    <DetailContainer
      title={`Campaign Details: ${campaign.campaign_name}`}
      onBack={() => setDemoMode(detailReturnMode)}
    >
      <PageContentCard className="max-w-[720px]">
        <DescriptionList
          title="Campaign Summary"
          items={[
            { label: 'Campaign', value: campaign.campaign_name },
            { label: 'Channel', value: campaign.channel },
            { label: 'Impressions', value: formatNumber(campaign.impressions) },
            { label: 'Clicks', value: formatNumber(campaign.clicks) },
            { label: 'CTR', value: `${ctr}%` },
            { label: 'Conversions', value: formatNumber(campaign.conversions) },
            { label: 'Conversion Rate', value: `${conversionRate}%` },
            { label: 'ROI', value: `${campaign.roi.toFixed(1)}x` },
            { label: 'Total Spend', value: formatCurrency(campaign.spend), span: 2 },
          ]}
        />
      </PageContentCard>

      <PageContentCard title="Daily Performance Breakdown">
        <DataTable columns={dailyColumns} data={dailyStats} loading={loading} rowKey="id" pageSize={10} />
      </PageContentCard>
    </DetailContainer>
  );
};

export default CampaignDetailView;
