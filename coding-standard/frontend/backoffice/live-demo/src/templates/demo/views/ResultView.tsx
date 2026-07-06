import React from 'react';
import { Button } from 'antd';
import ResultTemplate from '../../ResultTemplate';
import type { DemoViewProps } from '../types';

const ResultView: React.FC<DemoViewProps> = ({
  setDemoMode,
  selectedInvoiceCode,
  subResultKey = 'success',
}) => {
  if (subResultKey === 'success') {
    return (
      <ResultTemplate
        status="success"
        title="Invoice Payment Recorded Successfully"
        subTitle={`Payment of ฿45,000.00 for ${selectedInvoiceCode} has been sync'd to the accounting gateway.`}
        extra={[
          <Button type="primary" key="dashboard" onClick={() => setDemoMode('dashboard')}>
            Go to Dashboard
          </Button>,
          <Button key="back" onClick={() => setDemoMode('invoice-detail')}>
            View Invoice Details
          </Button>,
        ]}
      />
    );
  }

  if (subResultKey === '403') {
    return (
      <ResultTemplate
        status="403"
        title="Access Forbidden"
        subTitle="You do not have authorization to view or approve void requests on this invoice."
        primaryActionText="Back to Dashboard"
        onPrimaryAction={() => setDemoMode('dashboard')}
      />
    );
  }

  if (subResultKey === '404') {
    return (
      <ResultTemplate
        status="404"
        title="Invoice Not Found"
        subTitle="The requested invoice code does not exist in the billing database."
        primaryActionText="Back to Invoices"
        onPrimaryAction={() => setDemoMode('invoices')}
      />
    );
  }

  return (
    <ResultTemplate
      status="500"
      title="Payment Gateway Timeout"
      subTitle="Sorry, the third-party payment bank gateway timed out. Please try again."
      primaryActionText="Back to Dashboard"
      onPrimaryAction={() => setDemoMode('dashboard')}
    />
  );
};

export default ResultView;
