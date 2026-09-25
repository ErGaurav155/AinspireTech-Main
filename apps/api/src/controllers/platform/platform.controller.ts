import { getAuth } from "@clerk/express";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { connectToDatabase, mongoose } from "@/config/database.config";
import Agency from "@/models/tenant/Agency.model";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import AgencyMember from "@/models/tenant/AgencyMember.model";
import Workspace from "@/models/tenant/Workspace.model";
import WorkspaceMember from "@/models/tenant/WorkspaceMember.model";
import WorkspaceOnboarding from "@/models/tenant/WorkspaceOnboarding.model";
import WorkspaceService from "@/models/tenant/WorkspaceService.model";
import UsageCounter from "@/models/usage/UsageCounter.model";
import { writePlatformAuditLog } from "@/services/audit/platform-audit.service";
import { entitlementService } from "@/services/billing/entitlement.service";
import { provisioningService } from "@/services/tenant/provisioning.service";
import { usageService } from "@/services/usage/usage.service";

const serviceSchema = z.enum(["WHATSAPP", "INSTAGRAM", "WEBSITE", "CALL"]);
const createAgencySchema = z.object({ name: z.string().trim().min(2).max(160) }).strict();
const createBusinessWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    phone: z.string().trim().min(5).max(40).optional(),
    businessInformation: z.record(z.unknown()).optional(),
    services: z.array(serviceSchema).max(4).default([]),
  })
  .strict();
const createClientSchema = z
  .object({
    businessName: z.string().trim().min(2).max(160),
    ownerContactName: z.string().trim().min(2).max(160).optional(),
    ownerEmail: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(5).max(40).optional(),
    businessInformation: z.record(z.unknown()).optional(),
    services: z.array(serviceSchema).max(4).default([]),
    sendInvitation: z.boolean().default(true),
  })
  .strict();
const updateServiceSchema = z.object({ enabled: z.boolean() }).strict();

const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data, timestamp: new Date().toISOString() });
const fail = (res: Response, status: number, error: string, details?: unknown) =>
  res.status(status).json({
    success: false,
    error,
    ...(details ? { details } : {}),
    timestamp: new Date().toISOString(),
  });

const idempotencyKey = (req: Request, res: Response) => {
  const key = String(req.headers["x-idempotency-key"] || "").trim();
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(key)) {
    fail(res, 400, "A valid X-Idempotency-Key header is required");
    return null;
  }
  return key;
};

const handleError = (res: Response, error: any, fallback: string) => {
  console.error(fallback, error);
  if (error?.code === "CLIENT_LIMIT_REACHED" || error?.message === "Client workspace limit reached") {
    return fail(res, 409, "Client workspace limit reached", {
      code: "CLIENT_LIMIT_REACHED",
      actions: ["upgrade_plan", "purchase_client_slots"],
    });
  }
  if (String(error?.message || "").includes("not included")) {
    return fail(res, 403, error.message);
  }
  return fail(res, 500, fallback);
};

export const createAgencyController = async (req: Request, res: Response) => {
  const userId = getAuth(req).userId;
  if (!userId) return fail(res, 401, "Authentication required");
  const key = idempotencyKey(req, res);
  if (!key) return;
  const parsed = createAgencySchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid request body", parsed.error.flatten());

  try {
    const agency = await provisioningService.createAgency(userId, {
      ...parsed.data,
      idempotencyKey: key,
    });
    await writePlatformAuditLog({
      req,
      action: "agency.created",
      targetType: "agency",
      targetId: String(agency._id),
    });
    return ok(res, { agency }, 201);
  } catch (error) {
    return handleError(res, error, "Unable to create agency");
  }
};

export const createBusinessWorkspaceController = async (req: Request, res: Response) => {
  const userId = getAuth(req).userId;
  if (!userId) return fail(res, 401, "Authentication required");
  const key = idempotencyKey(req, res);
  if (!key) return;
  const parsed = createBusinessWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid request body", parsed.error.flatten());
  try {
    const workspace = await provisioningService.createBusinessWorkspace(userId, {
      ...parsed.data,
      services: [...new Set(parsed.data.services)],
      idempotencyKey: key,
    });
    await writePlatformAuditLog({
      req,
      action: "workspace.created",
      targetType: "workspace",
      targetId: String(workspace._id),
      metadata: { accountType: "BUSINESS" },
    });
    return ok(res, { workspace }, 201);
  } catch (error) {
    return handleError(res, error, "Unable to create business workspace");
  }
};

export const createClientWorkspaceController = async (req: Request, res: Response) => {
  const context = req.agencyContext;
  if (!context) return fail(res, 500, "Agency context is missing");
  const key = idempotencyKey(req, res);
  if (!key) return;
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "Invalid request body", parsed.error.flatten());

  try {
    const workspace = await provisioningService.createClientWorkspace({
      agencyId: context.agencyId,
      requestedBy: context.userId,
      idempotencyKey: key,
      ...parsed.data,
      services: [...new Set(parsed.data.services)],
    });
    await writePlatformAuditLog({
      req,
      action: "client.created",
      targetType: "workspace",
      targetId: String(workspace._id),
      metadata: { services: parsed.data.services, invitationSent: parsed.data.sendInvitation },
    });
    return ok(res, { workspace }, 201);
  } catch (error) {
    return handleError(res, error, "Unable to create client workspace");
  }
};

export const getPlatformContextController = async (req: Request, res: Response) => {
  const userId = getAuth(req).userId;
  if (!userId) return fail(res, 401, "Authentication required");
  try {
    await connectToDatabase();
    const [ownedAgencies, agencyMemberships, ownedWorkspaces, workspaceMemberships] =
      await Promise.all([
        Agency.find({ ownerUserId: userId, status: { $ne: "archived" } }).lean(),
        AgencyMember.find({ userId, status: "active" }).lean(),
        Workspace.find({
          $or: [{ ownerUserId: userId }, { legacyOwnerClerkId: userId }],
          status: { $ne: "archived" },
        }).lean(),
        WorkspaceMember.find({ userId, status: "active" }).lean(),
      ]);

    const ownedAgencyIds = new Set(ownedAgencies.map((agency) => String(agency._id)));
    const memberAgencyIds = agencyMemberships
      .map((membership) => membership.agencyId)
      .filter((id) => !ownedAgencyIds.has(String(id)));
    const memberAgencies = memberAgencyIds.length
      ? await Agency.find({ _id: { $in: memberAgencyIds }, status: { $ne: "archived" } }).lean()
      : [];
    const ownedWorkspaceIds = new Set(ownedWorkspaces.map((workspace) => String(workspace._id)));
    const memberWorkspaceIds = workspaceMemberships
      .map((membership) => membership.workspaceId)
      .filter((id) => !ownedWorkspaceIds.has(String(id)));
    const memberWorkspaces = memberWorkspaceIds.length
      ? await Workspace.find({ _id: { $in: memberWorkspaceIds }, status: { $ne: "archived" } }).lean()
      : [];

    return ok(res, {
      accountModes: {
        business: ownedWorkspaces.length + memberWorkspaces.length > 0,
        agency: ownedAgencies.length + memberAgencies.length > 0,
      },
      agencies: [...ownedAgencies, ...memberAgencies],
      workspaces: [...ownedWorkspaces, ...memberWorkspaces],
    });
  } catch (error) {
    return handleError(res, error, "Unable to load platform context");
  }
};

export const getAgencyController = async (req: Request, res: Response) => {
  try {
    const agencyId = req.agencyContext!.agencyId;
    const [agency, entitlements, usage] = await Promise.all([
      Agency.findById(agencyId).lean(),
      entitlementService.getEffectiveEntitlements({ ownerType: "AGENCY", ownerId: agencyId }),
      usageService.getUsage({ ownerType: "AGENCY", ownerId: agencyId }),
    ]);
    return ok(res, { agency, role: req.agencyContext!.role, entitlements, usage });
  } catch (error) {
    return handleError(res, error, "Unable to load agency");
  }
};

export const listAgencyClientsController = async (req: Request, res: Response) => {
  try {
    const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
    const relationships = await AgencyClient.find({
      agencyId,
      status: { $ne: "archived" },
    })
      .sort({ createdAt: -1 })
      .lean();
    const workspaceIds = relationships.map((relationship) => relationship.workspaceId);
    const [workspaces, services] = await Promise.all([
      Workspace.find({ _id: { $in: workspaceIds } }).lean(),
      WorkspaceService.find({ workspaceId: { $in: workspaceIds } }).lean(),
    ]);
    const workspaceById = new Map(workspaces.map((workspace) => [String(workspace._id), workspace]));
    const servicesByWorkspace = new Map<string, typeof services>();
    for (const service of services) {
      const key = String(service.workspaceId);
      servicesByWorkspace.set(key, [...(servicesByWorkspace.get(key) || []), service]);
    }
    return ok(
      res,
      relationships.map((relationship) => ({
        relationship,
        workspace: workspaceById.get(String(relationship.workspaceId)),
        services: servicesByWorkspace.get(String(relationship.workspaceId)) || [],
      })),
    );
  } catch (error) {
    return handleError(res, error, "Unable to load agency clients");
  }
};

export const updateClientServiceController = async (req: Request, res: Response) => {
  const parsed = updateServiceSchema.safeParse(req.body);
  const service = serviceSchema.safeParse(String(req.params.service || "").toUpperCase());
  if (!parsed.success || !service.success) return fail(res, 400, "Invalid service update");
  const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
  const workspaceId = String(req.params.workspaceId || "");
  if (!Types.ObjectId.isValid(workspaceId)) return fail(res, 400, "Invalid workspace id");
  try {
    const relationship = await AgencyClient.findOne({
      agencyId,
      workspaceId: new Types.ObjectId(workspaceId),
      status: "active",
    }).lean();
    if (!relationship) return fail(res, 404, "Client workspace not found");
    if (parsed.data.enabled) {
      const allowed = await entitlementService.getEffectiveEntitlements({
        ownerType: "AGENCY",
        ownerId: String(agencyId),
      });
      const feature = {
        WHATSAPP: "whatsapp",
        INSTAGRAM: "instagram",
        WEBSITE: "websiteChatbot",
        CALL: "callAssistant",
      }[service.data] as "whatsapp" | "instagram" | "websiteChatbot" | "callAssistant";
      if (!allowed.features[feature]) return fail(res, 403, `${service.data} is not included in the agency plan`);
    }
    const configuration = await WorkspaceService.findOneAndUpdate(
      { workspaceId: relationship.workspaceId, service: service.data },
      {
        $set: {
          enabled: parsed.data.enabled,
          configuredBy: req.agencyContext!.userId,
          ...(parsed.data.enabled ? {} : { setupStatus: "not_started" }),
        },
        $setOnInsert: { metadata: {} },
      },
      { upsert: true, new: true },
    );
    await writePlatformAuditLog({
      req,
      action: parsed.data.enabled ? "service.enabled" : "service.disabled",
      targetType: "workspace_service",
      targetId: String(configuration._id),
      metadata: { workspaceId, service: service.data },
    });
    return ok(res, { service: configuration });
  } catch (error) {
    return handleError(res, error, "Unable to update client service");
  }
};

export const archiveClientWorkspaceController = async (req: Request, res: Response) => {
  const agencyId = new Types.ObjectId(req.agencyContext!.agencyId);
  const workspaceId = String(req.params.workspaceId || "");
  if (!Types.ObjectId.isValid(workspaceId)) return fail(res, 400, "Invalid workspace id");
  const workspaceObjectId = new Types.ObjectId(workspaceId);
  const session = await mongoose.startSession();
  try {
    let archived = false;
    await session.withTransaction(async () => {
      const relationship = await AgencyClient.findOne({
        agencyId,
        workspaceId: workspaceObjectId,
        status: { $ne: "archived" },
      }).session(session);
      if (!relationship) return;
      relationship.status = "archived";
      relationship.archivedAt = new Date();
      await relationship.save({ session });
      await Workspace.updateOne(
        { _id: workspaceObjectId, agencyId },
        { $set: { status: "archived" } },
        { session },
      );
      await UsageCounter.updateOne(
        {
          ownerType: "AGENCY",
          ownerId: agencyId,
          metric: "clientWorkspaces",
          periodKey: "current",
          used: { $gt: 0 },
        },
        { $inc: { used: -1 } },
        { session },
      );
      archived = true;
    });
    if (!archived) return fail(res, 404, "Client workspace not found");
    await writePlatformAuditLog({
      req,
      action: "client.archived",
      targetType: "workspace",
      targetId: workspaceId,
    });
    return ok(res, { workspaceId, status: "archived", dataDeleted: false });
  } catch (error) {
    return handleError(res, error, "Unable to archive client workspace");
  } finally {
    await session.endSession();
  }
};

export const getWorkspaceController = async (req: Request, res: Response) => {
  try {
    const workspaceId = new Types.ObjectId(req.platformContext!.workspaceId);
    const [workspace, services, onboarding, entitlements] = await Promise.all([
      Workspace.findById(workspaceId).lean(),
      WorkspaceService.find({ workspaceId }).lean(),
      WorkspaceOnboarding.findOne({ workspaceId }).lean(),
      entitlementService.getEffectiveEntitlements({
        ownerType: req.platformContext!.billingOwnerType,
        ownerId: req.platformContext!.billingOwnerId,
      }),
    ]);
    const serviceFeature = {
      WHATSAPP: "whatsapp",
      INSTAGRAM: "instagram",
      WEBSITE: "websiteChatbot",
      CALL: "callAssistant",
    } as const;
    const effectiveServices = services.map((service) => ({
      ...service,
      effectiveEnabled: Boolean(
        service.enabled && entitlements.features[serviceFeature[service.service]],
      ),
      comingSoon: service.service === "CALL",
    }));
    return ok(res, {
      workspace,
      services: effectiveServices,
      onboarding,
      access: {
        role: req.platformContext!.role,
        permissions: req.platformContext!.permissions,
        accessKind: req.platformContext!.accessKind,
      },
      entitlements,
    });
  } catch (error) {
    return handleError(res, error, "Unable to load workspace");
  }
};
