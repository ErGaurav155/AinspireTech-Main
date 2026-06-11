export const ADMIN_OWNER_EMAIL = "gauravgkhaire155@gmail.com";

export const isAdminOwnerEmail = (email?: string | null) =>
  email?.toLowerCase() === ADMIN_OWNER_EMAIL;
