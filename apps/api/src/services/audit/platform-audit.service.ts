import type { Request } from "express";
import { Types } from "mongoose";
import { getAuth } from "@clerk/express";
import PlatformAuditLog from "@/models/PlatformAuditLog.model";

const SENSITIVE_KEY = /token|secret|password|signature|authorization|api.?key/i;

const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitize(item),
    ]),
  );
};

export async function writePlatformAuditLog({
  req,
  action,
  targetType,
  targetId,
  metadata = {},
}: {
  req: Request;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const context = req.platformContext;
  const agencyContext = req.agencyContext;
  const actorUserId =
    context?.userId || agencyContext?.userId || getAuth(req).userId || req.auth?.userId;
  if (!actorUserId) throw new Error("Audit actor is missing");

  return PlatformAuditLog.create({
    actorUserId,
    agencyId:
      (context?.agencyId || agencyContext?.agencyId) &&
      Types.ObjectId.isValid(context?.agencyId || agencyContext?.agencyId || "")
        ? new Types.ObjectId(context?.agencyId || agencyContext!.agencyId)
        : undefined,
    workspaceId:
      context?.workspaceId && Types.ObjectId.isValid(context.workspaceId)
        ? new Types.ObjectId(context.workspaceId)
        : undefined,
    action,
    targetType,
    targetId,
    metadata: sanitize(metadata),
    ipAddress: req.ip,
  });
}
