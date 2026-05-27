import React from 'react';
import { Result, Button } from 'antd';

const Error500: React.FC = () => {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="500"
        title="500 Internal Server Error"
        subTitle="Something went wrong on our end. Please try again later."
        extra={<Button type="primary" onClick={() => window.location.reload()}>Try Again</Button>}
      />
    </div>
  );
};

export default Error500;
