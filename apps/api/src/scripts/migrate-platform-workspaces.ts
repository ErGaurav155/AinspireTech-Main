import "dotenv/config";
import { Types } from "mongoose";
import { connectToDatabase, mongoose } from "@/config/database.config";
import PlatformSubscription from "@/models/billing/PlatformSubscription.model";
import PlanDefinition from "@/models/billing/PlanDefinition.model";
import CallAssistantWorkspace from "@/models/call/CallAssistantWorkspace.model";
import InstagramAiConversation from "@/models/insta/AiConversation.model";
import InstagramAccount from "@/models/insta/InstagramAccount.model";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import InstaReplyTemplate from "@/models/insta/ReplyTemplate.model";
import User from "@/models/user.model";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import WorkspaceService from "@/models/tenant/WorkspaceService.model";
import WorkspaceOnboarding from "@/models/tenant/WorkspaceOnboarding.model";

const MIGRATION_VERSION = "platform-workspaces-v1";
const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const shouldRollback = args.has("--rollback");

const safeSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "business";

const planDefinitions = [
  {
    code: "legacy-business-base",
    name: "Legacy Business Base",
    features: { clientLogin: true },
    limits: { teamMembers: 1 },
  },
  {
    code: "legacy-instagram",
    name: "Legacy Instagram Access",
    features: { instagram: true },
    limits: { instagramAccounts: 1, conversations: 0 },
  },
  {
    code: "legacy-website",
    name: "Legacy Website Access",
    features: { websiteChatbot: true },
    limits: { websiteChatbots: 1, aiTokens: 0 },
  },
  {
    code: "legacy-whatsapp",
    name: "Legacy WhatsApp Access",
    features: { whatsapp: true },
    limits: { whatsappAccounts: 1, conversations: 0 },
  },
  {
    code: "legacy-call",
    name: "Legacy Call Assistant Access",
    features: { callAssistant: true },
    limits: { callAssistants: 1 },
  },
] as const;

async function ensurePlans() {
  const plans = new Map<string, any>();
  for (const definition of planDefinitions) {
    const plan = await PlanDefinition.findOneAndUpdate(
      { code: definition.code, revision: 1 },
      {
        $setOnInsert: {
          name: definition.name,
          description: "Migration-only entitlement preserving existing access",
          accountType: "BUSINESS",
          kind: "legacy",
          billingInterval: "monthly",
          price: 0,
          currency: "INR",
          features: definition.features,
          limits: definition.limits,
          active: false,
        },
      },
      { upsert: true, new: true },
    );
    plans.set(definition.code, plan);
  }
  return plans;
}

async function attachWorkspaceId(
  model: { collection: { updateMany: Function } },
  ownerField: string,
  clerkId: string,
  workspaceId: Types.ObjectId,
) {
  return model.collection.updateMany(
    { [ownerField]: clerkId, workspaceId: { $exists: false } },
    { $set: { workspaceId } },
  );
}

async function servicePresence(clerkId: string) {
  const [instagram, website, whatsapp, call] = await Promise.all([
    Promise.all([
      InstagramAccount.exists({ userId: clerkId }),
      InstaReplyTemplate.exists({ userId: clerkId }),
      InstaReplyLog.exists({ userId: clerkId }),
      InstaLeadCollection.exists({ userId: clerkId }),
    ]).then((items) => items.some(Boolean)),
    Promise.all([
      WebChatbot.exists({ clerkId }),
      WebChatConversation.exists({ clerkId }),
    ]).then((items) => items.some(Boolean)),
    WhatsAppWorkspace.exists({ clerkId }).then(Boolean),
    CallAssistantWorkspace.exists({ clerkId }).then(Boolean),
  ]);
  return { instagram, website, whatsapp, call };
}

async function migrateUser(user: any, plans: Map<string, any>) {
  const clerkId = String(user.clerkId);
  const existing = await Workspace.findOne({ legacyOwnerClerkId: clerkId });
  if (existing && existing.migrationVersion !== MIGRATION_VERSION) {
    return { action: "skipped_conflict", clerkId, workspaceId: String(existing._id) };
  }
  const services = await servicePresence(clerkId);
  const workspaceId = existing?._id || new Types.ObjectId();
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    String(user.email).split("@")[0] ||
    "My Business";

  if (!shouldApply) {
    return { action: existing ? "would_resume" : "would_create", clerkId, services };
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Workspace.updateOne(
        { _id: workspaceId },
        {
          $setOnInsert: {
            name: displayName,
            slug: `${safeSlug(displayName)}-${workspaceId.toString().slice(-6)}`,
            ownerUserId: clerkId,
            ownerEmail: String(user.email).toLowerCase(),
            status: "active",
            billingOwnerType: "WORKSPACE",
            billingOwnerId: workspaceId,
            legacyOwnerClerkId: clerkId,
          },
          $set: { migrationVersion: MIGRATION_VERSION },
        },
        { upsert: true, session },
      );
      await WorkspaceMember.updateOne(
        { workspaceId, userId: clerkId },
        {
          $set: { role: "CLIENT_OWNER", status: "active" },
          $setOnInsert: { permissions: [], deniedPermissions: [] },
        },
        { upsert: true, session },
      );
      const enabledServices = [
        services.instagram ? "INSTAGRAM" : null,
        services.website ? "WEBSITE" : null,
        services.whatsapp ? "WHATSAPP" : null,
        services.call ? "CALL" : null,
      ].filter(Boolean) as string[];
      for (const service of enabledServices) {
        await WorkspaceService.updateOne(
          { workspaceId, service },
          {
            $setOnInsert: {
              enabled: true,
              setupStatus: "in_progress",
              configuredBy: "migration",
              metadata: { migrationVersion: MIGRATION_VERSION },
            },
          },
          { upsert: true, session },
        );
      }
      await WorkspaceOnboarding.updateOne(
        { workspaceId },
        {
          $setOnInsert: {
            status: enabledServices.length ? "in_progress" : "not_started",
            steps: [
              { code: "client_account", status: "complete", completedAt: new Date() },
              { code: "business_information", status: "warning", message: "Review migrated business details" },
            ],
            serviceStates: enabledServices.map((service) => ({
              service,
              status: "in_progress",
              updatedAt: new Date(),
            })),
          },
        },
        { upsert: true, session },
      );

      const planCodes = [
        "legacy-business-base",
        services.instagram ? "legacy-instagram" : null,
        services.website ? "legacy-website" : null,
        services.whatsapp ? "legacy-whatsapp" : null,
        services.call ? "legacy-call" : null,
      ].filter(Boolean) as string[];
      for (const planCode of planCodes) {
        const plan = plans.get(planCode);
        await PlatformSubscription.updateOne(
          {
            "legacySource.model": "WorkspaceMigration",
            "legacySource.id": `${workspaceId}:${planCode}`,
          },
          {
            $setOnInsert: {
              ownerType: "WORKSPACE",
              ownerId: workspaceId,
              kind: "legacy",
              planId: plan._id,
              planCode,
              planRevision: 1,
              provider: "legacy",
              status: "active",
              billingInterval: "monthly",
              cancelAtPeriodEnd: false,
              entitlementSnapshot: {
                features: plan.features,
                limits: {
                  ...(plan.limits instanceof Map
                    ? Object.fromEntries(plan.limits.entries())
                    : plan.limits),
                  ...(planCode === "legacy-instagram"
                    ? {
                        instagramAccounts: Math.max(1, Number(user.accountLimit || 1)),
                        conversations: Math.max(0, Number(user.replyLimit || 0)),
                      }
                    : {}),
                },
              },
              legacySource: {
                model: "WorkspaceMigration",
                id: `${workspaceId}:${planCode}`,
              },
            },
          },
          { upsert: true, session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  await Promise.all([
    attachWorkspaceId(InstagramAccount, "userId", clerkId, workspaceId),
    attachWorkspaceId(InstaReplyTemplate, "userId", clerkId, workspaceId),
    attachWorkspaceId(InstaReplyLog, "userId", clerkId, workspaceId),
    attachWorkspaceId(InstaLeadCollection, "userId", clerkId, workspaceId),
    attachWorkspaceId(InstagramAiConversation, "clerkId", clerkId, workspaceId),
    attachWorkspaceId(WebChatbot, "clerkId", clerkId, workspaceId),
    attachWorkspaceId(WebChatConversation, "clerkId", clerkId, workspaceId),
    attachWorkspaceId(WhatsAppWorkspace, "clerkId", clerkId, workspaceId),
    attachWorkspaceId(CallAssistantWorkspace, "clerkId", clerkId, workspaceId),
  ]);
  return { action: existing ? "resumed" : "created", clerkId, workspaceId: String(workspaceId), services };
}

async function rollback() {
  const workspaces = await Workspace.find({ migrationVersion: MIGRATION_VERSION }).lean();
  if (!shouldApply) {
    console.info(JSON.stringify({ mode: "rollback-dry-run", workspaces: workspaces.length }, null, 2));
    return;
  }
  for (const workspace of workspaces) {
    const workspaceId = workspace._id;
    await Promise.all([
      InstagramAccount.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      InstaReplyTemplate.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      InstaReplyLog.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      InstaLeadCollection.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      InstagramAiConversation.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      WebChatbot.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      WebChatConversation.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      WhatsAppWorkspace.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      CallAssistantWorkspace.collection.updateMany({ workspaceId }, { $unset: { workspaceId: "" } }),
      WorkspaceService.deleteMany({ workspaceId }),
      WorkspaceMember.deleteMany({ workspaceId }),
      WorkspaceOnboarding.deleteMany({ workspaceId }),
      PlatformSubscription.deleteMany({
        "legacySource.model": "WorkspaceMigration",
        "legacySource.id": { $regex: `^${workspaceId}:` },
      }),
    ]);
    await Workspace.deleteOne({ _id: workspaceId, migrationVersion: MIGRATION_VERSION });
  }
  console.info(JSON.stringify({ mode: "rollback-applied", workspaces: workspaces.length }, null, 2));
}

async function main() {
  await connectToDatabase();
  if (shouldRollback) return rollback();
  const plans = shouldApply ? await ensurePlans() : new Map<string, any>();
  const users = await User.find({ clerkId: { $exists: true, $ne: "" } }).sort({ _id: 1 }).lean();
  const results = [];
  for (const user of users) results.push(await migrateUser(user, plans));
  console.info(
    JSON.stringify(
      {
        mode: shouldApply ? "apply" : "dry-run",
        migrationVersion: MIGRATION_VERSION,
        users: users.length,
        results,
        warning:
          "Legacy Appointment records have no owner identifier and are intentionally not assigned.",
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
