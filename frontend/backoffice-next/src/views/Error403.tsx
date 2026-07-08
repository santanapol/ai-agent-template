import type React from "react";

import { ResultTemplate } from "@/components/layout";
import { useNavigate } from "@/navigation/compat";

const Error403: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResultTemplate
      status="403"
      title="403 Forbidden"
      subTitle="You don't have permission to access this page."
      primaryActionText="Go to Dashboard"
      onPrimaryAction={() => navigate("/")}
    />
  );
};

export default Error403;
