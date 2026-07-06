import React from 'react';
import { Form, Input, Button, Space, Descriptions, Tag } from 'antd';
import { DetailContainer, PageContentCard } from './index';
import { layoutTokens } from '../themeConfig';

const cardStyle = { maxWidth: 720, marginBottom: layoutTokens.pageGap };

const DetailTemplate: React.FC = () => {
  const [form] = Form.useForm();

  const handleBack = () => {
    // Navigate back logic
  };

  const handleFinish = (values: unknown) => {
    console.log('Submitted values:', values);
  };

  return (
    <DetailContainer title="Detail Page Template" onBack={handleBack}>
      <PageContentCard style={cardStyle}>
        <Descriptions
          title="Entity Overview"
          bordered
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'id', label: 'ID', children: 'ENT-909' },
            { key: 'status', label: 'Status', children: <Tag color="green">Active</Tag> },
            { key: 'createdAt', label: 'Created At', children: '2026-07-01 10:00:00' },
            { key: 'createdBy', label: 'Created By', children: 'Admin' },
          ]}
        />
      </PageContentCard>

      <PageContentCard style={{ maxWidth: 720 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ name: '', description: '' }}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input the name!' }]}
          >
            <Input placeholder="Enter name" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} placeholder="Enter description" />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
            <Button onClick={handleBack}>Cancel</Button>
          </Space>
        </Form>
      </PageContentCard>
    </DetailContainer>
  );
};

export default DetailTemplate;
