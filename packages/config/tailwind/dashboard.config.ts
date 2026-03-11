// Used by BOTH apps/dashboard AND apps/admin
// Content paths are set in each app's own tailwind.config.ts
import type { Config } from "tailwindcss";
import { baseConfig } from "./base.config";

const dashboardConfig: Partial<Config> = {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,
      // Dashboard/Admin specific overrides go here
    },
  },
};

export default dashboardConfig;
