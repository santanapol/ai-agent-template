import React, { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ResultTemplate } from '@/components/layout';
import Error404 from '../pages/Error404';
import Error500 from '../pages/Error500';

function isChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /ChunkLoadError|Loading chunk [\d]+ failed|failed to fetch dynamically imported module/i.test(
    error.message,
  );
}

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

  if (isChunkError(error)) {
    return (
      <ResultTemplate
        status="500"
        title="Application update required"
        subTitle="This page failed to load a code-split chunk. Reload the page to fetch the latest assets."
        primaryActionText="Reload page"
        onPrimaryAction={() => window.location.reload()}
      />
    );
  }

  return <Error500 />;
};

export default RouteErrorPage;
