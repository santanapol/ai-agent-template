import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const Error403: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="403"
        title="403 Forbidden"
        subTitle="You don't have permission to access this page."
        extra={<Button type="primary" onClick={() => navigate(-1)}>Go Back</Button>}
      />
    </div>
  );
};

export default Error403;
