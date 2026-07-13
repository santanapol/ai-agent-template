import React, { useState } from 'react';
import { Form, Input, Select, Button, Space, Descriptions, Badge, Typography, theme, message } from 'antd';
import { DetailContainer, PageContentCard } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { mockStaff, ROLE_OPTIONS } from '../mockData';
import { detailBreadcrumb } from '../breadcrumbs';
import type { DemoViewProps } from '../types';

const { Title } = Typography;

const cardStyle = { maxWidth: 720, marginBottom: layoutTokens.pageGap };
const sectionTitleStyle = { marginBottom: layoutTokens.sectionGap };

const simulateSave = (delayMs = 600) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const StaffDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedStaffId,
}) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const selectedStaff = mockStaff.find((s) => s.id === selectedStaffId) ?? mockStaff[0];

  const handleBack = () => setDemoMode(detailReturnMode);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await simulateSave();
      message.success('Staff profile saved successfully');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailContainer
      title={`Staff Profile: ${selectedStaff.firstname} ${selectedStaff.lastname}`}
      breadcrumbItems={detailBreadcrumb('Staff Management', selectedStaff.code, () => setDemoMode('staff'))}
      onBack={handleBack}
    >
      <PageContentCard style={cardStyle}>
        <Descriptions
          title="Profile Metadata"
          bordered
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'code', label: 'Staff Code', children: selectedStaff.code },
            {
              key: 'status',
              label: 'Status',
              children: (
                <Badge
                  status={selectedStaff.active ? 'success' : 'default'}
                  text={
                    <span
                      style={{
                        textTransform: 'capitalize',
                        color: selectedStaff.active ? token.colorSuccess : token.colorTextSecondary,
                      }}
                    >
                      {selectedStaff.active ? 'active' : 'inactive'}
                    </span>
                  }
                />
              ),
            },
            { key: 'firstname', label: 'First Name', children: selectedStaff.firstname },
            { key: 'lastname', label: 'Last Name', children: selectedStaff.lastname },
            { key: 'email', label: 'Email', children: selectedStaff.email },
            { key: 'tel', label: 'Telephone', children: selectedStaff.tel },
          ]}
        />
      </PageContentCard>

      <PageContentCard style={{ maxWidth: 720 }}>
        <Form
          form={form}
          layout="vertical"
          key={selectedStaff.id}
          initialValues={{ username: selectedStaff.username, role: selectedStaff.role }}
          scrollToFirstError
          disabled={saving}
          onFinish={handleFinish}
          onFinishFailed={() => message.error('Please fix the errors below')}
        >
          <Title level={5} style={sectionTitleStyle}>System Authorization</Title>
          <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please enter username' }]}>
            <Input disabled />
          </Form.Item>
          <Form.Item label="System Role" name="role" rules={[{ required: true, message: 'Please select system role' }]}>
            <Select options={ROLE_OPTIONS.map(({ value, label }) => ({ value, label }))} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save Changes
            </Button>
            <Button onClick={handleBack} disabled={saving}>
              Cancel
            </Button>
          </Space>
        </Form>
      </PageContentCard>
    </DetailContainer>
  );
};

export default StaffDetailView;
