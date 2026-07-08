import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Zero Platform",
  version: packageJson.version,
  copyright: `© ${currentYear}, Zero Platform.`,
  meta: {
    title: "Zero Platform — Backoffice",
    description:
      "Zero Platform backoffice for staff management, billing, agents, permissions, and operational reporting.",
  },
};
