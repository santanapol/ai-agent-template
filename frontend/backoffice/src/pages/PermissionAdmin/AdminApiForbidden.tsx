import React from 'react';
import { Result } from 'antd';

interface AdminApiForbiddenProps {
  subTitle?: string;
}

/** Shown when an admin API returns 403 — reused by tab panels. */
const AdminApiForbidden: React.FC<AdminApiForbiddenProps> = ({
  subTitle = "You don't have permission to perform this action.",
}) => (
  <Result status="403" title="403 Forbidden" subTitle={subTitle} />
);

export default AdminApiForbidden;
