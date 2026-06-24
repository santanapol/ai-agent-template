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
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useInvoices } from './hooks/useInvoices';
import { formatDate, formatFee, formatMoney, statusTagColor, formatCategoryName, sortInvoiceTransactions } from './utils';
import type { InvoiceTransaction } from '../../types/invoice';
import { buildInvoicePdf } from './export/buildInvoicePdf';
import { buildInvoiceXlsx } from './export/buildInvoiceXlsx';
import { triggerBlobDownload } from './export/downloadBlob';

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
    cancelInvoice,
  } = useInvoices();

  useEffect(() => {
    if (!id) return;
    fetchInvoiceDetail(id);
    fetchTransactions(id);
  }, [id, fetchInvoiceDetail, fetchTransactions]);

  const sortedTransactions = React.useMemo(() => sortInvoiceTransactions(transactions), [transactions]);

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
      title: 'Bet',
      dataIndex: 'bet',
      key: 'bet',
      align: 'right',
      render: (val: number) => formatMoney(val || 0),
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

  const handleCancelInvoice = async () => {
    if (!id) return;
    const success = await cancelInvoice(id);
    if (success) {
      fetchInvoiceDetail(id);
    }
  };

  const handleExportPDF = () => {
    const blob = buildInvoicePdf(invoice, sortedTransactions);
    triggerBlobDownload(blob, `invoice_${invoice.iv_no}.pdf`);
    messageApi.success('PDF exported successfully!');
  };

  const handleExportExcel = () => {
    const blob = buildInvoiceXlsx(invoice, sortedTransactions);
    triggerBlobDownload(blob, `invoice_${invoice.iv_no}.xlsx`);
    messageApi.success('Excel exported successfully!');
  };

  const isReady = invoice.status === 'READY';
  const amount = invoice.amount ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Space align="start" size="middle">
          <Button className="no-print" icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')} style={{ marginTop: 4 }} />
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Invoice Details
            </Title>
            <Text type="secondary" className="no-print">
              Detailed breakdown, transaction records, and billing actions for this invoice.
            </Text>
          </div>
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
          {['READY', 'PENDING', 'MISSING_FEE', 'ERROR'].includes(invoice.status) && (
            <Button
              className="no-print"
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleCancelInvoice}
              loading={updatingStatus}
            >
              Cancel Invoice
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

          {/* Invoice Info & Bill To — paired the same way as the PDF/Excel export header */}
          <Row justify="space-between" style={{ marginBottom: 32 }}>
            <Col span={12}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <Text type="secondary" style={{ marginRight: 8 }}>Billing Month:</Text>
                  <Text strong>{invoice.billing_month || '-'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ marginRight: 8 }}>Created Date:</Text>
                  <Text strong>{formatDate(invoice.cr_date)}</Text>
                </div>
              </div>
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'right', width: '100%' }}>
                <div>
                  <Text type="secondary" strong style={{ fontSize: 12, letterSpacing: 1, marginRight: 8 }}>BILL TO</Text>
                  <Text strong style={{ fontSize: 16 }}>{invoice.branch_name || '-'}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ marginRight: 8 }}>Due Date:</Text>
                  <Text type={isReady ? 'danger' : 'secondary'} strong={isReady}>
                    {formatDate(invoice.due_date)}
                  </Text>
                </div>
                {invoice.status === 'PAID' && invoice.upd_date && (
                  <div>
                    <Text type="secondary" style={{ marginRight: 8 }}>Paid Date:</Text>
                    <Text type="success" strong>{formatDate(invoice.upd_date)}</Text>
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
            summary={(pageData) => {
              let totalBet = 0;
              let totalNetWin = 0;
              let totalAmount = 0;
              pageData.forEach(({ bet, net_win, amount }) => {
                totalBet += bet || 0;
                totalNetWin += net_win || 0;
                totalAmount += amount || 0;
              });

              return (
                <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                  <Table.Summary.Cell index={0} colSpan={2}>Total</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">{formatMoney(totalBet)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">{formatMoney(totalNetWin)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3}></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">{formatMoney(totalAmount)}</Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
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
