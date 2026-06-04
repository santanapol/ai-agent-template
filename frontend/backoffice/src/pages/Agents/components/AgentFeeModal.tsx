import React from 'react';
import { Modal, Form, Select, InputNumber } from 'antd';
import type { GameCompany, GameCategory, CreateFeePayload } from '../../../types/agentFees';

interface AgentFeeModalProps {
  open: boolean;
  loading: boolean;
  companies: GameCompany[];
  categories: GameCategory[];
  onOk: (values: CreateFeePayload) => void;
  onCancel: () => void;
}

const AgentFeeModal: React.FC<AgentFeeModalProps> = ({
  open,
  loading,
  companies,
  categories,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onOk(values);
    } catch {
      // Validation failed
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Add Fee Rate"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Add"
      afterClose={() => form.resetFields()}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="company_id"
          label="Game Company"
          rules={[{ required: true, message: 'Please select a game company' }]}
        >
          <Select
            showSearch
            placeholder="Select game company"
            size="large"
            options={companies.map(c => ({ value: c._id, label: c.name.en }))}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          name="main_cate_id"
          label="Game Category"
          rules={[{ required: true, message: 'Please select a game category' }]}
        >
          <Select
            showSearch
            placeholder="Select game category"
            size="large"
            options={categories.map(c => ({ value: c._id, label: c.name.en }))}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          name="fee_rate"
          label="Fee Rate (%)"
          rules={[{ required: true, message: 'Please enter fee rate' }]}
        >
          <InputNumber
            min={0}
            max={100}
            formatter={(value) => `${value}%`}
            parser={(value) => (value ? Number(value.replace('%', '')) : 0) as any}
            style={{ width: '100%' }}
            size="large"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AgentFeeModal;
