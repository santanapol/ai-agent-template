import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  User,
  LineChart,
  BarChart3,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { ThemeProvider } from '@/components/theme-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import LayoutDemo, { type DemoMode } from '@/templates/LayoutDemo';

function getSelectedMenuKey(
  demoMode: DemoMode,
  subResultKey: string,
  detailReturnMode: DemoMode,
): string {
  if (demoMode === 'result') return `result-${subResultKey}`;
  if (demoMode === 'staff-detail') return 'staff';
  if (demoMode === 'invoice-detail') return detailReturnMode === 'dashboard' ? 'dashboard' : 'invoices';
  if (demoMode === 'agent-detail') return 'agents';
  if (demoMode === 'campaign-detail') return 'channel-performance';
  if (demoMode === 'report-detail') return 'smart-reports';
  return demoMode;
}

function AppShell() {
  const { theme, setTheme } = useTheme();
  const [demoMode, setDemoMode] = useState<DemoMode>('dashboard');
  const [subResultKey, setSubResultKey] = useState('success');
  const [resultOpen, setResultOpen] = useState(true);
  const [selectedInvoiceCode, setSelectedInvoiceCode] = useState('IV-2026-003');
  const [detailReturnMode, setDetailReturnMode] = useState<DemoMode>('dashboard');

  const selectedKey = getSelectedMenuKey(demoMode, subResultKey, detailReturnMode);

  const navigate = (key: string) => {
    if (key.startsWith('result-')) {
      setDemoMode('result');
      setSubResultKey(key.replace('result-', ''));
      return;
    }
    setDemoMode(key as DemoMode);
  };

  const resultItems = [
    { key: 'result-success', label: 'Payment Success' },
    { key: 'result-403', label: 'Forbidden (403)' },
    { key: 'result-404', label: 'Not Found (404)' },
    { key: 'result-500', label: 'Server Error (500)' },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-12 items-center justify-center px-2 group-data-[collapsible=icon]:px-0">
            <span className="truncate text-lg font-bold text-primary group-data-[collapsible=icon]:hidden">
              Zero Platform
            </span>
            <span className="hidden text-lg font-bold text-primary group-data-[collapsible=icon]:inline">
              ZP
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedKey === 'dashboard'} onClick={() => navigate('dashboard')}>
                    <LayoutDashboard />
                    Dashboard
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedKey === 'invoices'} onClick={() => navigate('invoices')}>
                    <FileText />
                    Invoices Management
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedKey === 'staff'} onClick={() => navigate('staff')}>
                    <User />
                    Staff Management
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedKey === 'agents'} onClick={() => navigate('agents')}>
                    <Users />
                    Agents List
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedKey === 'channel-performance'} onClick={() => navigate('channel-performance')}>
                    <LineChart />
                    Channel Performance
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedKey === 'smart-reports'} onClick={() => navigate('smart-reports')}>
                    <BarChart3 />
                    Smart Reports
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={selectedKey === 'profile'} onClick={() => navigate('profile')}>
                    <User />
                    My Profile
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Collapsible open={resultOpen} onOpenChange={setResultOpen} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={<SidebarMenuButton isActive={selectedKey.startsWith('result-')} />}
                    >
                      <ShieldCheck />
                      Result / Error
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {resultItems.map((item) => (
                          <SidebarMenuSubItem key={item.key}>
                            <SidebarMenuSubButton
                              isActive={selectedKey === item.key}
                              onClick={() => navigate(item.key)}
                            >
                              {item.label}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-sticky flex h-16 items-center justify-between border-b bg-background px-6">
          <SidebarTrigger />
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        BA
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">Beer Admin</span>
                    <ChevronDown aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('profile')}>
                    <User />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LogOut />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 bg-background p-6">
          <LayoutDemo
            demoMode={demoMode}
            setDemoMode={setDemoMode}
            subResultKey={subResultKey}
            selectedInvoiceCode={selectedInvoiceCode}
            setSelectedInvoiceCode={setSelectedInvoiceCode}
            detailReturnMode={detailReturnMode}
            setDetailReturnMode={setDetailReturnMode}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppShell />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
