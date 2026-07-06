import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ResultTemplate } from '@/components/layout';

const Error500: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResultTemplate
      status="500"
      title="500 Server Error"
      subTitle="Something went wrong on our end. Please try again later."
      primaryActionText="Go to Dashboard"
      onPrimaryAction={() => navigate('/')}
    />
  );
};

export default Error500;
