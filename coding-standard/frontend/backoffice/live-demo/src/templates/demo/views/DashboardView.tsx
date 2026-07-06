import React from 'react';
import { Table, Button, Typography, Row, Col, Card, Statistic, Tag, Space, theme } from 'antd';
import { DollarOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { PageContainer, PageContentCard } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { mockInvoices } from '../mockData';
import { listBreadcrumb } from '../breadcrumbs';
import { formatCurrency, getInvoiceStatusColor, statisticNumberFormatter, statisticRateFormatter } from '../helpers';
import { TABLE_SCROLL, tableLocale, useDemoTableLoading } from '../tableConfig';
import type { DemoViewProps } from '../types';
import { openDetail } from '../types';

const { Text, Title } = Typography;

const DashboardView: React.FC<DemoViewProps> = (props) => {
  const { token } = theme.useToken();
  const { setDemoMode, setDetailReturnMode, setSelectedInvoiceCode } = props;
  const loading = useDemoTableLoading();

  const invoiceColumns = [
    { title: 'Invoice No', dataIndex: 'iv_no', key: 'iv_no' },
    {
      title: 'Branch Name',
      dataIndex: 'branch_name',
      key: 'branch_name',
      ellipsis: true,
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={getInvoiceStatusColor(status)}>{status}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (val: number | null) => formatCurrency(val),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: (typeof mockInvoices)[number]) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedInvoiceCode(record.iv_no);
            openDetail({ setDemoMode, setDetailReturnMode }, 'invoice-detail', 'dashboard');
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Dashboard"
      description="Analytical snapshot of agent invoice distribution, collection success, and active revenue flow."
      breadcrumbItems={listBreadcrumb('Dashboard')}
    >
      <Row gutter={[layoutTokens.pageGap, layoutTokens.pageGap]} style={{ marginBottom: layoutTokens.pageGap }}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title="Total Billed"
              value={254000}
              formatter={statisticNumberFormatter}
              prefix={<DollarOutlined style={{ color: token.colorPrimary }} />}
              suffix="THB"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title="Commissions Earned"
              value={12700}
              formatter={statisticNumberFormatter}
              prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
              suffix="THB"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title="Unpaid/Pending"
              value={209000}
              formatter={statisticNumberFormatter}
              prefix={<InfoCircleOutlined style={{ color: token.colorWarning }} />}
              suffix="THB"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic
              title="Paid Rate"
              value={87.5}
              formatter={statisticRateFormatter}
              prefix={<CheckCircleOutlined style={{ color: token.colorPrimary }} />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[layoutTokens.pageGap, layoutTokens.pageGap]}>
        <Col xs={24} lg={16}>
          <PageContentCard>
            <Title level={5} style={{ marginBottom: layoutTokens.sectionGap }}>Latest Generated Invoices</Title>
            <Table
              dataSource={mockInvoices}
              columns={invoiceColumns}
              rowKey="id"
              loading={loading}
              locale={tableLocale}
              pagination={false}
              scroll={TABLE_SCROLL}
            />
          </PageContentCard>
        </Col>
        <Col xs={24} lg={8}>
          <PageContentCard>
            <Title level={5} style={{ marginBottom: layoutTokens.sectionGap }}>Billing Gateway Status</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ background: token.colorBgLayout, padding: 12, borderRadius: token.borderRadius }}>
                <Text type="secondary">API Gateway Health</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: token.colorSuccess }}>Active (99.98% SLA)</div>
              </div>
              <div style={{ background: token.colorBgLayout, padding: 12, borderRadius: token.borderRadius }}>
                <Text type="secondary">E-Invoice Sync</Text>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>All Clear</div>
              </div>
            </Space>
          </PageContentCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DashboardView;
