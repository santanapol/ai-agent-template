import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResultTemplate } from '@/components/layout';

const Error404: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResultTemplate
      status="404"
      title="404 Not Found"
      subTitle="The page you are looking for does not exist."
      primaryActionText="Go to Dashboard"
      onPrimaryAction={() => navigate('/')}
    />
  );
};

export default Error404;
