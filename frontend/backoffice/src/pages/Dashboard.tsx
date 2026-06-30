import React, { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Statistic, theme, Skeleton, Empty, Space } from 'antd';
import { PageContainer } from '../components/layout';
import { TeamOutlined, UsergroupAddOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import * as staffApi from '../lib/staffApiClient';
import { apiErrorMessage } from '../lib/apiError';
import { useAppFeedback } from '../hooks/useAppFeedback';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = useAppFeedback();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const isAdmin = user?.role === 'platform_admin' || user?.role === 'branch_admin';

    const load = async () => {
      setLoading(true);
      if (!isAdmin) {
        setLoading(false);
        return;
      }

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
  }, [message, user?.role]);

  return (
    <PageContainer
      title="Dashboard"
      description="Welcome to Zero Platform Admin. Here is an overview of your system."
    >

      {(user?.role === 'platform_admin' || user?.role === 'branch_admin') && (
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} md={8}>
            <Card variant="borderless" style={{ borderRadius: token.borderRadius }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: 100 }} />
              ) : (
                <Statistic
                  title="Total Active Staff"
                  value={activeCount}
                  prefix={<TeamOutlined style={{ color: token.colorPrimary }} />}
                />
              )}
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
            <Card variant="borderless" style={{ borderRadius: token.borderRadius }}>
              {loading ? (
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: 100 }} />
              ) : (
                <Statistic
                  title="Archived Profiles"
                  value={archivedCount}
                  prefix={<AppstoreAddOutlined style={{ color: token.colorError }} />}
                />
              )}
            </Card>
          </Col>
        </Row>
      )}

      <Card
        variant="borderless"
        style={{
          marginTop: token.marginXXL,
          borderRadius: token.borderRadius,
          border: `1px dashed ${token.colorBorderSecondary}`,
        }}
      >
        <Empty
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={4} style={{ color: token.colorTextSecondary, margin: 0 }}>
                More dashboard widgets coming soon
              </Title>
              <Text type="secondary">
                Select Staff Management from the sidebar to manage profiles.
              </Text>
            </Space>
          }
        />
      </Card>
    </PageContainer>
  );
};

export default Dashboard;
