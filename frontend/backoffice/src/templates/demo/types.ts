export type DemoMode =
  | 'dashboard'
  | 'invoices'
  | 'staff'
  | 'staff-detail'
  | 'agents'
  | 'agent-detail'
  | 'channel-performance'
  | 'campaign-detail'
  | 'smart-reports'
  | 'report-detail'
  | 'profile'
  | 'invoice-detail'
  | 'result';

export interface DemoViewProps {
  setDemoMode: (mode: DemoMode) => void;
  detailReturnMode: DemoMode;
  setDetailReturnMode: (mode: DemoMode) => void;
  selectedInvoiceCode: string;
  setSelectedInvoiceCode: (code: string) => void;
  selectedStaffId: number;
  setSelectedStaffId: (id: number) => void;
  selectedAgentId: number;
  setSelectedAgentId: (id: number) => void;
  selectedCampaignId: number;
  setSelectedCampaignId: (id: number) => void;
  selectedReportId: number;
  setSelectedReportId: (id: number) => void;
  subResultKey?: string;
}

export const openDetail = (
  props: Pick<DemoViewProps, 'setDemoMode' | 'setDetailReturnMode'>,
  detailMode: DemoMode,
  returnMode: DemoMode,
) => {
  props.setDetailReturnMode(returnMode);
  props.setDemoMode(detailMode);
};
