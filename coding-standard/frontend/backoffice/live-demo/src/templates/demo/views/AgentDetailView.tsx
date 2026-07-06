import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Descriptions, Tag, Typography, message } from 'antd';
import { DetailContainer, PageContentCard } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { mockAgents } from '../mockData';
import { getAgentStatusColor } from '../helpers';
import { detailBreadcrumb } from '../breadcrumbs';
import type { DemoViewProps } from '../types';

const { Title } = Typography;

const cardStyle = { maxWidth: 720, marginBottom: layoutTokens.pageGap };
const sectionTitleStyle = { marginBottom: layoutTokens.sectionGap };

const simulateSave = (delayMs = 600) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const AgentDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedAgentId,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const agent = mockAgents.find((a) => a.id === selectedAgentId) ?? mockAgents[0];
  const handleBack = () => setDemoMode(detailReturnMode);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await simulateSave();
      message.success('Agent settings saved successfully');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailContainer
      title={`Agent Details: ${agent.agent_name}`}
      breadcrumbItems={detailBreadcrumb('Agents List', agent.agent_code, () => setDemoMode('agents'))}
      onBack={handleBack}
    >
      <PageContentCard style={cardStyle}>
        <Descriptions
          title="Agent Overview"
          bordered
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'code', label: 'Agent Code', children: agent.agent_code },
            { key: 'status', label: 'Status', children: <Tag color={getAgentStatusColor(agent.status)}>{agent.status}</Tag> },
            { key: 'name', label: 'Agent Name', children: agent.agent_name },
            { key: 'branches', label: 'Branch Count', children: agent.branch_count },
            { key: 'contact', label: 'Contact Name', children: agent.contact_name },
            { key: 'commission', label: 'Commission Rate', children: `${agent.commission_rate.toFixed(1)}%` },
            { key: 'email', label: 'Email', children: agent.email },
            { key: 'tel', label: 'Telephone', children: agent.tel },
          ]}
        />
      </PageContentCard>

      <PageContentCard style={{ maxWidth: 720 }}>
        <Form
          form={form}
          layout="vertical"
          key={agent.id}
          initialValues={{
            commission_rate: agent.commission_rate,
            status: agent.status,
            contract_note: 'Standard partner agreement valid until 2026-12-31.',
          }}
          scrollToFirstError
          disabled={saving}
          onFinish={handleFinish}
          onFinishFailed={() => message.error('Please fix the errors below')}
        >
          <Title level={5} style={sectionTitleStyle}>Partnership Settings</Title>
          <Form.Item label="Commission Rate (%)" name="commission_rate">
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'SUSPENDED', label: 'SUSPENDED' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Contract Note" name="contract_note">
            <Input.TextArea rows={3} />
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

export default AgentDetailView;
