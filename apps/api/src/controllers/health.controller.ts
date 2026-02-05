import { Request, Response } from "express";

export class HealthController {
  public static async checkHealth(req: Request, res: Response) {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "api-server",
    });
  }
}
