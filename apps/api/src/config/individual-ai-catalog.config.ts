export type IndividualAiService = "website" | "instagram" | "whatsapp";

// Individual Business AI allowances. These values are intentionally kept in
// one catalog so commercial changes do not require edits across product code.
export const INDIVIDUAL_AI_ALLOWANCES = {
  free: {
    website: 10_000,
  },
  standalone: {
    website: 2_000_000,
    instagram: 500_000,
    whatsapp: 750_000,
  },
  packages: {
    "package-starter": 2_500_000,
    "package-whatsapp": 3_000_000,
    "package-call": 3_000_000,
    "package-complete": 4_000_000,
  },
} as const;

export const PACKAGE_AI_SERVICES: Record<
  keyof typeof INDIVIDUAL_AI_ALLOWANCES.packages,
  IndividualAiService[]
> = {
  "package-starter": ["website", "instagram"],
  "package-whatsapp": ["website", "instagram", "whatsapp"],
  "package-call": ["website", "instagram"],
  "package-complete": ["website", "instagram", "whatsapp"],
};
