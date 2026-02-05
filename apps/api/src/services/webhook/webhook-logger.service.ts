import { connectToDatabase } from "@/config/database.config";

interface WebhookLog {
  webhookId: string;
  type: string;
  status: "success" | "failed" | "processing";
  processingTime: number;
  result?: any;
  error?: string;
  timestamp?: Date;
}

export async function logWebhook(log: WebhookLog): Promise<void> {
  try {
    await connectToDatabase();

    // Simple console logging for now
    console.log(
      `📝 Webhook Log: ${JSON.stringify({
        ...log,
        timestamp: log.timestamp || new Date(),
      })}`,
    );

    // You could save to MongoDB here if needed
    // const WebhookLogModel = await import("@/models/webhook-log.model");
    // await WebhookLogModel.create(log);
  } catch (error) {
    console.error("Error logging webhook:", error);
  }
}
