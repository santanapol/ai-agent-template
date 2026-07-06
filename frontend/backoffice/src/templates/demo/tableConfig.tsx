import React from 'react';

export const useDemoTableLoading = (delayMs = 300) => {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  return loading;
};
