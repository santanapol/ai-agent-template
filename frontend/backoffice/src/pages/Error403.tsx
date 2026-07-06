import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResultTemplate } from '@/components/layout';

const Error403: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResultTemplate
      status="403"
      title="403 Forbidden"
      subTitle="You don't have permission to access this page."
      primaryActionText="Go to Dashboard"
      onPrimaryAction={() => navigate('/')}
    />
  );
};

export default Error403;
