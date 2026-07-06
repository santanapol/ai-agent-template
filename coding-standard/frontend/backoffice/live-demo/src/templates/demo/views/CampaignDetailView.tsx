import React from 'react';
import { Table, Descriptions } from 'antd';
import { DetailContainer, PageContentCard } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { mockChannelPerformance, mockCampaignDailyStats } from '../mockData';
import { formatCurrency, formatNumber } from '../helpers';
import { detailBreadcrumb } from '../breadcrumbs';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';

const cardStyle = { maxWidth: 720, marginBottom: layoutTokens.pageGap };

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
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Impressions', dataIndex: 'impressions', key: 'impressions', align: 'right' as const, render: formatNumber },
    { title: 'Clicks', dataIndex: 'clicks', key: 'clicks', align: 'right' as const, render: formatNumber },
    { title: 'Conversions', dataIndex: 'conversions', key: 'conversions', align: 'right' as const, render: formatNumber },
    { title: 'Spend', dataIndex: 'spend', key: 'spend', align: 'right' as const, render: formatCurrency },
  ];

  return (
    <DetailContainer
      title={`Campaign Details: ${campaign.campaign_name}`}
      breadcrumbItems={detailBreadcrumb('Channel Performance', campaign.campaign_name, () => setDemoMode('channel-performance'))}
      onBack={() => setDemoMode(detailReturnMode)}
    >
      <PageContentCard style={cardStyle}>
        <Descriptions
          title="Campaign Summary"
          bordered
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'name', label: 'Campaign', children: campaign.campaign_name },
            { key: 'channel', label: 'Channel', children: campaign.channel },
            { key: 'impressions', label: 'Impressions', children: formatNumber(campaign.impressions) },
            { key: 'clicks', label: 'Clicks', children: formatNumber(campaign.clicks) },
            { key: 'ctr', label: 'CTR', children: `${ctr}%` },
            { key: 'conversions', label: 'Conversions', children: formatNumber(campaign.conversions) },
            { key: 'cvr', label: 'Conversion Rate', children: `${conversionRate}%` },
            { key: 'roi', label: 'ROI', children: `${campaign.roi.toFixed(1)}x` },
            { key: 'spend', label: 'Total Spend', span: 2, children: formatCurrency(campaign.spend) },
          ]}
        />
      </PageContentCard>

      <PageContentCard title="Daily Performance Breakdown">
        <Table
          dataSource={dailyStats}
          columns={dailyColumns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={tableLocale}
          scroll={TABLE_SCROLL}
        />
      </PageContentCard>
    </DetailContainer>
  );
};

export default CampaignDetailView;
