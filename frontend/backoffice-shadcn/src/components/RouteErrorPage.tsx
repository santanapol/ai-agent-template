import React, { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import Error500 from '../pages/Error500';

const RouteErrorPage: React.FC = () => {
  const error = useRouteError();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error('Route error:', error);
    }
  }, [error]);

  return <Error500 />;
};

export default RouteErrorPage;
