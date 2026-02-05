import * as express from "express";
import { Connection } from "mongoose";
import { RedisClientType } from "redis";

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
    }
  }
}

export {};
