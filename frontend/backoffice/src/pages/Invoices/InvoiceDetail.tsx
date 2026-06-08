import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  Divider,
  message,
  Skeleton,
  Tooltip,
  Row,
  Col,
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
import { formatFee, formatMoney, ribbonColor, statusTagColor, formatCategoryName } from './utils';
import type { InvoiceTransaction } from '../../types/invoice';

const { Title, Text } = Typography;

const InvoiceDetail: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
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

  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => (a.company_name || '').localeCompare(b.company_name || ''));
  }, [transactions]);

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 16 }}>
          <Title level={3}>Invoice Not Found</Title>
          <Button onClick={() => navigate('/invoices')} icon={<ArrowLeftOutlined />}>
            Back to Invoices
          </Button>
        </div>
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
      render: (val: string | null | undefined) => formatCategoryName(val),
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

    const tableBody = sortedTransactions.map((t) => [
      t.company_name || '-',
      formatCategoryName(t.main_category_name),
      formatMoney(t.net_win),
      formatFee(t.fee),
      formatMoney(t.amount),
    ]);

    const totalNetWin = sortedTransactions.reduce((sum, t) => sum + t.net_win, 0);
    const totalAmount = sortedTransactions.reduce((sum, t) => sum + t.amount, 0);

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
    messageApi.success('PDF exported successfully!');
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

    sortedTransactions.forEach((t) => {
      wsData.push([
        t.company_name || '-',
        formatCategoryName(t.main_category_name),
        t.net_win,
        t.fee === 'N/A' ? 'N/A' : t.fee,
        t.amount,
      ]);
    });

    const totalNetWin = sortedTransactions.reduce((sum, t) => sum + t.net_win, 0);
    const totalAmount = sortedTransactions.reduce((sum, t) => sum + t.amount, 0);
    wsData.push(['Total', '', totalNetWin, '', totalAmount]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
    XLSX.writeFile(wb, `invoice_${invoice.iv_no}.xlsx`);
    messageApi.success('Excel exported successfully!');
  };

  const isReady = invoice.status === 'READY';
  const amount = invoice.amount ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {contextHolder}
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

      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Card style={{ width: '100%', maxWidth: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} styles={{ body: { padding: '40px 48px' } }}>
          {/* Header */}
          <Row justify="space-between" align="top" style={{ marginBottom: 40 }}>
            <Col>
              <Title level={2} style={{ margin: 0, color: '#1677ff', letterSpacing: 2 }}>INVOICE</Title>
              <Text type="secondary">Zero Platform</Text>
            </Col>
            <Col style={{ textAlign: 'right' }}>
              <Title level={4} style={{ margin: 0, color: '#595959' }}>#{invoice.iv_no}</Title>
              <Tag color={statusTagColor(invoice.status)} style={{ marginTop: 8, fontSize: 14, padding: '2px 10px' }}>
                {invoice.status}
              </Tag>
            </Col>
          </Row>

          {/* Bill To & Details */}
          <Row justify="space-between" style={{ marginBottom: 32 }}>
            <Col span={12}>
              <Text type="secondary" strong style={{ fontSize: 12, letterSpacing: 1 }}>BILL TO</Text><br />
              <Text strong style={{ fontSize: 16 }}>{invoice.branch_name || '-'}</Text><br />
              <Text type="secondary">Billing Month: {invoice.billing_month || '-'}</Text>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'right', width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ marginRight: 8 }}>Created Date:</Text>
                  <Text strong>{new Date(invoice.cr_date).toLocaleDateString('th-TH')}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ marginRight: 8 }}>Due Date:</Text>
                  <Text type={isReady ? 'danger' : 'secondary'} strong={isReady}>
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-'}
                  </Text>
                </div>
                {invoice.status === 'PAID' && invoice.upd_date && (
                  <div>
                    <Text type="secondary" style={{ marginRight: 8 }}>Paid Date:</Text>
                    <Text type="success" strong>{new Date(invoice.upd_date).toLocaleDateString('th-TH')}</Text>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          <Divider style={{ margin: '24px 0' }} />

          {/* Table */}
          <Table
            size="small"
            columns={columns}
            dataSource={sortedTransactions}
            rowKey="_id"
            loading={transactionsLoading}
            pagination={false}
          />

          {/* Totals */}
          <Row justify="end" style={{ marginTop: 24 }}>
            <Col xs={24} sm={12} md={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12 }}>
                <Text strong style={{ fontSize: 16 }}>Total Amount</Text>
                <Title level={4} style={{ margin: 0, color: amount < 0 ? '#cf1322' : '#3f8600' }}>
                  {formatMoney(amount)}
                </Title>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceDetail;
