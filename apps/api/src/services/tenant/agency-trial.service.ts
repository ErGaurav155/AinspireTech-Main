import { createHmac } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import AgencyTrialClaim from "@/models/tenant/AgencyTrialClaim.model";
import Agency from "@/models/tenant/Agency.model";
import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import User from "@/models/user.model";
import { permanentlyDeleteAgencyForOwner } from "@/services/tenant/agency-termination.service";
import { deleteUserData } from "@/services/user.service";

export const AGENCY_FREE_TRIAL_DAYS = 14;

const clerkNotFound = (error: any) =>
  Number(error?.status || error?.statusCode || error?.clerkError?.status) === 404;

export const agencyTrialIdentityHash = (email: string) => {
  const secret =
    process.env.AGENCY_TRIAL_HASH_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("Agency trial identity hashing is not configured");
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex");
};

export async function claimAgencyFreeTrial({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  await connectToDatabase();
  const identityHash = agencyTrialIdentityHash(email);
  const existing = await AgencyTrialClaim.findOne({ identityHash }).lean();
  if (existing) {
    return {
      eligible: existing.claimedByUserId === userId,
      identityHash,
      claimedAt: existing.claimedAt,
    };
  }

  try {
    const claim = await AgencyTrialClaim.create({
      identityHash,
      claimedByUserId: userId,
      claimedAt: new Date(),
    });
    return { eligible: true, identityHash, claimedAt: claim.claimedAt };
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const claim = await AgencyTrialClaim.findOne({ identityHash }).orFail();
    return {
      eligible: claim.claimedByUserId === userId,
      identityHash,
      claimedAt: claim.claimedAt,
    };
  }
}

export async function attachAgencyToTrialClaim({
  identityHash,
  agencyId,
}: {
  identityHash: string;
  agencyId: string;
}) {
  await AgencyTrialClaim.updateOne(
    { identityHash, firstAgencyId: { $exists: false } },
    { $set: { firstAgencyId: agencyId } },
  );
}

export async function markAgencyTrialConverted(agencyId: string) {
  await Agency.updateOne(
    { _id: agencyId, trialStatus: { $ne: "converted" } },
    { $set: { trialStatus: "converted" } },
  );
}

export async function backfillLegacyAgencyTrials(now = new Date()) {
  await connectToDatabase();
  const agencies = await Agency.find({
    trialStatus: { $exists: false },
    status: { $in: ["pending", "active"] },
  }).lean();
  let updated = 0;

  for (const agency of agencies) {
    const [owner, paid] = await Promise.all([
      User.findOne({ clerkId: agency.ownerUserId }).select("email").lean(),
      PlatformSubscription.exists({
        ownerType: "AGENCY",
        ownerId: agency._id,
        kind: "base",
        status: { $in: ["active", "trialing", "past_due"] },
      }),
    ]);
    if (paid) {
      await Agency.updateOne(
        { _id: agency._id, trialStatus: { $exists: false } },
        { $set: { trialStatus: "converted" } },
      );
      updated += 1;
      continue;
    }
    if (!owner?.email) continue;

    const claim = await claimAgencyFreeTrial({
      email: owner.email,
      userId: agency.ownerUserId,
    });
    const trialEndsAt = new Date(
      now.getTime() + AGENCY_FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );
    await Agency.updateOne(
      { _id: agency._id, trialStatus: { $exists: false } },
      {
        $set: {
          trialStatus: claim.eligible ? "active" : "ineligible",
          trialStartedAt: claim.eligible ? now : undefined,
          trialEndsAt: claim.eligible ? trialEndsAt : undefined,
          trialIdentityHash: claim.identityHash,
        },
      },
    );
    await attachAgencyToTrialClaim({
      identityHash: claim.identityHash,
      agencyId: String(agency._id),
    });
    updated += 1;
  }
  return updated;
}

export async function expireAgencyFreeTrials(now = new Date()) {
  await connectToDatabase();
  const agencies = await Agency.find({
    // `expired` records are included so a transient Clerk or database failure
    // cannot leave a suspended trial tenant permanently orphaned.
    trialStatus: { $in: ["active", "expired"] },
    trialEndsAt: { $lte: now },
    status: { $in: ["pending", "active", "suspended"] },
  }).lean();
  const result = { inspected: agencies.length, converted: 0, expired: 0, errors: [] as string[] };

  for (const agency of agencies) {
    const agencyId = String(agency._id);
    try {
      const paid = await PlatformSubscription.exists({
        ownerType: "AGENCY",
        ownerId: agency._id,
        kind: "base",
        status: { $in: ["active", "trialing", "past_due"] },
        $or: [
          { currentPeriodEnd: { $exists: false } },
          { currentPeriodEnd: null },
          { currentPeriodEnd: { $gt: now } },
        ],
      });
      if (paid) {
        await markAgencyTrialConverted(agencyId);
        result.converted += 1;
        continue;
      }

      await Agency.updateOne(
        { _id: agency._id, trialStatus: { $in: ["active", "expired"] } },
        { $set: { trialStatus: "expired", status: "suspended" } },
      );
      // Revoke the owner while the suspended Agency record still exists. If a
      // later cleanup step fails, the next cron run can still find and retry it.
      try {
        await clerkClient.users.deleteUser(agency.ownerUserId);
      } catch (error) {
        if (!clerkNotFound(error)) throw error;
      }
      await permanentlyDeleteAgencyForOwner({
        agencyId,
        ownerUserId: agency.ownerUserId,
      });
      await deleteUserData(agency.ownerUserId);
      await User.deleteOne({ clerkId: agency.ownerUserId });
      result.expired += 1;
    } catch (error) {
      result.errors.push(
        `${agencyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return result;
}
