import { isAdminOwnerEmail } from "@/lib/admin-owner";

const splitIds = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const isCallAssistantAdmin = ({
  userId,
  email,
}: {
  userId?: string | null;
  email?: string | null;
}) => {
  const adminIds = splitIds(
    process.env.NEXT_PUBLIC_CALL_ASSISTANT_ADMIN_IDS ||
      process.env.NEXT_PUBLIC_OWNERID ||
      "",
  );

  return Boolean(
    (userId && adminIds.includes(userId)) || isAdminOwnerEmail(email),
  );
};

export const CALL_ASSISTANT_COMING_SOON_TEXT =
  "Coming soon";
