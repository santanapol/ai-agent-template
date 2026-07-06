import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { LoadingButton } from '@/components/demo/loading-button';
import { StatusBadge } from '@/components/demo/status-badge';
import { DescriptionList } from '@/components/demo/description-list';
import { DetailContainer, PageContentCard } from '../../index';
import { mockInvoices } from '../mockData';
import { formatCurrency, getInvoiceStatusVariant, simulateSave } from '../helpers';
import type { DemoViewProps } from '../types';

const InvoiceDetailView: React.FC<DemoViewProps> = ({
  setDemoMode,
  detailReturnMode,
  selectedInvoiceCode,
  setSelectedInvoiceCode,
}) => {
  const [saving, setSaving] = useState(false);
  const invoiceData = mockInvoices.find((inv) => inv.iv_no === selectedInvoiceCode) ?? mockInvoices[2];
  const [recipient, setRecipient] = useState('accounting@partner-agency.com');
  const [memo, setMemo] = useState('Late payment penalty might apply.');
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const handleBack = () => setDemoMode(detailReturnMode);

  const handleSave = async () => {
    if (!recipient.includes('@')) {
      setRecipientError('Please enter a valid email');
      return;
    }
    setRecipientError(null);
    setSaving(true);
    try {
      await simulateSave();
      toast.success('Invoice memo saved successfully');
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = () => {
    toast.success(`Invoice ${invoiceData.iv_no} voided (demo)`);
  };

  return (
    <DetailContainer
      title={`Invoice Details: #${selectedInvoiceCode}`}
      onBack={handleBack}
      extra={
        <>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive" disabled={saving} />}
            >
              Void Invoice
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently void invoice {invoiceData.iv_no}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleVoid}>
                  Void Invoice
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            disabled={saving}
            onClick={() => {
              setSelectedInvoiceCode(invoiceData.iv_no);
              setDemoMode('result');
            }}
          >
            Record Payment
          </Button>
        </>
      }
    >
      <PageContentCard className="max-w-[720px]">
        <DescriptionList
          title="Invoice Metadata"
          items={[
            { label: 'Invoice No', value: invoiceData.iv_no },
            {
              label: 'Status',
              value: (
                <StatusBadge
                  status={invoiceData.status}
                  variant={getInvoiceStatusVariant(invoiceData.status)}
                />
              ),
            },
            { label: 'Branch Name', value: invoiceData.branch_name },
            { label: 'Billing Month', value: invoiceData.billing_month },
            { label: 'Amount', value: formatCurrency(invoiceData.amount), span: 2 },
            { label: 'Due Date', value: invoiceData.due_date },
            { label: 'Created Date', value: '2026-06-30' },
          ]}
        />
      </PageContentCard>

      <PageContentCard className="max-w-[720px]" title="Billing Contacts & Memo">
        <FieldGroup>
          <Field data-invalid={!!recipientError}>
            <FieldLabel htmlFor="recipient">Recipient Email</FieldLabel>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                if (recipientError) setRecipientError(null);
              }}
              disabled={saving}
              aria-invalid={!!recipientError}
              aria-describedby={recipientError ? 'recipient-error' : 'recipient-hint'}
            />
            {recipientError ? (
              <FieldDescription id="recipient-error" className="text-destructive">
                {recipientError}
              </FieldDescription>
            ) : (
              <FieldDescription id="recipient-hint">
                Primary billing contact for this invoice.
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="memo">Invoice Note / Memo</FieldLabel>
            <Textarea
              id="memo"
              rows={3}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={saving}
            />
          </Field>
          <div className="flex gap-2">
            <LoadingButton onClick={handleSave} loading={saving}>
              Save Memo
            </LoadingButton>
            <Button variant="outline" onClick={handleBack} disabled={saving}>
              Cancel
            </Button>
          </div>
        </FieldGroup>
      </PageContentCard>
    </DetailContainer>
  );
};

export default InvoiceDetailView;
