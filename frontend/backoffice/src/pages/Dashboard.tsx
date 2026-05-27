import React from 'react';
import { Typography, Card, Row, Col, Statistic, theme } from 'antd';
import { TeamOutlined, UsergroupAddOutlined, AppstoreAddOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const { token } = theme.useToken();

  return (
    <div>
      <div style={{ marginBottom: token.marginLG }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Welcome to Zero Platform Admin. Here is an overview of your system.</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ borderRadius: token.borderRadius }}>
            <Statistic
              title="Total Active Staff"
              value={125}
              prefix={<TeamOutlined style={{ color: token.colorPrimary }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ borderRadius: token.borderRadius }}>
            <Statistic
              title="New Profiles (This Week)"
              value={8}
              prefix={<UsergroupAddOutlined style={{ color: token.colorSuccess }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} style={{ borderRadius: token.borderRadius }}>
            <Statistic
              title="Archived Profiles"
              value={12}
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
