import CallNumberPool from "@/models/call/CallNumberPool.model";

const normalize = (phone: string) => phone.replace(/\s+/g, "");

export const seedCallNumberPoolFromEnv = async () => {
  const numbers = (process.env.EXOTEL_FREE_POOL_NUMBERS || "")
    .split(",")
    .map((item) => normalize(item.trim()))
    .filter(Boolean);

  if (!numbers.length) return;

  await Promise.all(
    numbers.map((phoneNumber) =>
      CallNumberPool.updateOne(
        { phoneNumber },
        {
          $setOnInsert: {
            phoneNumber,
            label: "Shared free call assistant number",
            countryCode: "IN",
            type: "local",
            tier: "free_shared",
            status: "available",
          },
        },
        { upsert: true },
      ),
    ),
  );
};

export const leaseSharedNumber = async ({
  clerkId,
  callSid,
  minutes = 15,
}: {
  clerkId: string;
  callSid?: string;
  minutes?: number;
}) => {
  await seedCallNumberPoolFromEnv();

  const now = new Date();
  const expires = new Date(now.getTime() + minutes * 60 * 1000);

  return CallNumberPool.findOneAndUpdate(
    {
      tier: "free_shared",
      status: { $in: ["available", "leased"] },
      $or: [
        { assignedClerkId: clerkId },
        { assignedClerkId: { $exists: false } },
        { leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "leased",
        assignedClerkId: clerkId,
        activeCallSid: callSid,
        leaseExpiresAt: expires,
      },
    },
    { sort: { assignedClerkId: -1, updatedAt: 1 }, new: true },
  );
};

export const releaseSharedNumber = async (callSid: string) => {
  if (!callSid) return;

  await CallNumberPool.updateOne(
    { activeCallSid: callSid, tier: "free_shared" },
    {
      $set: { status: "available" },
      $unset: {
        assignedClerkId: "",
        activeCallSid: "",
        leaseExpiresAt: "",
      },
    },
  );
};

export const assignDedicatedNumber = async ({
  clerkId,
  phoneNumber,
}: {
  clerkId: string;
  phoneNumber: string;
}) =>
  CallNumberPool.findOneAndUpdate(
    {
      phoneNumber: normalize(phoneNumber),
      tier: "paid_dedicated",
      status: "available",
    },
    {
      $set: {
        status: "assigned",
        assignedClerkId: clerkId,
      },
    },
    { new: true },
  );
