import type React from "react";

import { ResultTemplate } from "@/components/layout";
import { useNavigate } from "@/navigation/compat";

const Error404: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResultTemplate
      status="404"
      title="404 Not Found"
      subTitle="The page you are looking for does not exist."
      primaryActionText="Go to Dashboard"
      onPrimaryAction={() => navigate("/")}
    />
  );
};

export default Error404;
