// Used by apps/marketing only
import type { Config } from "tailwindcss";
import { baseConfig } from "./base.config";

const marketingConfig: Partial<Config> = {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme?.extend,
      // Marketing specific overrides go here
      // e.g., larger hero font scales, landing-page gradients etc.
    },
  },
};

export default marketingConfig;
