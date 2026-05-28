import CallNumberPool from "@/models/call/CallNumberPool.model";

const normalize = (phone: string) => phone.replace(/\s+/g, "");

const splitNumbers = (value = "") =>
  value
    .split(",")
    .map((item) => normalize(item.trim()))
    .filter(Boolean);

export const seedCallNumberPoolFromEnv = async () => {
  const freeNumbers = splitNumbers(process.env.EXOTEL_FREE_POOL_NUMBERS || "");
  const paidNumbers = splitNumbers(
    process.env.EXOTEL_PAID_NUMBER_POOL_NUMBERS ||
      process.env.EXOTEL_DEDICATED_POOL_NUMBERS ||
      "",
  );

  if (!freeNumbers.length && !paidNumbers.length) return;

  await Promise.all(
    freeNumbers.map((phoneNumber) =>
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

  await Promise.all(
    paidNumbers.map((phoneNumber) =>
      CallNumberPool.updateOne(
        { phoneNumber },
        {
          $setOnInsert: {
            phoneNumber,
            label: "Dedicated call assistant number",
            countryCode: "IN",
            type: "local",
            tier: "paid_dedicated",
            status: "available",
          },
        },
        { upsert: true },
      ),
    ),
  );
};

export const listAvailableCallNumbers = async ({
  tier,
}: {
  tier: "free_shared" | "paid_dedicated";
}) => {
  await seedCallNumberPoolFromEnv();

  const now = new Date();
  await CallNumberPool.updateMany(
    {
      tier: "free_shared",
      status: "leased",
      leaseExpiresAt: { $lte: now },
    },
    {
      $set: { status: "available" },
      $unset: {
        assignedClerkId: "",
        activeCallSid: "",
        leaseExpiresAt: "",
      },
    },
  );

  return CallNumberPool.find({
    tier,
    status: "available",
  })
    .sort({ updatedAt: 1 })
    .lean();
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
}) => {
  await seedCallNumberPoolFromEnv();
  return CallNumberPool.findOneAndUpdate(
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
};

export const releaseDedicatedNumbersForClerk = async (clerkId: string) => {
  if (!clerkId) return;

  await CallNumberPool.updateMany(
    {
      assignedClerkId: clerkId,
      tier: "paid_dedicated",
      status: "assigned",
    },
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
