import React from 'react';
import { ConfigProvider, Spin } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import StaffManagement from './pages/StaffManagement';
import MyProfile from './pages/MyProfile';
import Login from './pages/Login';
import Error403 from './pages/Error403';
import Error404 from './pages/Error404';
import Error500 from './pages/Error500';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spin size="large" fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="profile" element={<MyProfile />} />
      <Route path="staff" element={<StaffManagement />} />
      <Route path="403" element={<Error403 />} />
      <Route path="500" element={<Error500 />} />
    </Route>
    <Route path="/404" element={<Error404 />} />
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes>
);

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563EB',
          colorSuccess: '#10B981',
          colorError: '#EF4444',
          colorWarning: '#F59E0B',
          colorInfo: '#3B82F6',
          fontFamily: "'Inter', 'Sarabun', sans-serif",
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
