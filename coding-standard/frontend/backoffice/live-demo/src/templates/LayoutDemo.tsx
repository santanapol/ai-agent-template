import React, { useState } from 'react';
import type { DemoMode } from './demo/types';
import DashboardView from './demo/views/DashboardView';
import InvoicesListView from './demo/views/InvoicesListView';
import StaffListView from './demo/views/StaffListView';
import StaffDetailView from './demo/views/StaffDetailView';
import AgentsListView from './demo/views/AgentsListView';
import AgentDetailView from './demo/views/AgentDetailView';
import ChannelPerformanceView from './demo/views/ChannelPerformanceView';
import CampaignDetailView from './demo/views/CampaignDetailView';
import SmartReportsView from './demo/views/SmartReportsView';
import ReportDetailView from './demo/views/ReportDetailView';
import MyProfileView from './demo/views/MyProfileView';
import InvoiceDetailView from './demo/views/InvoiceDetailView';
import ResultView from './demo/views/ResultView';
import { mockStaff, mockAgents, mockChannelPerformance, mockSmartReports } from './demo/mockData';

export type { DemoMode } from './demo/types';

interface LayoutDemoProps {
  demoMode: DemoMode;
  setDemoMode: (mode: DemoMode) => void;
  subResultKey?: string;
  selectedInvoiceCode: string;
  setSelectedInvoiceCode: (code: string) => void;
  detailReturnMode: DemoMode;
  setDetailReturnMode: (mode: DemoMode) => void;
}

const LayoutDemo: React.FC<LayoutDemoProps> = ({
  demoMode,
  setDemoMode,
  subResultKey = 'success',
  selectedInvoiceCode,
  setSelectedInvoiceCode,
  detailReturnMode,
  setDetailReturnMode,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState(mockStaff[0].id);
  const [selectedAgentId, setSelectedAgentId] = useState(mockAgents[0].id);
  const [selectedCampaignId, setSelectedCampaignId] = useState(mockChannelPerformance[0].id);
  const [selectedReportId, setSelectedReportId] = useState(mockSmartReports[0].id);

  const viewProps = {
    setDemoMode,
    detailReturnMode,
    setDetailReturnMode,
    selectedInvoiceCode,
    setSelectedInvoiceCode,
    selectedStaffId,
    setSelectedStaffId,
    selectedAgentId,
    setSelectedAgentId,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedReportId,
    setSelectedReportId,
    subResultKey,
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 24 }}>
      {demoMode === 'dashboard' && <DashboardView {...viewProps} />}
      {demoMode === 'invoices' && <InvoicesListView {...viewProps} />}
      {demoMode === 'staff' && <StaffListView {...viewProps} />}
      {demoMode === 'staff-detail' && <StaffDetailView {...viewProps} />}
      {demoMode === 'agents' && <AgentsListView {...viewProps} />}
      {demoMode === 'agent-detail' && <AgentDetailView {...viewProps} />}
      {demoMode === 'channel-performance' && <ChannelPerformanceView {...viewProps} />}
      {demoMode === 'campaign-detail' && <CampaignDetailView {...viewProps} />}
      {demoMode === 'smart-reports' && <SmartReportsView {...viewProps} />}
      {demoMode === 'report-detail' && <ReportDetailView {...viewProps} />}
      {demoMode === 'profile' && <MyProfileView {...viewProps} />}
      {demoMode === 'invoice-detail' && <InvoiceDetailView {...viewProps} />}
      {demoMode === 'result' && <ResultView {...viewProps} />}
    </div>
  );
};

export default LayoutDemo;
