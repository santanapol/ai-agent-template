import React from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import thTH from 'antd/locale/th_TH';
import BmiCalculator from './pages/BmiCalculator';

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

const App: React.FC = () => (
  <ConfigProvider locale={thTH} theme={appTheme}>
    <AntApp>
      <BmiCalculator />
    </AntApp>
  </ConfigProvider>
);

export default App;
