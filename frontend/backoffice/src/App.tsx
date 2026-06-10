import React from 'react';
import { App as AntApp, ConfigProvider, Spin } from 'antd';
import thTH from 'antd/locale/th_TH';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import StaffManagement from './pages/StaffManagement';
import MyProfile from './pages/MyProfile';
import InvoiceList from './pages/Invoices';
import InvoiceDetail from './pages/Invoices/InvoiceDetail';
import AgentsList from './pages/Agents';
import AgentFeesPage from './pages/AgentFees';
import Login from './pages/Login';
import SmartReport from './pages/SmartReport';
import Error403 from './pages/Error403';

import Error404 from './pages/Error404';
import Error500 from './pages/Error500';
import RouteErrorPage from './components/RouteErrorPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const appTheme = {
  token: {
    colorPrimary: '#2563EB',
    colorSuccess: '#10B981',
    colorError: '#EF4444',
    colorWarning: '#F59E0B',
    colorInfo: '#3B82F6',
    fontFamily: "'Inter', 'Sarabun', sans-serif",
    borderRadius: 6,
    colorBgLayout: '#F9FAFB',
  },
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spin size="large" fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleGuard: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading) return <Spin size="large" fullscreen />;
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/403" replace />;
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
      { index: true, element: <Dashboard /> },
      { path: 'profile', element: <MyProfile /> },
      { path: 'invoices', element: <InvoiceList /> },
      { path: 'invoices/:id', element: <InvoiceDetail /> },
      { path: 'agents', element: <AgentsList /> },
      { path: 'agents/:id/fees', element: <AgentFeesPage /> },
      {
        path: 'staff',
        element: (
          <RoleGuard allowedRoles={['platform_admin', 'branch_admin']}>
            <StaffManagement />
          </RoleGuard>
        ),
      },
      { path: 'smart-reports', element: <SmartReport /> },
      { path: '403', element: <Error403 /> },

      { path: '500', element: <Error500 /> },
    ],
  },
  { path: '/404', element: <Error404 /> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);

const App: React.FC = () => {
  return (
    <ConfigProvider locale={thTH} theme={appTheme}>
      <AntApp>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
