import React, { useState } from 'react';
import { CalculatorOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Form, InputNumber, Typography } from 'antd';
import { computeBmiResult, formatBmi, type BmiResult } from '../lib/bmi';

interface BmiFormValues {
  heightCm: number;
  weightKg: number;
}

const BmiCalculator: React.FC = () => {
  const [form] = Form.useForm<BmiFormValues>();
  const [result, setResult] = useState<BmiResult | null>(null);

  const handleCalculate = async () => {
    try {
      const values = await form.validateFields();
      setResult(computeBmiResult(values.weightKg, values.heightCm));
    } catch {
      setResult(null);
    }
  };

  return (
    <Flex
      vertical
      align="center"
      justify="center"
      style={{ minHeight: '100vh', padding: 24 }}
    >
      <Card title="คำนวณ BMI" style={{ width: '100%', maxWidth: 420 }}>
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item
            label="ส่วนสูง (ซม.)"
            name="heightCm"
            rules={[
              { required: true, message: 'กรุณากรอกส่วนสูง 50–300 ซม.' },
              {
                type: 'number',
                min: 50,
                max: 300,
                message: 'กรุณากรอกส่วนสูง 50–300 ซม.',
              },
            ]}
          >
            <InputNumber
              placeholder="เช่น 170"
              style={{ width: '100%' }}
              min={50}
              max={300}
            />
          </Form.Item>

          <Form.Item
            label="น้ำหนัก (กก.)"
            name="weightKg"
            rules={[
              { required: true, message: 'กรุณากรอกน้ำหนัก 1–500 กก.' },
              {
                type: 'number',
                min: 1,
                max: 500,
                message: 'กรุณากรอกน้ำหนัก 1–500 กก.',
              },
            ]}
          >
            <InputNumber
              placeholder="เช่น 70"
              style={{ width: '100%' }}
              min={1}
              max={500}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<CalculatorOutlined />}
              onClick={handleCalculate}
              block
            >
              คำนวณ
            </Button>
          </Form.Item>
        </Form>

        {result && (
          <Flex vertical gap={8} data-testid="bmi-result">
            <Typography.Text>
              BMI: <Typography.Text strong>{formatBmi(result.value)}</Typography.Text>
            </Typography.Text>
            <Typography.Text>
              หมวดหมู่:{' '}
              <Typography.Text strong>{result.labelTh}</Typography.Text>
            </Typography.Text>
          </Flex>
        )}
      </Card>
    </Flex>
  );
};

export default BmiCalculator;
