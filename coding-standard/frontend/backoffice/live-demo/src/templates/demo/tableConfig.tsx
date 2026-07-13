import React from 'react';
import { Empty } from 'antd';

export const TABLE_SCROLL = { x: 'max-content' as const };

export const tableLocale = {
  emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data found" />,
};

/** Simulates initial table loading for demo pages. */
export const useDemoTableLoading = (delayMs = 300) => {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);
  return loading;
};
