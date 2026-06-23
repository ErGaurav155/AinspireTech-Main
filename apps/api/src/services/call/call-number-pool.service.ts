import CallNumberPool from "@/models/call/CallNumberPool.model";

export const normalizeCallNumber = (phone = "") =>
  phone.replace(/[^\d+]/g, "").trim();

const phoneLookupCandidates = (phone = "") => {
  const normalized = normalizeCallNumber(phone);
  const withoutPlus = normalized.replace(/^\+/, "");
  const withoutLeadingZero =
    withoutPlus.length === 11 && withoutPlus.startsWith("0")
      ? withoutPlus.slice(1)
      : withoutPlus;
  const withoutIndiaCode = withoutPlus.startsWith("91")
    ? withoutPlus.slice(2)
    : withoutPlus;
  const withIndiaCode =
    withoutLeadingZero.length === 10 ? `91${withoutLeadingZero}` : "";
  const withPlusIndiaCode = withIndiaCode ? `+${withIndiaCode}` : "";

  return Array.from(
    new Set(
      [
        normalized,
        withoutPlus,
        withoutLeadingZero,
        withoutIndiaCode,
        withIndiaCode,
        withPlusIndiaCode,
      ]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

const splitNumbers = (value = "") =>
  value
    .split(",")
    .map((item) => normalizeCallNumber(item.trim()))
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

export const getAssignedDedicatedNumberForClerk = async (clerkId: string) => {
  if (!clerkId) return null;
  await seedCallNumberPoolFromEnv();

  return CallNumberPool.findOne({
    assignedClerkId: clerkId,
    tier: "paid_dedicated",
    status: "assigned",
  }).lean();
};

export const assignNextDedicatedNumber = async (clerkId: string) => {
  if (!clerkId) return null;
  await seedCallNumberPoolFromEnv();

  const existing = await CallNumberPool.findOne({
    assignedClerkId: clerkId,
    tier: "paid_dedicated",
    status: "assigned",
  });

  if (existing) return existing;

  return CallNumberPool.findOneAndUpdate(
    {
      tier: "paid_dedicated",
      status: "available",
    },
    {
      $set: {
        status: "assigned",
        assignedClerkId: clerkId,
      },
    },
    { sort: { updatedAt: 1 }, new: true },
  );
};

export const findAssignedDedicatedNumberByPhone = async (phoneNumber: string) => {
  const candidates = phoneLookupCandidates(phoneNumber);
  if (!candidates.length) return null;

  await seedCallNumberPoolFromEnv();

  return CallNumberPool.findOne({
    phoneNumber: { $in: candidates },
    tier: "paid_dedicated",
    status: "assigned",
  }).lean();
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
      phoneNumber: normalizeCallNumber(phoneNumber),
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
