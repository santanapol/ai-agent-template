import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGuard } from '@/components/PermissionGuard';
import RouteErrorPage from '@/components/RouteErrorPage';
import { ConfirmDialogProvider } from '@/hooks/useConfirmDialog';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AdminLayout from '@/layouts/AdminLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MyProfile from '@/pages/MyProfile';
import InvoiceList from '@/pages/Invoices';
import InvoiceDetail from '@/pages/Invoices/InvoiceDetail';
import AgentsList from '@/pages/Agents';
import AgentFeesPage from '@/pages/AgentFees';
import StaffManagement from '@/pages/StaffManagement';
import SmartReport from '@/pages/SmartReport';
import ChannelPerformancePage from '@/pages/branch-report/marketing/ChannelPerformancePage';
import PermissionAdmin from '@/pages/PermissionAdmin';
import Error403 from '@/pages/Error403';
import Error404 from '@/pages/Error404';
import Error500 from '@/pages/Error500';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: (
          <PermissionGuard required="dashboard:view">
            <Dashboard />
          </PermissionGuard>
        ),
      },
      {
        path: 'profile',
        element: (
          <PermissionGuard required="my_profile">
            <MyProfile />
          </PermissionGuard>
        ),
      },
      {
        path: 'invoices',
        element: (
          <PermissionGuard required="invoices:list">
            <InvoiceList />
          </PermissionGuard>
        ),
      },
      {
        path: 'invoices/:id',
        element: (
          <PermissionGuard required="invoices:read">
            <InvoiceDetail />
          </PermissionGuard>
        ),
      },
      {
        path: 'agents',
        element: (
          <PermissionGuard required="agents:list">
            <AgentsList />
          </PermissionGuard>
        ),
      },
      {
        path: 'agents/:id/fees',
        element: (
          <PermissionGuard required="agents:fees">
            <AgentFeesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'staff',
        element: (
          <PermissionGuard required="profiles:list">
            <StaffManagement />
          </PermissionGuard>
        ),
      },
      {
        path: 'smart-reports',
        element: (
          <PermissionGuard required="reports:smart">
            <SmartReport />
          </PermissionGuard>
        ),
      },
      {
        path: 'branch-report/marketing/channel-performance',
        element: (
          <PermissionGuard required="branch-report:marketing:channel-performance:read">
            <ChannelPerformancePage />
          </PermissionGuard>
        ),
      },
      {
        path: 'permissions',
        element: (
          <PermissionGuard required="permissions:manage">
            <PermissionAdmin />
          </PermissionGuard>
        ),
      },
      { path: '403', element: <Error403 /> },
      { path: '500', element: <Error500 /> },
    ],
  },
  { path: '/404', element: <Error404 /> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <ConfirmDialogProvider>
            <RouterProvider router={router} />
            <Toaster richColors closeButton />
          </ConfirmDialogProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;
