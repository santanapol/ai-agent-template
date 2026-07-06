import React, { useMemo, useState } from 'react';
import { Table, Input, Select, DatePicker, Button, Row, Col, Card, Statistic, theme } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DownloadOutlined, RiseOutlined, FundOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { PageContainer, PageContentCard, FiltersContainer } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { mockChannelPerformance, mockCampaignDailyStats } from '../mockData';
import { listBreadcrumb } from '../breadcrumbs';
import { formatCurrency, formatNumber, statisticNumberFormatter, statisticRateFormatter } from '../helpers';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const CHANNEL_MAP: Record<string, string> = {
  facebook: 'Facebook Ads',
  google: 'Google Ads',
  line: 'LINE OA',
  email: 'Email',
};

const campaignMatchesDateRange = (campaignId: number, range: [Dayjs, Dayjs]) => {
  const [start, end] = range;
  const stats = mockCampaignDailyStats.filter((s) => s.campaign_id === campaignId);
  if (stats.length === 0) return true;
  return stats.some((s) => {
    const d = dayjs(s.date);
    return !d.isBefore(start, 'day') && !d.isAfter(end, 'day');
  });
};

const ChannelPerformanceView: React.FC<DemoViewProps> = (props) => {
  const { token } = theme.useToken();
  const { setDemoMode, setDetailReturnMode, setSelectedCampaignId } = props;
  const loading = useDemoTableLoading();
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const filteredData = useMemo(() => {
    return mockChannelPerformance.filter((row) => {
      if (search && !row.campaign_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (channel && row.channel !== CHANNEL_MAP[channel]) return false;
      if (dateRange && !campaignMatchesDateRange(row.id, dateRange)) return false;
      return true;
    });
  }, [search, channel, dateRange]);

  const totalSpend = filteredData.reduce((sum, row) => sum + row.spend, 0);
  const totalConversions = filteredData.reduce((sum, row) => sum + row.conversions, 0);
  const avgRoi = filteredData.length
    ? filteredData.reduce((sum, row) => sum + row.roi, 0) / filteredData.length
    : 0;

  const columns = [
    { title: 'Campaign', dataIndex: 'campaign_name', key: 'campaign_name', ellipsis: true },
    { title: 'Channel', dataIndex: 'channel', key: 'channel' },
    { title: 'Impressions', dataIndex: 'impressions', key: 'impressions', align: 'right' as const, render: formatNumber },
    { title: 'Clicks', dataIndex: 'clicks', key: 'clicks', align: 'right' as const, render: formatNumber },
    { title: 'Conversions', dataIndex: 'conversions', key: 'conversions', align: 'right' as const, render: formatNumber },
    { title: 'Spend', dataIndex: 'spend', key: 'spend', align: 'right' as const, render: formatCurrency },
    { title: 'ROI', dataIndex: 'roi', key: 'roi', align: 'right' as const, render: (val: number) => `${val.toFixed(1)}x` },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: (typeof mockChannelPerformance)[number]) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedCampaignId(record.id);
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
      breadcrumbItems={listBreadcrumb('Channel Performance Report')}
      extra={<Button icon={<DownloadOutlined />}>Export CSV</Button>}
    >
      <Row gutter={[layoutTokens.pageGap, layoutTokens.pageGap]} style={{ marginBottom: layoutTokens.pageGap }}>
        <Col xs={24} sm={8}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title="Total Spend"
              value={totalSpend}
              formatter={statisticNumberFormatter}
              prefix={<FundOutlined style={{ color: token.colorPrimary }} />}
              suffix="THB"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title="Total Conversions"
              value={totalConversions}
              formatter={statisticNumberFormatter}
              prefix={<ThunderboltOutlined style={{ color: token.colorSuccess }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title="Average ROI"
              value={avgRoi}
              formatter={statisticRateFormatter}
              prefix={<RiseOutlined style={{ color: token.colorWarning }} />}
              suffix="x"
            />
          </Card>
        </Col>
      </Row>

      <PageContentCard>
        <FiltersContainer>
          <Input.Search
            placeholder="Search campaign..."
            style={{ width: '100%', maxWidth: 300 }}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={setSearch}
          />
          <Select
            placeholder="Filter by Channel"
            style={{ width: 180 }}
            allowClear
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'facebook', label: 'Facebook Ads' },
              { value: 'google', label: 'Google Ads' },
              { value: 'line', label: 'LINE OA' },
              { value: 'email', label: 'Email' },
            ]}
          />
          <DatePicker.RangePicker
            style={{ width: 280 }}
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            allowClear
          />
        </FiltersContainer>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={tableLocale}
          pagination={{ pageSize: 5 }}
          scroll={TABLE_SCROLL}
        />
      </PageContentCard>
    </PageContainer>
  );
};

export default ChannelPerformanceView;
