import React, { useEffect } from 'react';
import { Modal, Form, InputNumber } from 'antd';
import type { AgentFee, UpdateFeePayload } from '../../../types/agentFees';

interface AgentFeeEditModalProps {
  open: boolean;
  loading: boolean;
  fee: AgentFee | null;
  onOk: (feeId: string, values: UpdateFeePayload, etag: string) => void;
  onCancel: () => void;
}

const AgentFeeEditModal: React.FC<AgentFeeEditModalProps> = ({
  open,
  loading,
  fee,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && fee) {
      form.setFieldsValue({ fee_rate: fee.fee_rate });
    }
  }, [open, fee, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (fee) {
        onOk(fee._id, values, fee.upd_date);
      }
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
      title="Edit Fee Rate"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Save"
      afterClose={() => form.resetFields()}
    >
      <Form form={form} layout="vertical">
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

export default AgentFeeEditModal;
