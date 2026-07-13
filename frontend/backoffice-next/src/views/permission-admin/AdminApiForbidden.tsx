import type React from "react";

import { ShieldX } from "lucide-react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

interface AdminApiForbiddenProps {
  subTitle?: string;
}

/** Shown when an admin API returns 403 — reused by tab panels. */
const AdminApiForbidden: React.FC<AdminApiForbiddenProps> = ({
  subTitle = "You don't have permission to perform this action.",
}) => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon" className="text-destructive">
        <ShieldX aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>403 Forbidden</EmptyTitle>
      <EmptyDescription>{subTitle}</EmptyDescription>
    </EmptyHeader>
  </Empty>
);

export default AdminApiForbidden;
