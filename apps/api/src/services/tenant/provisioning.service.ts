import { clerkClient } from "@clerk/express";
import { Types } from "mongoose";
import type {
  EntitlementFeature,
  PlatformService,
} from "@rocketreplai/shared/platform";
import { connectToDatabase, mongoose } from "@/config/database.config";
import Agency from "@/models/tenant/Agency.model";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import ProvisioningOperation from "@/models/tenant/ProvisioningOperation.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceOnboarding from "@/models/tenant/WorkspaceOnboarding.model";
import WorkspaceService from "@/models/tenant/WorkspaceService.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import UsageCounter from "@/models/usage/UsageCounter.model";
import User from "@/models/user.model";
import { entitlementService } from "@/services/billing/entitlement.service";
import { PLATFORM_URLS } from "@/config/platform-catalog.config";

const SERVICE_FEATURE: Record<PlatformService, EntitlementFeature> = {
  WHATSAPP: "whatsapp",
  INSTAGRAM: "instagram",
  WEBSITE: "websiteChatbot",
  CALL: "callAssistant",
};

const WORKSPACE_AGENCY_PERMISSIONS = [
  "workspace.view",
  "workspace.manage",
  "automation.view",
  "automation.manage",
  "leads.view",
  "conversations.view",
  "conversations.manage",
  "appointments.view",
  "appointments.manage",
  "integrations.view",
  "integrations.manage",
  "analytics.view",
] as const;

const safeSlug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "workspace";

const operationKey = (operation: string, userId: string, key: string) =>
  `${operation}:${userId}:${key}`;

const externalError = (error: unknown) =>
  error instanceof Error ? error.message.slice(0, 1900) : "External provisioning failed";

async function provisionClerkOrganization({
  name,
  slug,
  createdBy,
  privateMetadata,
}: {
  name: string;
  slug: string;
  createdBy: string;
  privateMetadata: Record<string, string>;
}) {
  try {
    return await clerkClient.organizations.createOrganization({
      name,
      slug,
      createdBy,
      privateMetadata,
    });
  } catch (error: any) {
    const status = Number(error?.status || error?.statusCode || 0);
    if (status !== 409 && !String(error?.message || "").toLowerCase().includes("slug")) {
      throw error;
    }
    const existing = await clerkClient.organizations.getOrganization({ slug });
    const existingMetadata = existing.privateMetadata as Record<string, unknown>;
    const expected = Object.entries(privateMetadata).every(
      ([key, value]) => existingMetadata?.[key] === value,
    );
    if (!expected) throw error;
    return existing;
  }
}

export interface CreateAgencyInput {
  name: string;
  idempotencyKey: string;
}

export interface CreateBusinessWorkspaceInput {
  name: string;
  idempotencyKey: string;
  phone?: string;
  businessInformation?: Record<string, unknown>;
  services: PlatformService[];
}

export interface CreateClientWorkspaceInput {
  agencyId: string;
  requestedBy: string;
  idempotencyKey: string;
  businessName: string;
  ownerContactName?: string;
  ownerEmail: string;
  phone?: string;
  businessInformation?: Record<string, unknown>;
  services: PlatformService[];
  sendInvitation: boolean;
}

export class ProvisioningService {
  async createBusinessWorkspace(userId: string, input: CreateBusinessWorkspaceInput) {
    await connectToDatabase();
    const alreadyOwned = await Workspace.findOne({
      $or: [{ ownerUserId: userId }, { legacyOwnerClerkId: userId }],
      agencyId: { $exists: false },
      status: { $ne: "archived" },
    }).lean();
    if (alreadyOwned) return alreadyOwned;

    const user = await User.findOne({ clerkId: userId }).lean();
    if (!user?.email) throw new Error("User profile must exist before creating a workspace");
    const idempotencyKey = operationKey(
      "CREATE_BUSINESS_WORKSPACE",
      userId,
      input.idempotencyKey,
    );
    const existingOperation = await ProvisioningOperation.findOne({ idempotencyKey });
    if (existingOperation?.workspaceId) {
      const workspace = await Workspace.findById(existingOperation.workspaceId).lean();
      if (workspace && existingOperation.status === "complete") return workspace;
      if (workspace) {
        return this.finishBusinessProvisioning(workspace._id, existingOperation._id, userId);
      }
    }

    const workspaceId = new Types.ObjectId();
    const slug = `${safeSlug(input.name)}-${workspaceId.toString().slice(-6)}`;
    const now = new Date();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Workspace.create(
          [{
            _id: workspaceId,
            name: input.name,
            slug,
            ownerUserId: userId,
            ownerEmail: user.email.toLowerCase(),
            ownerContactName: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
            phone: input.phone,
            businessInformation: input.businessInformation || {},
            status: "pending",
            billingOwnerType: "WORKSPACE",
            billingOwnerId: workspaceId,
          }],
          { session },
        );
        await WorkspaceMember.create(
          [{ workspaceId, userId, role: "CLIENT_OWNER", status: "active" }],
          { session },
        );
        if (input.services.length) {
          await WorkspaceService.insertMany(
            input.services.map((service) => ({
              workspaceId,
              service,
              enabled: true,
              setupStatus: "not_started",
              configuredBy: userId,
            })),
            { session },
          );
        }
        await WorkspaceOnboarding.create(
          [{
            workspaceId,
            status: "in_progress",
            steps: [
              { code: "client_account", status: "complete", completedAt: now },
              { code: "business_information", status: "complete", completedAt: now },
              { code: "plan_selection", status: "pending" },
            ],
            serviceStates: input.services.map((service) => ({
              service,
              status: "not_started",
              updatedAt: now,
            })),
          }],
          { session },
        );
        await ProvisioningOperation.create(
          [{
            idempotencyKey,
            operation: "CREATE_BUSINESS_WORKSPACE",
            workspaceId,
            requestedBy: userId,
            status: "pending",
            completedSteps: ["local_workspace_created"],
          }],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    const operation = await ProvisioningOperation.findOne({ idempotencyKey }).orFail();
    return this.finishBusinessProvisioning(workspaceId, operation._id, userId);
  }

  private async finishBusinessProvisioning(
    workspaceId: Types.ObjectId,
    operationId: Types.ObjectId,
    userId: string,
  ) {
    const workspace = await Workspace.findById(workspaceId).orFail();
    const operation = await ProvisioningOperation.findById(operationId).orFail();
    operation.status = "processing";
    operation.attempts += 1;
    await operation.save();
    try {
      const organization = workspace.clerkOrganizationId
        ? await clerkClient.organizations.getOrganization({ organizationId: workspace.clerkOrganizationId })
        : await provisionClerkOrganization({
            name: workspace.name,
            slug: `business-${workspace.slug}`.slice(0, 100),
            createdBy: userId,
            privateMetadata: { platformWorkspaceId: workspaceId.toString() },
          });
      workspace.clerkOrganizationId = organization.id;
      workspace.status = "active";
      await workspace.save();
      operation.clerkOrganizationId = organization.id;
      operation.status = "complete";
      operation.completedSteps = [
        ...new Set([...operation.completedSteps, "clerk_organization_created", "workspace_activated"]),
      ];
      operation.lastError = undefined;
      operation.nextRetryAt = undefined;
      await operation.save();
      return workspace.toObject();
    } catch (error) {
      operation.status = "failed";
      operation.lastError = externalError(error);
      operation.nextRetryAt = new Date(Date.now() + 60_000);
      await operation.save();
      throw error;
    }
  }

  async createAgency(userId: string, input: CreateAgencyInput) {
    await connectToDatabase();
    const idempotencyKey = operationKey(
      "CREATE_AGENCY",
      userId,
      input.idempotencyKey,
    );
    const existingOperation = await ProvisioningOperation.findOne({ idempotencyKey });
    if (existingOperation?.agencyId) {
      const agency = await Agency.findById(existingOperation.agencyId).lean();
      if (agency && existingOperation.status === "complete") return agency;
      if (agency && ["pending", "failed"].includes(existingOperation.status)) {
        return this.finishAgencyProvisioning(agency._id, existingOperation._id, userId);
      }
    }

    const agencyId = new Types.ObjectId();
    const slug = `${safeSlug(input.name)}-${agencyId.toString().slice(-6)}`;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Agency.create(
          [{ _id: agencyId, name: input.name, slug, ownerUserId: userId, status: "pending" }],
          { session },
        );
        await AgencyMember.create(
          [{ agencyId, userId, role: "AGENCY_OWNER", status: "active" }],
          { session },
        );
        await ProvisioningOperation.create(
          [{
            idempotencyKey,
            operation: "CREATE_AGENCY",
            agencyId,
            requestedBy: userId,
            status: "pending",
            completedSteps: ["local_agency_created"],
          }],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    const operation = await ProvisioningOperation.findOne({ idempotencyKey }).orFail();
    return this.finishAgencyProvisioning(agencyId, operation._id, userId);
  }

  private async finishAgencyProvisioning(
    agencyId: Types.ObjectId,
    operationId: Types.ObjectId,
    userId: string,
  ) {
    const agency = await Agency.findById(agencyId).orFail();
    const operation = await ProvisioningOperation.findById(operationId).orFail();
    operation.status = "processing";
    operation.attempts += 1;
    await operation.save();

    try {
      const organization = agency.clerkOrganizationId
        ? await clerkClient.organizations.getOrganization({
            organizationId: agency.clerkOrganizationId,
          })
        : await provisionClerkOrganization({
            name: agency.name,
            slug: `agency-${agency.slug}`.slice(0, 100),
            createdBy: userId,
            privateMetadata: { platformAgencyId: agencyId.toString() },
          });

      agency.clerkOrganizationId = organization.id;
      agency.status = "active";
      await agency.save();
      operation.clerkOrganizationId = organization.id;
      operation.status = "complete";
      operation.completedSteps = [
        ...new Set([...operation.completedSteps, "clerk_organization_created", "agency_activated"]),
      ];
      operation.lastError = undefined;
      await operation.save();
      return agency.toObject();
    } catch (error) {
      operation.status = "failed";
      operation.lastError = externalError(error);
      operation.nextRetryAt = new Date(Date.now() + 60_000);
      await operation.save();
      throw error;
    }
  }

  async createClientWorkspace(input: CreateClientWorkspaceInput) {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(input.agencyId)) throw new Error("Invalid agency id");
    const agencyId = new Types.ObjectId(input.agencyId);
    const idempotencyKey = operationKey(
      "CREATE_CLIENT_WORKSPACE",
      input.requestedBy,
      input.idempotencyKey,
    );
    const existingOperation = await ProvisioningOperation.findOne({ idempotencyKey });
    if (existingOperation?.agencyId && String(existingOperation.agencyId) !== input.agencyId) {
      throw new Error("Idempotency key belongs to another agency");
    }
    if (existingOperation?.workspaceId) {
      const workspace = await Workspace.findById(existingOperation.workspaceId).lean();
      if (workspace && existingOperation.status === "complete") return workspace;
      if (workspace && ["pending", "failed"].includes(existingOperation.status)) {
        return this.finishClientProvisioning(
          workspace._id,
          existingOperation._id,
          input,
        );
      }
    }

    const [agency, entitlements] = await Promise.all([
      Agency.findOne({ _id: agencyId, status: "active" }).lean(),
      entitlementService.getEffectiveEntitlements({
        ownerType: "AGENCY",
        ownerId: input.agencyId,
      }),
    ]);
    if (!agency) throw new Error("Agency is not active");
    if (!entitlements.features.agencyDashboard) {
      throw new Error("The agency plan does not include client workspaces");
    }
    for (const service of input.services) {
      if (!entitlements.features[SERVICE_FEATURE[service]]) {
        throw new Error(`${service} is not included in the agency plan`);
      }
    }

    const clientLimit = entitlements.limits.clientWorkspaces || 0;
    const activeClientCount = await AgencyClient.countDocuments({
      agencyId,
      status: { $in: ["provisioning", "active", "suspended"] },
    });
    if (clientLimit !== -1 && activeClientCount >= clientLimit) {
      const error = new Error("Client workspace limit reached") as Error & {
        code?: string;
      };
      error.code = "CLIENT_LIMIT_REACHED";
      throw error;
    }

    const workspaceId = new Types.ObjectId();
    const slug = `${safeSlug(input.businessName)}-${workspaceId.toString().slice(-6)}`;
    const now = new Date();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const counterIdentity = {
          ownerType: "AGENCY" as const,
          ownerId: agencyId,
          metric: "clientWorkspaces" as const,
          periodKey: "current",
        };
        await UsageCounter.updateOne(
          counterIdentity,
          {
            $setOnInsert: {
              periodStart: new Date(0),
              periodEnd: new Date("9999-12-31T23:59:59.999Z"),
              used: activeClientCount,
              reserved: 0,
            },
            $max: { used: activeClientCount },
            $set: { limitSnapshot: clientLimit },
          },
          { upsert: true, session },
        );
        const reserved = await UsageCounter.findOneAndUpdate(
          {
            ...counterIdentity,
            ...(clientLimit === -1 ? {} : { used: { $lt: clientLimit } }),
          },
          { $inc: { used: 1 } },
          { new: true, session },
        );
        if (!reserved) throw new Error("Client workspace limit reached");

        await Workspace.create(
          [{
            _id: workspaceId,
            agencyId,
            name: input.businessName,
            slug,
            ownerEmail: input.ownerEmail,
            ownerContactName: input.ownerContactName,
            phone: input.phone,
            businessInformation: input.businessInformation || {},
            status: "pending",
            billingOwnerType: "AGENCY",
            billingOwnerId: agencyId,
          }],
          { session },
        );
        await AgencyClient.create(
          [{
            agencyId,
            workspaceId,
            status: "provisioning",
            defaultPermissions: [...WORKSPACE_AGENCY_PERMISSIONS],
            createdBy: input.requestedBy,
          }],
          { session },
        );
        if (input.services.length) {
          await WorkspaceService.insertMany(
            input.services.map((service) => ({
              workspaceId,
              service,
              enabled: true,
              setupStatus: "not_started",
              configuredBy: input.requestedBy,
            })),
            { session },
          );
        }
        await WorkspaceOnboarding.create(
          [{
            workspaceId,
            status: "in_progress",
            steps: [
              { code: "client_account", status: "complete", completedAt: now },
              { code: "business_information", status: "complete", completedAt: now },
              {
                code: "client_invitation",
                status: input.sendInvitation ? "in_progress" : "pending",
              },
            ],
            serviceStates: input.services.map((service) => ({
              service,
              status: "not_started",
              updatedAt: now,
            })),
          }],
          { session },
        );
        await ProvisioningOperation.create(
          [{
            idempotencyKey,
            operation: "CREATE_CLIENT_WORKSPACE",
            agencyId,
            workspaceId,
            requestedBy: input.requestedBy,
            status: "pending",
            completedSteps: ["local_workspace_created", "client_slot_reserved"],
          }],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }

    const operation = await ProvisioningOperation.findOne({ idempotencyKey }).orFail();
    return this.finishClientProvisioning(workspaceId, operation._id, input);
  }

  private async finishClientProvisioning(
    workspaceId: Types.ObjectId,
    operationId: Types.ObjectId,
    input: CreateClientWorkspaceInput,
  ) {
    const workspace = await Workspace.findById(workspaceId).orFail();
    const operation = await ProvisioningOperation.findById(operationId).orFail();
    operation.status = "processing";
    operation.attempts += 1;
    await operation.save();

    try {
      const organization = workspace.clerkOrganizationId
        ? await clerkClient.organizations.getOrganization({
            organizationId: workspace.clerkOrganizationId,
          })
        : await provisionClerkOrganization({
            name: workspace.name,
            slug: `client-${workspace.slug}`.slice(0, 100),
            createdBy: input.requestedBy,
            privateMetadata: {
              platformWorkspaceId: workspaceId.toString(),
              platformAgencyId: input.agencyId,
            },
          });

      workspace.clerkOrganizationId = organization.id;
      await workspace.save();
      operation.clerkOrganizationId = organization.id;
      operation.completedSteps = [
        ...new Set([...operation.completedSteps, "clerk_organization_created"]),
      ];
      await operation.save();

      if (input.sendInvitation && !operation.clerkInvitationId) {
        const invitation = await clerkClient.organizations.createOrganizationInvitation({
          organizationId: organization.id,
          emailAddress: input.ownerEmail,
          role: "org:member",
          inviterUserId: input.requestedBy,
          expiresInDays: 30,
          privateMetadata: { platformWorkspaceId: workspaceId.toString() },
          redirectUrl:
            process.env.CLERK_INVITATION_REDIRECT_URL ||
            PLATFORM_URLS.clerkInvitationRedirect,
        });
        operation.clerkInvitationId = invitation.id;
        operation.completedSteps = [
          ...new Set([...operation.completedSteps, "client_invitation_sent"]),
        ];
        await operation.save();
      }

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Workspace.updateOne(
            { _id: workspaceId },
            { $set: { status: "active", clerkOrganizationId: organization.id } },
            { session },
          );
          await AgencyClient.updateOne(
            { workspaceId, agencyId: new Types.ObjectId(input.agencyId) },
            { $set: { status: "active" } },
            { session },
          );
          if (input.sendInvitation) {
            await WorkspaceOnboarding.updateOne(
              { workspaceId },
              {
                $set: {
                  "steps.$[step].status": "complete",
                  "steps.$[step].completedAt": new Date(),
                },
              },
              { session, arrayFilters: [{ "step.code": "client_invitation" }] },
            );
          }
          await ProvisioningOperation.updateOne(
            { _id: operationId },
            {
              $set: { status: "complete", lastError: null },
              $addToSet: { completedSteps: "workspace_activated" },
              $unset: { nextRetryAt: 1 },
            },
            { session },
          );
        });
      } finally {
        await session.endSession();
      }
      return Workspace.findById(workspaceId).lean().orFail();
    } catch (error) {
      operation.status = "failed";
      operation.lastError = externalError(error);
      operation.nextRetryAt = new Date(Date.now() + 60_000);
      await operation.save();
      throw error;
    }
  }
}

export const provisioningService = new ProvisioningService();
