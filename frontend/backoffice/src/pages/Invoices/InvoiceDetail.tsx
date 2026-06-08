import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  Descriptions,
  Divider,
  message,
  Badge,
  Skeleton,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { ColumnsType } from 'antd/es/table';
import { useInvoices } from './hooks/useInvoices';
import { formatFee, formatMoney, ribbonColor, statusTagColor } from './utils';
import type { InvoiceTransaction } from '../../types/invoice';

const { Title, Text } = Typography;

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    invoice,
    transactions,
    detailLoading,
    transactionsLoading,
    updatingStatus,
    fetchInvoiceDetail,
    fetchTransactions,
    markAsPaid,
  } = useInvoices();

  useEffect(() => {
    if (!id) return;
    fetchInvoiceDetail(id);
    fetchTransactions(id);
  }, [id, fetchInvoiceDetail, fetchTransactions]);

  if (detailLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <Space direction="vertical" align="center" style={{ width: '100%' }}>
          <Title level={3}>Invoice Not Found</Title>
          <Button onClick={() => navigate('/invoices')} icon={<ArrowLeftOutlined />}>
            Back to Invoices
          </Button>
        </Space>
      </Card>
    );
  }

  const columns: ColumnsType<InvoiceTransaction> = [
    {
      title: 'Game Provider',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Game Category',
      dataIndex: 'main_category_name',
      key: 'main_category_name',
      render: (val: string | null | undefined) => val || '-',
    },
    {
      title: 'Net Win',
      dataIndex: 'net_win',
      key: 'net_win',
      align: 'right',
      render: (val: number) => formatMoney(val),
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
      render: (val: number | 'N/A') => formatFee(val),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val: number) => formatMoney(val),
    },
  ];

  const handleUpdateStatus = async () => {
    if (!id) return;
    const success = await markAsPaid(id);
    if (success) {
      fetchInvoiceDetail(id);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('INVOICE', 14, 22);

    doc.setFontSize(10);
    doc.text(`Invoice No: ${invoice.iv_no}`, 14, 32);
    doc.text(`Billing Month: ${invoice.billing_month || '-'}`, 14, 38);
    doc.text(
      `Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-'}`,
      14,
      44,
    );

    doc.text('Bill To:', 120, 32);
    doc.text(`Branch: ${invoice.branch_name || '-'}`, 120, 38);
    doc.text(`Organization Unit: ${invoice.ou_name || '-'}`, 120, 44);

    const tableBody = transactions.map((t) => [
      t.company_name || '-',
      t.main_category_name || '-',
      formatMoney(t.net_win),
      formatFee(t.fee),
      formatMoney(t.amount),
    ]);

    const totalNetWin = transactions.reduce((sum, t) => sum + t.net_win, 0);
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    tableBody.push(['Total', '', formatMoney(totalNetWin), '-', formatMoney(totalAmount)]);

    autoTable(doc, {
      startY: 55,
      head: [['Game Provider', 'Game Category', 'Net Win', 'Fee (%)', 'Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [22, 119, 255] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    doc.save(`invoice_${invoice.iv_no}.pdf`);
    message.success('PDF exported successfully!');
  };

  const handleExportExcel = () => {
    const wsData: (string | number)[][] = [
      ['INVOICE'],
      [''],
      ['Invoice No:', invoice.iv_no, '', 'Bill To:', invoice.branch_name || '-'],
      ['Billing Month:', invoice.billing_month || '-', '', 'Organization Unit:', invoice.ou_name || '-'],
      [
        'Due Date:',
        invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-',
        '',
        'Status:',
        invoice.status,
      ],
      [''],
      ['Game Provider', 'Game Category', 'Net Win', 'Fee (%)', 'Amount'],
    ];

    transactions.forEach((t) => {
      wsData.push([
        t.company_name || '-',
        t.main_category_name || '-',
        t.net_win,
        t.fee === 'N/A' ? 'N/A' : t.fee,
        t.amount,
      ]);
    });

    const totalNetWin = transactions.reduce((sum, t) => sum + t.net_win, 0);
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    wsData.push(['Total', '', totalNetWin, '', totalAmount]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    XLSX.writeFile(wb, `invoice_${invoice.iv_no}.xlsx`);
    message.success('Excel exported successfully!');
  };

  const isReady = invoice.status === 'READY';
  const amount = invoice.amount ?? 0;

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center" size="middle">
          <Button className="no-print" icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')} />
          <Title level={2} style={{ margin: 0 }}>
            Invoice Details
          </Title>
        </Space>
        <Space className="no-print">
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>
            Export PDF
          </Button>
          <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
            Export Excel
          </Button>
          {isReady && (
            <Button
              className="no-print"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleUpdateStatus}
              loading={updatingStatus}
            >
              Mark as PAID
            </Button>
          )}
        </Space>
      </div>

      <Badge.Ribbon
        text={invoice.status}
        color={ribbonColor(invoice.status)}
        style={{ top: -10, padding: '0 16px', fontSize: 14 }}
      >
        <Card>
          <Descriptions title="Summary" bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
            <Descriptions.Item label="Invoice No">
              <Text strong>{invoice.iv_no}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusTagColor(invoice.status)}>{invoice.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Billing Month">{invoice.billing_month || '-'}</Descriptions.Item>

            <Descriptions.Item label="Organization Unit">{invoice.ou_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Branch">{invoice.branch_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Due Date">
              <Text type={isReady ? 'danger' : 'secondary'} strong={isReady}>
                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-'}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Created By">{invoice.cr_by || '-'}</Descriptions.Item>
            <Descriptions.Item label="Created Date">
              {new Date(invoice.cr_date).toLocaleString('th-TH')}
            </Descriptions.Item>
            <Descriptions.Item label=""></Descriptions.Item>
          </Descriptions>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={4}>Transactions</Title>
            <Space size="large">
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary">Total Net Win</Text>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#1677ff' }}>
                  {formatMoney(invoice.net_win)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary">Total Amount</Text>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: amount < 0 ? '#cf1322' : '#3f8600',
                  }}
                >
                  {formatMoney(amount)}
                </div>
              </div>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={transactions}
            rowKey="_id"
            loading={transactionsLoading}
            pagination={false}
            summary={() => (
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                <Table.Summary.Cell index={0} colSpan={2}>
                  Total
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {formatMoney(transactions.reduce((acc, curr) => acc + curr.net_win, 0))}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  -
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  {formatMoney(transactions.reduce((acc, curr) => acc + curr.amount, 0))}
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
