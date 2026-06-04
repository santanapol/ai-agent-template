import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Button, Typography, Space, Descriptions, Divider, message, Badge, Skeleton, Tooltip } from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined, FileExcelOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ColumnsType } from 'antd/es/table';
import { mockInvoices, mockInvoiceTransactions } from '../mock/invoiceData';
import type { InvoiceTransaction } from '../types/invoice';

const { Title, Text } = Typography;

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // Simulate API loading
    const timer = setTimeout(() => setPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, [id]);

  const invoice = mockInvoices.find(inv => inv._id === id);
  const transactions = mockInvoiceTransactions[id || ''] || [];

  if (!invoice) {
    return (
      <Card>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Title level={3}>Invoice Not Found</Title>
          <Button onClick={() => navigate('/invoices')} icon={<ArrowLeftOutlined />}>Back to Invoices</Button>
        </Space>
      </Card>
    );
  }

  const columns: ColumnsType<InvoiceTransaction> = [
    {
      title: 'Game Provider',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Game Category',
      dataIndex: 'main_category_name',
      key: 'main_category_name',
    },
    {
      title: 'Net Win',
      dataIndex: 'net_win',
      key: 'net_win',
      align: 'right',
      render: (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
    {
      title: (
        <Space>
          Fee (%)
          <Tooltip title="Fee is calculated based on Net Win">
            <InfoCircleOutlined style={{ color: '#1677ff' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'fee',
      key: 'fee',
      align: 'right',
      render: (val: number) => `${val}%`,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
  ];

  const handleUpdateStatus = () => {
    setLoading(true);
    setTimeout(() => {
      message.success('Invoice status updated successfully!');
      setLoading(false);
    }, 1000);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.iv_no}`, 14, 32);
    doc.text(`Billing Month: ${invoice.billing_month || '-'}`, 14, 38);
    doc.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-'}`, 14, 44);
    
    doc.text(`Bill To:`, 120, 32);
    doc.text(`Branch: ${invoice.branch_name}`, 120, 38);
    doc.text(`Organization Unit: ${invoice.ou_name}`, 120, 44);

    // Table
    const tableBody = transactions.map(t => [
      t.company_name,
      t.main_category_name,
      t.net_win.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      `${t.fee}%`,
      t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ]);
    
    const totalNetWin = transactions.reduce((sum, t) => sum + t.net_win, 0);
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    tableBody.push([
      'Total',
      '',
      totalNetWin.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      '-',
      totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Game Provider', 'Game Category', 'Net Win', 'Fee (%)', 'Amount']],
      body: tableBody as any,
      theme: 'grid',
      headStyles: { fillColor: [22, 119, 255] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      didParseCell: (data: any) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`invoice_${invoice.iv_no}.pdf`);
    message.success('PDF exported successfully!');
  };

  const handleExportExcel = () => {
    // Construct worksheet data
    const wsData: any[][] = [
      ['INVOICE'],
      [''],
      ['Invoice No:', invoice.iv_no, '', 'Bill To:', invoice.branch_name],
      ['Billing Month:', invoice.billing_month || '-', '', 'Organization Unit:', invoice.ou_name],
      ['Due Date:', invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-', '', 'Status:', invoice.status],
      [''],
      ['Game Provider', 'Game Category', 'Net Win', 'Fee (%)', 'Amount']
    ];

    transactions.forEach(t => {
      wsData.push([
        t.company_name,
        t.main_category_name,
        t.net_win,
        t.fee,
        t.amount
      ]);
    });

    const totalNetWin = transactions.reduce((sum, t) => sum + t.net_win, 0);
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    wsData.push(['Total', '', totalNetWin, '', totalAmount]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto fit columns
    ws['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    XLSX.writeFile(wb, `invoice_${invoice.iv_no}.xlsx`);
    message.success('Excel exported successfully!');
  };

  if (pageLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  const isReady = invoice.status === 'READY';

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center" size="middle">
          <Button className="no-print" icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')} />
          <Title level={2} style={{ margin: 0 }}>Invoice Details</Title>
        </Space>
        <Space className="no-print">
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>Export PDF</Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>Export Excel</Button>
          {isReady && (
            <Button className="no-print" type="primary" icon={<CheckCircleOutlined />} onClick={handleUpdateStatus} loading={loading}>
              Mark as PAID
            </Button>
          )}
        </Space>
      </div>

      <Badge.Ribbon 
        text={invoice.status} 
        color={isReady ? 'orange' : 'green'}
        style={{ top: -10, padding: '0 16px', fontSize: 14 }}
      >
        <Card>
          <Descriptions title="Summary" bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
            {/* Row 1: Core Invoice Info */}
            <Descriptions.Item label="Invoice No"><Text strong>{invoice.iv_no}</Text></Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={isReady ? 'warning' : 'success'}>{invoice.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Billing Month">{invoice.billing_month || '-'}</Descriptions.Item>

            {/* Row 2: Location & Due Date Info */}
            <Descriptions.Item label="Organization Unit">{invoice.ou_name}</Descriptions.Item>
            <Descriptions.Item label="Branch">{invoice.branch_name}</Descriptions.Item>
            <Descriptions.Item label="Due Date">
              <Text type={isReady ? 'danger' : 'secondary'} strong={isReady}>
                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-'}
              </Text>
            </Descriptions.Item>

            {/* Row 3: Audit Info */}
            <Descriptions.Item label="Created By">{invoice.cr_by}</Descriptions.Item>
            <Descriptions.Item label="Created Date">{new Date(invoice.cr_date).toLocaleString('th-TH')}</Descriptions.Item>
            <Descriptions.Item label=""></Descriptions.Item>
          </Descriptions>

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4}>Transactions</Title>
          <Space size="large">
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary">Total Net Win</Text>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1677ff' }}>
                {invoice.net_win.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text type="secondary">Total Amount</Text>
              <div style={{ fontSize: 20, fontWeight: 700, color: invoice.amount < 0 ? '#cf1322' : '#3f8600' }}>
                {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="_id"
          pagination={false}
          summary={() => (
            <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
              <Table.Summary.Cell index={0} colSpan={2}>Total</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                {transactions.reduce((acc, curr) => acc + curr.net_win, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">-</Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right">
                {transactions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
        </Card>
      </Badge.Ribbon>
    </Space>
  );
};

export default InvoiceDetail;
