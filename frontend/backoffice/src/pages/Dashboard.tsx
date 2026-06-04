import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Statistic, theme } from 'antd';
import { TeamOutlined, UsergroupAddOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import * as staffApi from '../lib/staffApiClient';
import { apiErrorMessage } from '../lib/apiError';
import { useAppFeedback } from '../hooks/useAppFeedback';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = useAppFeedback();
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [activeRes, archivedRes] = await Promise.all([
          staffApi.listProfiles({ status: 'active', page: 1, limit: 1 }),
          staffApi.listProfiles({ status: 'archived', page: 1, limit: 1 }),
        ]);
        if (cancelled) return;
        setActiveCount(activeRes.pagination?.total ?? 0);
        setArchivedCount(archivedRes.pagination?.total ?? 0);
      } catch (err) {
        if (!cancelled) message.error(apiErrorMessage(err, 'Failed to load dashboard stats'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [message]);

  return (
    <div>
      <div style={{ marginBottom: token.marginLG }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Welcome to Zero Platform Admin. Here is an overview of your system.</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" loading={loading} style={{ borderRadius: token.borderRadius }}>
            <Statistic
              title="Total Active Staff"
              value={activeCount}
              prefix={<TeamOutlined style={{ color: token.colorPrimary }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" style={{ borderRadius: token.borderRadius }}>
            <Statistic
              title="New Profiles (This Week)"
              value="—"
              prefix={<UsergroupAddOutlined style={{ color: token.colorSuccess }} />}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: token.marginXS }}>
              Coming soon
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card variant="borderless" loading={loading} style={{ borderRadius: token.borderRadius }}>
            <Statistic
              title="Archived Profiles"
              value={archivedCount}
              prefix={<AppstoreAddOutlined style={{ color: token.colorError }} />}
            />
          </Card>
        </Col>
      </Row>

      <div
        style={{
          marginTop: token.marginXXL,
          textAlign: 'center',
          paddingBlock: token.paddingXL,
          background: token.colorBgContainer,
          borderRadius: token.borderRadius,
          border: `1px dashed ${token.colorBorderSecondary}`,
        }}
      >
        <Title level={4} style={{ color: token.colorTextSecondary }}>More dashboard widgets coming soon</Title>
        <Text type="secondary">Select Staff Management from the sidebar to manage profiles.</Text>
      </div>
    </div>
  );
};

export default Dashboard;
