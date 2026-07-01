import React, { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import Error404 from '../pages/Error404';
import Error500 from '../pages/Error500';

const RouteErrorPage: React.FC = () => {
  const error = useRouteError();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error('Route error:', error);
    }
  }, [error]);

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <Error404 />;
  }

  return <Error500 />;
};

export default RouteErrorPage;
