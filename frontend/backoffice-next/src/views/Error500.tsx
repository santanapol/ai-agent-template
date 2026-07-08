import type React from "react";

import { ResultTemplate } from "@/components/layout";
import { useNavigate } from "@/navigation/compat";

const Error500: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResultTemplate
      status="500"
      title="500 Server Error"
      subTitle="Something went wrong on our end. Please try again later."
      primaryActionText="Go to Dashboard"
      onPrimaryAction={() => navigate("/")}
    />
  );
};

export default Error500;
