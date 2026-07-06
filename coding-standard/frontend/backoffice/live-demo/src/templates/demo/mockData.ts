export const ROLE_OPTIONS = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'branch_admin', label: 'Branch Admin' },
  { value: 'support_admin', label: 'Support Admin' },
  { value: 'support', label: 'Support' },
  { value: 'staff', label: 'Staff' },
] as const;

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map(({ value, label }) => [value, label])
);

export const mockInvoices = [
  { id: 1, iv_no: 'IV-2026-001', branch_name: 'Bangkok Central', billing_month: '2026-06', amount: 45000.0, due_date: '2026-07-15', status: 'PAID' },
  { id: 2, iv_no: 'IV-2026-002', branch_name: 'Chiang Mai North', billing_month: '2026-06', amount: 89000.0, due_date: '2026-07-15', status: 'PENDING' },
  { id: 3, iv_no: 'IV-2026-003', branch_name: 'Korat Gateway', billing_month: '2026-05', amount: 120000.0, due_date: '2026-06-15', status: 'ERROR' },
  { id: 4, iv_no: 'IV-2026-004', branch_name: 'Phuket Beach', billing_month: '2026-06', amount: 67500.0, due_date: '2026-07-15', status: 'PAID' },
];

export const mockStaff = [
  { id: 1, code: 'EMP-001', firstname: 'John', lastname: 'Doe', email: 'john@example.com', tel: '0812345678', username: 'john_doe', active: true, role: 'staff' },
  { id: 2, code: 'EMP-002', firstname: 'Jane', lastname: 'Smith', email: 'jane@example.com', tel: '0823456789', username: 'jane_smith', active: true, role: 'branch_admin' },
  { id: 3, code: 'EMP-003', firstname: 'Somchai', lastname: 'Rakthai', email: 'somchai@example.com', tel: '0834567890', username: 'somchai_r', active: false, role: 'support' },
  { id: 4, code: 'EMP-004', firstname: 'Beer', lastname: 'Admin', email: 'beer@example.com', tel: '0845678901', username: 'beer_admin', active: true, role: 'platform_admin' },
];

export const mockAgents = [
  { id: 1, agent_code: 'AGT-001', agent_name: 'Bangkok Premium Agency', contact_name: 'Somsak W.', email: 'contact@bpa.co.th', tel: '021234567', branch_count: 12, status: 'ACTIVE', commission_rate: 8.5 },
  { id: 2, agent_code: 'AGT-002', agent_name: 'Northern Partners Co.', contact_name: 'Malee K.', email: 'info@northpartners.co.th', tel: '053987654', branch_count: 5, status: 'ACTIVE', commission_rate: 7.0 },
  { id: 3, agent_code: 'AGT-003', agent_name: 'Isan Gateway Group', contact_name: 'Prasit T.', email: 'ops@isangateway.com', tel: '044112233', branch_count: 3, status: 'SUSPENDED', commission_rate: 6.5 },
  { id: 4, agent_code: 'AGT-004', agent_name: 'Southern Elite Network', contact_name: 'Nicha P.', email: 'hello@southernelite.co.th', tel: '076554433', branch_count: 8, status: 'ACTIVE', commission_rate: 9.0 },
];

export const mockChannelPerformance = [
  { id: 1, campaign_name: 'Summer Promo 2026', channel: 'Facebook Ads', impressions: 125000, clicks: 4200, conversions: 312, spend: 85000, roi: 2.4 },
  { id: 2, campaign_name: 'Branch Onboarding Q2', channel: 'Google Ads', impressions: 98000, clicks: 3100, conversions: 198, spend: 62000, roi: 1.9 },
  { id: 3, campaign_name: 'Loyalty Reactivation', channel: 'LINE OA', impressions: 54000, clicks: 2800, conversions: 421, spend: 28000, roi: 3.1 },
  { id: 4, campaign_name: 'Partner Referral Drive', channel: 'Email', impressions: 22000, clicks: 1900, conversions: 156, spend: 12000, roi: 2.7 },
];

export const mockSmartReports = [
  { id: 1, report_code: 'SR-2026-06', report_name: 'Monthly Commission Summary', billing_month: '2026-06', total_revenue: 2540000, total_commission: 203200, net_profit: 1850000, status: 'COMPLETED', generated_at: '2026-07-01 08:30:00' },
  { id: 2, report_code: 'SR-2026-05', report_name: 'Branch Revenue Breakdown', billing_month: '2026-05', total_revenue: 2180000, total_commission: 174400, net_profit: 1590000, status: 'COMPLETED', generated_at: '2026-06-01 09:15:00' },
  { id: 3, report_code: 'SR-2026-06-P', report_name: 'Pending Settlement Preview', billing_month: '2026-06', total_revenue: 890000, total_commission: 71200, net_profit: 640000, status: 'PROCESSING', generated_at: '2026-07-01 14:00:00' },
  { id: 4, report_code: 'SR-2026-04', report_name: 'Agent Payout Reconciliation', billing_month: '2026-04', total_revenue: 1920000, total_commission: 153600, net_profit: 1410000, status: 'FAILED', generated_at: '2026-05-01 07:45:00' },
];

export const mockReportLineItems = [
  { id: 1, report_id: 1, branch_name: 'Bangkok Central', revenue: 980000, commission: 78400, net_profit: 720000 },
  { id: 2, report_id: 1, branch_name: 'Chiang Mai North', revenue: 620000, commission: 49600, net_profit: 450000 },
  { id: 3, report_id: 1, branch_name: 'Korat Gateway', revenue: 540000, commission: 43200, net_profit: 380000 },
  { id: 4, report_id: 1, branch_name: 'Phuket Beach', revenue: 400000, commission: 32000, net_profit: 300000 },
];

export const mockCampaignDailyStats = [
  { id: 1, campaign_id: 1, date: '2026-06-01', impressions: 4200, clicks: 140, conversions: 11, spend: 2800 },
  { id: 2, campaign_id: 1, date: '2026-06-02', impressions: 5100, clicks: 168, conversions: 13, spend: 3200 },
  { id: 3, campaign_id: 1, date: '2026-06-03', impressions: 4800, clicks: 155, conversions: 10, spend: 2950 },
  { id: 4, campaign_id: 1, date: '2026-06-04', impressions: 5300, clicks: 172, conversions: 14, spend: 3400 },
];

export const currentUser = {
  code: 'EMP-004',
  firstname: 'Beer',
  lastname: 'Admin',
  email: 'beer@example.com',
  tel: '0845678901',
  username: 'beer_admin',
  role: 'platform_admin',
};
