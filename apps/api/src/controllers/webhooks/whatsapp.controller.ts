import { Request, Response } from "express";
import crypto from "crypto";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import { connectToDatabase } from "@/config/database.config";
import {
  processWhatsAppWebhook,
  verifyWhatsAppSignature,
} from "@/services/whatsapp/whatsapp.service";
import {
  objectToAppointmentAlert,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionId = (value: string, index: number) =>
  cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || `option_${index + 1}`;

const toFlowDataSource = (values: unknown, fallback: string[]) => {
  const source = Array.isArray(values) && values.length ? values : fallback;
  return source
    .map((value, index) => {
      const title = cleanString(value) || fallback[index] || `Option ${index + 1}`;
      return {
        id: normalizeOptionId(title, index),
        title: title.slice(0, 72),
      };
    })
    .slice(0, 20);
};

const getFlowPrivateKey = () =>
  cleanString(process.env.WHATSAPP_FLOW_PRIVATE_KEY).replace(/\\n/g, "\n");

const decryptWhatsAppFlowRequest = (body: any) => {
  if (
    !body?.encrypted_flow_data ||
    !body?.encrypted_aes_key ||
    !body?.initial_vector
  ) {
    return null;
  }

  const privateKey = getFlowPrivateKey();
  if (!privateKey) {
    throw new Error(
      "WHATSAPP_FLOW_PRIVATE_KEY is required for encrypted WhatsApp Flow requests.",
    );
  }

  const encryptedAesKey = Buffer.from(body.encrypted_aes_key, "base64");
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      passphrase: process.env.WHATSAPP_FLOW_PRIVATE_KEY_PASSPHRASE || undefined,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedAesKey,
  );
  const encryptedFlowData = Buffer.from(body.encrypted_flow_data, "base64");
  const initialVector = Buffer.from(body.initial_vector, "base64");
  const authTag = encryptedFlowData.subarray(encryptedFlowData.length - 16);
  const encryptedPayload = encryptedFlowData.subarray(
    0,
    encryptedFlowData.length - 16,
  );
  const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, initialVector);
  decipher.setAuthTag(authTag);
  const decryptedPayload = Buffer.concat([
    decipher.update(encryptedPayload),
    decipher.final(),
  ]).toString("utf8");

  return {
    payload: JSON.parse(decryptedPayload),
    aesKey,
    initialVector,
  };
};

const encryptWhatsAppFlowResponse = (
  response: Record<string, any>,
  aesKey: Buffer,
  initialVector: Buffer,
) => {
  const flippedVector = Buffer.from(
    initialVector.map((byte) => byte ^ 0xff),
  );
  const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, flippedVector);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([encrypted, cipher.getAuthTag()]).toString("base64");
};

const resolveFlowWorkspace = async (payload: any) => {
  const data = payload?.data || {};
  const workspaceId =
    cleanString(payload?.flow_token) ||
    cleanString(data.workspace_id) ||
    cleanString(payload?.workspace_id);
  if (/^[a-f0-9]{24}$/i.test(workspaceId)) {
    const workspace = await WhatsAppWorkspace.findById(workspaceId);
    if (workspace) return workspace;
  }

  const phoneNumberId =
    cleanString(data.phone_number_id) || cleanString(payload?.phone_number_id);
  if (phoneNumberId) {
    const workspace = await WhatsAppWorkspace.findOne({
      "meta.phoneNumberId": phoneNumberId,
    });
    if (workspace) return workspace;
  }

  const wabaId = cleanString(data.waba_id) || cleanString(payload?.waba_id);
  if (wabaId) {
    const workspace = await WhatsAppWorkspace.findOne({ "meta.wabaId": wabaId });
    if (workspace) return workspace;
  }

  return null;
};

const resolveFlowOptionTitle = (
  value: unknown,
  options: Array<{ id: string; title: string }>,
) => {
  const text = cleanString(value);
  if (!text) return "";
  return options.find((option) => option.id === text || option.title === text)?.title || text;
};

const buildFlowDataResponse = (workspace: any) => {
  const flow = workspace?.appointmentFlow || {};
  const config = workspace?.appointmentConfig || {};
  const serviceNames = Array.isArray(config.services)
    ? config.services
        .filter((service: any) => service?.isActive !== false && cleanString(service?.name))
        .map((service: any) => cleanString(service.name))
        .slice(0, 10)
    : [];

  return {
    department_options: toFlowDataSource(flow.departmentOptions, [
      "General",
      "Sales",
      "Support",
    ]),
    location_options: toFlowDataSource(flow.locationOptions, [
      "Main branch",
      "Online consultation",
    ]),
    service_options: toFlowDataSource(serviceNames, ["General consultation"]),
  };
};

const createAppointmentFromFlowEndpoint = (workspace: any, payload: any) => {
  const data = payload?.data || payload || {};
  const flowData = buildFlowDataResponse(workspace);
  const service = resolveFlowOptionTitle(data.service, flowData.service_options);
  const department = resolveFlowOptionTitle(
    data.department,
    flowData.department_options,
  );
  const location = resolveFlowOptionTitle(data.location, flowData.location_options);
  const patientPhone =
    cleanString(data.phone) ||
    cleanString(data.mobile) ||
    cleanString(data.patient_phone) ||
    "Not provided";

  return {
    patientName:
      cleanString(data.patient_name) ||
      cleanString(data.name) ||
      "Unknown customer",
    patientPhone,
    patientWaId: patientPhone.replace(/\D/g, "") || patientPhone,
    service: service || "General consultation",
    symptoms:
      cleanString(data.symptoms) ||
      cleanString(data.requirement) ||
      cleanString(data.reason) ||
      "Submitted via WhatsApp Flow",
    preferredDate: cleanString(data.preferred_date) || cleanString(data.date),
    preferredTime: cleanString(data.preferred_time) || cleanString(data.time),
    status: "requested" as const,
    source: "whatsapp" as const,
    urgency: "routine" as const,
    notes: [
      "Created from WhatsApp Flow endpoint submission.",
      department ? `Department: ${department}` : "",
      location ? `Location: ${location}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

const isRecentDuplicateAppointment = (workspace: any, appointment: any) => {
  const createdAfter = Date.now() - 15 * 60 * 1000;
  return (workspace.appointments || []).some((item: any) => {
    const createdAt = item.createdAt ? new Date(item.createdAt).getTime() : 0;
    return (
      createdAt >= createdAfter &&
      cleanString(item.patientPhone) === cleanString(appointment.patientPhone) &&
      cleanString(item.preferredDate) === cleanString(appointment.preferredDate) &&
      cleanString(item.preferredTime) === cleanString(appointment.preferredTime) &&
      cleanString(item.service) === cleanString(appointment.service)
    );
  });
};

export const verifyWhatsAppWebhookController = async (
  req: Request,
  res: Response,
) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  console.info("[whatsapp:webhook:verify] Received verification request", {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge),
  });

  if (mode !== "subscribe" || !token || !challenge) {
    console.warn("[whatsapp:webhook:verify] Verification failed: invalid query");
    return res.status(403).json({
      success: false,
      error: "Verification failed",
      timestamp: new Date().toISOString(),
    });
  }

  await connectToDatabase();
  const workspace = await WhatsAppWorkspace.findOne({
    "meta.verifyToken": token,
  });

  const envToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (workspace || token === envToken) {
    console.info("[whatsapp:webhook:verify] Verification accepted", {
      matchedWorkspace: Boolean(workspace),
      matchedEnvToken: token === envToken,
    });
    return res.status(200).send(challenge);
  }

  console.warn("[whatsapp:webhook:verify] Verification token not recognized");
  return res.status(403).json({
    success: false,
    error: "Verification token not recognized",
    timestamp: new Date().toISOString(),
  });
};

export const handleWhatsAppWebhookController = async (
  req: Request,
  res: Response,
) => {
  const startTime = Date.now();

  try {
    const payload = req.body;
    const phoneNumberId =
      payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    const entryIds = (payload?.entry || []).map((entry: any) => entry.id);
    const messageCount =
      payload?.entry?.reduce(
        (total: number, entry: any) =>
          total +
          (entry.changes || []).reduce(
            (changeTotal: number, change: any) =>
              changeTotal + (change.value?.messages || []).length,
            0,
          ),
        0,
      ) || 0;
    const statusCount =
      payload?.entry?.reduce(
        (total: number, entry: any) =>
          total +
          (entry.changes || []).reduce(
            (changeTotal: number, change: any) =>
              changeTotal + (change.value?.statuses || []).length,
            0,
          ),
        0,
      ) || 0;

    console.info("[whatsapp:webhook] Received POST", {
      object: payload?.object,
      entryIds,
      phoneNumberId,
      messageCount,
      statusCount,
      hasSignature: Boolean(req.headers["x-hub-signature-256"]),
    });

    if (!payload?.object || payload.object !== "whatsapp_business_account") {
      console.warn("[whatsapp:webhook] Invalid payload object", {
        object: payload?.object,
      });
      return res.status(400).json({
        success: false,
        error: "Invalid WhatsApp payload",
        timestamp: new Date().toISOString(),
      });
    }

    if (process.env.NODE_ENV === "production" && phoneNumberId) {
      await connectToDatabase();
      const workspace = await WhatsAppWorkspace.findOne({
        "meta.phoneNumberId": phoneNumberId,
      });
      console.info("[whatsapp:webhook] Signature verification lookup", {
        phoneNumberId,
        workspaceFound: Boolean(workspace),
        hasWorkspaceAppSecret: Boolean(workspace?.meta?.appSecret),
        hasEnvAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
      });
      const signature = req.headers["x-hub-signature-256"] as
        | string
        | undefined;
      const isValid = verifyWhatsAppSignature(
        (req as any).rawBody,
        signature,
        workspace?.meta?.appSecret || process.env.WHATSAPP_APP_SECRET,
      );

      if (!isValid) {
        console.warn("[whatsapp:webhook] Invalid signature", {
          phoneNumberId,
          workspaceFound: Boolean(workspace),
        });
        return res.status(401).json({
          success: false,
          error: "Invalid WhatsApp signature",
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "WhatsApp webhook received",
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    setImmediate(async () => {
      try {
        await connectToDatabase();
        const result = await processWhatsAppWebhook(payload);
        console.info("[whatsapp:webhook] Async processing completed", result);
      } catch (error) {
        console.error("WhatsApp webhook async processing failed:", error);
      }
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    if (!res.headersSent) {
      return res.status(200).json({
        success: false,
        error: "Webhook received but processing failed",
        timestamp: new Date().toISOString(),
      });
    }
  }
};

export const handleWhatsAppFlowEndpointController = async (
  req: Request,
  res: Response,
) => {
  const startTime = Date.now();
  let encryptionContext:
    | { aesKey: Buffer; initialVector: Buffer }
    | null = null;

  const respond = (payload: Record<string, any>, status = 200) => {
    if (encryptionContext) {
      return res
        .status(status)
        .type("text/plain")
        .send(
          encryptWhatsAppFlowResponse(
            payload,
            encryptionContext.aesKey,
            encryptionContext.initialVector,
          ),
        );
    }
    return res.status(status).json(payload);
  };

  try {
    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        data: { status: "active" },
        service: "whatsapp-flow",
        timestamp: new Date().toISOString(),
      });
    }

    const decrypted = decryptWhatsAppFlowRequest(req.body);
    const payload = decrypted?.payload || req.body || {};
    if (decrypted) {
      encryptionContext = {
        aesKey: decrypted.aesKey,
        initialVector: decrypted.initialVector,
      };
    }

    const action = cleanString(payload.action).toLowerCase();
    console.info("[whatsapp:flow:endpoint] Received request", {
      action: action || "unknown",
      screen: payload.screen,
      hasEncryptedPayload: Boolean(decrypted),
      hasFlowToken: Boolean(payload.flow_token),
    });

    await connectToDatabase();
    const workspace = await resolveFlowWorkspace(payload);

    if (["ping", "health_check"].includes(action)) {
      if (workspace) {
        workspace.appointmentFlow = {
          ...workspace.appointmentFlow,
          endpointStatus: "healthy",
          updatedAt: new Date(),
        } as any;
        await workspace.save();
      }
      return respond({
        data: { status: "active" },
      });
    }

    if (!workspace) {
      return respond(
        {
          data: {
            error: "Workspace not found for this WhatsApp Flow request.",
            status: "error",
          },
        },
        200,
      );
    }

    workspace.appointmentFlow = {
      ...workspace.appointmentFlow,
      endpointStatus: "healthy",
      updatedAt: new Date(),
    } as any;

    const flowData = buildFlowDataResponse(workspace);
    const requestData = payload.data || {};
    const isBookingSubmission =
      action === "book_appointment" ||
      Boolean(
        requestData.patient_name ||
          requestData.phone ||
          requestData.symptoms ||
          requestData.requirement,
      );

    if (!isBookingSubmission) {
      await workspace.save();
      return respond({
        version: payload.version || "3.0",
        screen: payload.screen || "APPOINTMENT_FORM",
        data: flowData,
      });
    }

    const appointment = createAppointmentFromFlowEndpoint(workspace, payload);
    const isDuplicate = isRecentDuplicateAppointment(workspace, appointment);
    if (!isDuplicate) {
      workspace.appointments.push(appointment as any);
    }
    await workspace.save();

    if (!isDuplicate) {
      sendAppointmentNotifications({
        userId: workspace.clerkId,
        source: "whatsapp",
        sourceRef: `flow:${String(workspace._id)}:${new Date(
          appointment.createdAt,
        ).getTime()}`,
        appointment: objectToAppointmentAlert(appointment),
        ownerEmail: workspace.notificationSettings?.email,
        ownerWhatsAppNumber: workspace.notificationSettings?.whatsappNumber,
        emailEnabled: workspace.notificationSettings?.emailEnabled !== false,
        whatsappEnabled: workspace.notificationSettings?.whatsappEnabled !== false,
        dashboardPath: "/whatsapp/appointments",
      }).catch((error) => {
        console.error("WhatsApp Flow endpoint notification error:", error);
      });
    }

    console.info("[whatsapp:flow:endpoint] Appointment saved", {
      workspaceId: String(workspace._id),
      duplicate: isDuplicate,
      appointmentCount: workspace.appointments.length,
      responseTime: Date.now() - startTime,
    });

    return respond({
      version: payload.version || "3.0",
      screen: "APPOINTMENT_FORM",
      data: {
        ...flowData,
        success: true,
        message:
          workspace.appointmentFlow?.successMessage ||
          "Thanks. Your appointment request has been sent. The business team will confirm availability soon.",
      },
    });
  } catch (error: any) {
    console.error("WhatsApp Flow endpoint error:", error);
    if (!res.headersSent) {
      return respond(
        {
          data: {
            status: "error",
            error: error.message || "WhatsApp Flow endpoint failed",
          },
        },
        500,
      );
    }
  }
};
