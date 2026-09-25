import * as express from "express";
import { Connection } from "mongoose";
import { RedisClientType } from "redis";
import type { ResolvedWorkspaceAccess } from "@/services/tenant/workspace-resolver.service";
import type { ResolvedAgencyAccess } from "@/services/tenant/agency-resolver.service";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId?: string;
        sessionId?: string;
        orgId?: string;
        [key: string]: any;
      };
      redis: any; // Redis client
      db: Connection | null; // MongoDB connection
      platformContext?: ResolvedWorkspaceAccess;
      agencyContext?: ResolvedAgencyAccess;
    }
  }
}

export {};
