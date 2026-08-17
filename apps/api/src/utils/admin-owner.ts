let warnedAboutMissingOwnerId = false;

export const getAdminOwnerIds = () => {
  const configured = (process.env.OWNERID || "")
    .split(",")
    .map((ownerId) => ownerId.trim())
    .filter(Boolean);

  if (configured.length === 0 && !warnedAboutMissingOwnerId) {
    warnedAboutMissingOwnerId = true;
    console.warn("OWNERID is not configured; all admin access will be denied.");
  }

  return new Set(configured);
};

export const isAdminOwnerId = (userId?: string | null) =>
  Boolean(userId && getAdminOwnerIds().has(userId.trim()));
