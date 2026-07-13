import React, { useState } from 'react';
import { Form, Input, Button, Space, Descriptions, Tag, Typography, message } from 'antd';
import { DetailContainer, PageContentCard } from '../../index';
import { layoutTokens } from '../../../themeConfig';
import { mockInvoices } from '../mockData';
import { formatCurrency, getInvoiceStatusColor } from '../helpers';
import { detailBreadcrumb } from '../breadcrumbs';
import type { DemoViewProps } from '../types';

const { Title } = Typography;

const cardStyle = { maxWidth: 720, marginBottom: layoutTokens.pageGap };
const sectionTitleStyle = { marginBottom: layoutTokens.sectionGap };

const simulateSave = (delayMs = 600) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const InvoiceDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedInvoiceCode,
  setSelectedInvoiceCode,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const invoiceData = mockInvoices.find((inv) => inv.iv_no === selectedInvoiceCode) ?? mockInvoices[2];
  const parentLabel = detailReturnMode === 'dashboard' ? 'Dashboard' : 'Invoices Management';
  const handleBack = () => setDemoMode(detailReturnMode);

  const handleParentClick = () => {
    setDemoMode(detailReturnMode === 'dashboard' ? 'dashboard' : 'invoices');
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await simulateSave();
      message.success('Invoice memo saved successfully');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailContainer
      title={`Invoice Details: #${selectedInvoiceCode}`}
      breadcrumbItems={detailBreadcrumb(parentLabel, selectedInvoiceCode, handleParentClick)}
      onBack={handleBack}
      extra={
        <Space>
          <Button danger disabled={saving}>Void Invoice</Button>
          <Button
            type="primary"
            disabled={saving}
            onClick={() => {
              setSelectedInvoiceCode(invoiceData.iv_no);
              setDemoMode('result');
            }}
          >
            Record Payment
          </Button>
        </Space>
      }
    >
      <PageContentCard style={cardStyle}>
        <Descriptions
          title="Invoice Metadata"
          bordered
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'iv_no', label: 'Invoice No', children: invoiceData.iv_no },
            {
              key: 'status',
              label: 'Status',
              children: <Tag color={getInvoiceStatusColor(invoiceData.status)}>{invoiceData.status}</Tag>,
            },
            { key: 'branch', label: 'Branch Name', children: invoiceData.branch_name },
            { key: 'month', label: 'Billing Month', children: invoiceData.billing_month },
            { key: 'amount', label: 'Amount', span: 2, children: formatCurrency(invoiceData.amount) },
            { key: 'due', label: 'Due Date', children: invoiceData.due_date },
            { key: 'created', label: 'Created Date', children: '2026-06-30' },
          ]}
        />
      </PageContentCard>

      <PageContentCard style={{ maxWidth: 720 }}>
        <Form
          form={form}
          layout="vertical"
          key={selectedInvoiceCode}
          initialValues={{
            memo: 'Late payment penalty might apply.',
            recipient: 'accounting@partner-agency.com',
          }}
          scrollToFirstError
          disabled={saving}
          onFinish={handleFinish}
          onFinishFailed={() => message.error('Please fix the errors below')}
        >
          <Title level={5} style={sectionTitleStyle}>Billing Contacts & Memo</Title>
          <Form.Item
            label="Recipient Email"
            name="recipient"
            rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Invoice Note / Memo" name="memo">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>
              Save Memo
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

export default InvoiceDetailView;
