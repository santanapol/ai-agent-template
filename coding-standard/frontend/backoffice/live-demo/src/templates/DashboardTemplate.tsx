import React from 'react';
import { Row, Col, Card, Statistic, Typography, theme } from 'antd';
import { PageContainer, PageContentCard } from './index';

const { Title, Text } = Typography;

const DashboardTemplate: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <PageContainer
      title="Dashboard Template"
      description="Boilerplate for dashboard and analytical overview screens."
    >
      {/* 1. Metrics Statistics Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic title="Metric Title 1" value={100} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic title="Metric Title 2" value={200} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic title="Metric Title 3" value={300} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadiusLG }}>
            <Statistic title="Metric Title 4" value={400} />
          </Card>
        </Col>
      </Row>

      {/* 2. Visual Content & Subsections Row */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <PageContentCard>
            <Title level={5} style={{ marginBottom: 16 }}>Main Analytics Widget</Title>
            <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Text type="secondary">Chart Placeholder</Text>
            </div>
          </PageContentCard>
        </Col>
        <Col xs={24} lg={8}>
          <PageContentCard>
            <Title level={5} style={{ marginBottom: 16 }}>Breakdown Summary</Title>
            <div style={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center', background: token.colorBgLayout, borderRadius: token.borderRadius }}>
              <Text type="secondary">Data Breakdown</Text>
            </div>
          </PageContentCard>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default DashboardTemplate;
