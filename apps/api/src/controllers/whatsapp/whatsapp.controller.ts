import { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { connectToDatabase } from "@/config/database.config";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  getOrCreateWhatsAppWorkspace,
  getPlanById,
  pruneExpiredWhatsAppAppointments,
  resolveWorkspaceConfigured,
  sanitizeWorkspace,
  sendWhatsAppTextMessage,
  whatsappPlans,
} from "@/services/whatsapp/whatsapp.service";
import { getActivePackageSubscription } from "@/services/packages/package-subscription.service";
import {
  objectToAppointmentAlert,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";
import { uploadTextToCloudinary } from "@/services/transaction.service";
import { scrapeWebsitePagesForKnowledge } from "@/controllers/web/scrape/scrap-anu.controller";
import { formatScrapedData } from "@/controllers/web/scrape/process-data.controller";

const authUserId = (req: Request) => getAuth(req).userId;

const unauthorized = (res: Response) =>
  res.status(401).json({
    success: false,
    error: "Unauthorized",
    timestamp: new Date().toISOString(),
  });

const ok = (res: Response, data: any) =>
  res.status(200).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });

const allowedCollections = [
  "conversations",
  "appointments",
] as const;

type CollectionName = (typeof allowedCollections)[number];

const toCollectionName = (value: string): CollectionName | null =>
  allowedCollections.includes(value as CollectionName)
    ? (value as CollectionName)
    : null;

const getMissingWhatsAppSetupFields = (workspace: any) => {
  const missing: string[] = [];
  if (!workspace.meta?.businessManagerId?.trim()) {
    missing.push("Business Manager ID");
  }
  if (!workspace.meta?.appId?.trim()) missing.push("Meta app ID");
  if (!workspace.meta?.wabaId?.trim()) missing.push("WABA ID");
  if (!workspace.meta?.phoneNumberId?.trim()) missing.push("Phone number ID");
  if (!workspace.meta?.displayPhoneNumber?.trim()) {
    missing.push("WhatsApp business number");
  }
  if (!workspace.meta?.accessToken?.trim()) missing.push("Access token");
  return missing;
};

const metaAppId =
  process.env.WHATSAPP_META_APP_ID ||
  process.env.META_APP_ID ||
  process.env.FACEBOOK_APP_ID ||
  "";
const metaAppSecret =
  process.env.WHATSAPP_META_APP_SECRET ||
  process.env.WHATSAPP_APP_SECRET ||
  process.env.META_APP_SECRET ||
  process.env.FACEBOOK_APP_SECRET ||
  "";
const metaGraphApiVersion =
  process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0";
const embeddedSignupConfigId =
  process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || "1621203692298909";
const whatsappOAuthRedirectUri =
  process.env.WHATSAPP_OAUTH_REDIRECT_URI ||
  "https://app.rocketreplai.com/whatsapp/settings";
const publicApiBaseUrl =
  process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "";
const defaultWhatsAppFlowEndpointUri = publicApiBaseUrl
  ? `${publicApiBaseUrl.replace(/\/+$/, "")}/api/webhooks/whatsapp/flow`
  : "";
const defaultWhatsAppFlowPublicKey = (
  process.env.WHATSAPP_FLOW_PUBLIC_KEY || ""
)
  .replace(/\\n/g, "\n")
  .trim();

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const appointmentChatQuestionFields = new Set([
  "patientName",
  "patientPhone",
  "service",
  "preferredDate",
  "preferredTime",
  "symptoms",
]);

const defaultAppointmentChatQuestions = [
  { field: "patientName", question: "What is your full name?", required: true },
  { field: "patientPhone", question: "What phone number should we use?", required: true },
  { field: "service", question: "Which service do you want to book?", required: true },
  { field: "preferredDate", question: "Which date do you prefer?", required: true },
  { field: "preferredTime", question: "Which time do you prefer?", required: true },
  { field: "symptoms", question: "Please describe your requirement.", required: true },
];

const automationMenuIds = new Set([
  "book_appointment",
  "talk_to_owner",
  "need_support",
  "service_pricing",
  "browse_faqs",
]);
const automationQuestionFields = new Set([
  "patientName",
  "patientEmail",
  "service",
  "preferredDate",
  "preferredTime",
  "symptoms",
  "custom",
]);
const automationQuestionTypes = new Set([
  "text",
  "email",
  "select",
  "date",
  "time",
  "textarea",
]);

const clampNumber = (value: unknown, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, Number(value) || minimum));

const safeCloudinaryFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);

const downloadTextFromUrl = async (url: string, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const readExistingWhatsAppKnowledge = async (knowledgeBaseUrl?: string) => {
  if (!knowledgeBaseUrl) return {};
  try {
    const text = await downloadTextFromUrl(knowledgeBaseUrl, 7000);
    return JSON.parse(text);
  } catch (error) {
    console.warn("[whatsapp:business-info] Could not read existing knowledge", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
};

const uploadWhatsAppKnowledge = async ({
  workspace,
  businessInfo,
}: {
  workspace: any;
  businessInfo: Record<string, any>;
}) => {
  const existingInfo = workspace.businessInfo || {};
  const websiteUrl =
    businessInfo.websiteUrl !== undefined
      ? cleanString(businessInfo.websiteUrl)
      : cleanString(existingInfo.websiteUrl);
  const summary =
    businessInfo.summary !== undefined
      ? cleanString(businessInfo.summary)
      : cleanString(existingInfo.summary);
  const fileText = cleanString(businessInfo.fileText);
  const fileName =
    businessInfo.fileName !== undefined
      ? cleanString(businessInfo.fileName)
      : cleanString(existingInfo.fileName);
  const fileType =
    businessInfo.fileType !== undefined
      ? cleanString(businessInfo.fileType)
      : cleanString(existingInfo.fileType);
  const fileSize = Number(businessInfo.fileSize || existingInfo.fileSize || 0);
  const existingKnowledge = await readExistingWhatsAppKnowledge(
    existingInfo.knowledgeBaseUrl,
  );
  const shouldScrapeWebsite =
    Boolean(websiteUrl) &&
    (websiteUrl !== cleanString(existingInfo.websiteUrl) ||
      !existingKnowledge?.website?.pages?.length);
  let websiteKnowledge = existingKnowledge?.website || null;
  let websiteKnowledgeUrl = cleanString(existingInfo.websiteKnowledgeUrl);
  if (shouldScrapeWebsite) {
    try {
      const scrapeResult = await scrapeWebsitePagesForKnowledge(websiteUrl);
      const formattedWebsiteData = formatScrapedData(scrapeResult.scrapedPages);
      const websiteFileName = `whatsapp_${workspace.clerkId}_${scrapeResult.fileName}`;
      websiteKnowledgeUrl = await uploadTextToCloudinary(
        formattedWebsiteData,
        websiteFileName,
      );
      websiteKnowledge = JSON.parse(formattedWebsiteData);
    } catch (error) {
      console.warn("[whatsapp:business-info] Shared website scrape failed", {
        websiteUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      websiteKnowledge = {
        generatedAt: new Date().toISOString(),
        pageCount: 0,
        pages: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  let fileKnowledge = existingKnowledge?.file || null;
  let fileKnowledgeUrl = cleanString(existingInfo.fileKnowledgeUrl);
  if (fileText) {
    fileKnowledge = {
      type: "file_upload",
      name: fileName || "business-info.txt",
      contentType: fileType || "text/plain",
      size: fileSize,
      content: fileText,
      uploadedAt: new Date().toISOString(),
    };
    const fileKnowledgePayload = {
      generatedAt: new Date().toISOString(),
      file: fileKnowledge,
    };
    fileKnowledgeUrl = await uploadTextToCloudinary(
      JSON.stringify(fileKnowledgePayload, null, 2),
      `whatsapp_${workspace.clerkId}_file_${Date.now()}_${safeCloudinaryFileName(
        fileName || "business_info",
      )}`,
    );
  }

  const knowledge = {
    type: "whatsapp_business_info",
    generatedAt: new Date().toISOString(),
    businessName: workspace.organization?.name || "My Business",
    websiteUrl,
    summary: summary.slice(0, 12000),
    websiteKnowledgeUrl,
    fileKnowledgeUrl,
    website: websiteKnowledge,
    file: fileKnowledge,
  };
  const knowledgeFileName = `whatsapp_${workspace.clerkId}_${Date.now()}_${safeCloudinaryFileName(
    websiteUrl || fileName || "business_info",
  )}`;
  const knowledgeBaseUrl = await uploadTextToCloudinary(
    JSON.stringify(knowledge, null, 2),
    knowledgeFileName,
  );

  return {
    websiteUrl,
    summary: summary.slice(0, 12000),
    fileName,
    fileType,
    fileSize,
    fileText: "",
    websiteKnowledgeUrl,
    fileKnowledgeUrl,
    knowledgeBaseUrl,
    knowledgeBaseFileName: knowledgeFileName,
    knowledgeUpdatedAt: new Date(),
    updatedAt: new Date(),
  };
};

const graphFetch = async (path: string, accessToken: string) => {
  const url = new URL(`https://graph.facebook.com/${metaGraphApiVersion}${path}`);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Meta Graph API request failed");
  }
  return data;
};

const syncGreetingTemplateStatus = async (workspace: any) => {
  const template = workspace.greetingTemplate;
  if (
    !template?.name ||
    !workspace.meta?.wabaId ||
    !workspace.meta?.accessToken
  ) {
    return;
  }

  try {
    const url = new URL(
      `https://graph.facebook.com/${workspace.meta.graphApiVersion || metaGraphApiVersion}/${workspace.meta.wabaId}/message_templates`,
    );
    url.searchParams.set("name", template.name);
    url.searchParams.set("fields", "id,name,status");
    url.searchParams.set("access_token", workspace.meta.accessToken);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return;

    const remoteTemplate = data?.data?.[0];
    const remoteStatus = cleanString(remoteTemplate?.status).toLowerCase();
    if (["approved", "pending", "rejected"].includes(remoteStatus)) {
      template.status = remoteStatus;
      template.metaTemplateId = cleanString(remoteTemplate?.id) || template.metaTemplateId;
      template.lastError = "";
      if (remoteStatus === "approved" && !template.approvedAt) {
        template.approvedAt = new Date();
      }
    }
  } catch (error) {
    console.warn("[whatsapp:template] Could not sync greeting template status", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const normalizeFlowStatus = (
  value: unknown,
  validationErrors: any[] = [],
): "draft" | "validation_error" | "published" | "deprecated" | "blocked" | "error" => {
  if (validationErrors.length > 0) return "validation_error";
  const status = cleanString(value).toLowerCase();
  if (status === "published") return "published";
  if (status === "deprecated") return "deprecated";
  if (status === "blocked" || status === "throttled") return "blocked";
  if (status === "draft") return "draft";
  return status ? "error" : "draft";
};

const appointmentFieldLabels: Record<string, string> = {
  patient_name: "Customer name",
  phone: "Phone number",
  symptoms: "Requirement",
  preferred_date: "Preferred date",
  preferred_time: "Preferred time",
};

const appointmentFlowFieldOrder = [
  "patient_name",
  "phone",
  "symptoms",
  "preferred_date",
  "preferred_time",
  "service",
];

const toFlowDataSource = (values: unknown[] = [], fallback: string[]) =>
  (values.length ? values : fallback)
    .map((value) => cleanString(value))
    .filter(Boolean)
    .slice(0, 20)
    .map((title, index) => ({
      id:
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")
          .slice(0, 40) || `option_${index + 1}`,
      title: title.slice(0, 72),
    }));

const buildAppointmentFlowJson = (workspace: any) => {
  const config = workspace.appointmentConfig || {};
  const flow = workspace.appointmentFlow || {};
  const endpointUri =
    cleanString(flow.endpointUri) || defaultWhatsAppFlowEndpointUri;
  const requiredFields = Array.isArray(config.requiredFields)
    ? config.requiredFields
    : [];
  const selectedFields = appointmentFlowFieldOrder.filter(
    (field) =>
      requiredFields.includes(field) ||
      ["patient_name", "symptoms", "preferred_date", "preferred_time"].includes(field),
  );
  const serviceNames = (config.services || [])
    .filter((service: any) => service?.isActive !== false && cleanString(service?.name))
    .map((service: any) => cleanString(service.name))
    .slice(0, 10);
  if (!selectedFields.includes("patient_name")) selectedFields.unshift("patient_name");
  const departmentOptions = toFlowDataSource(flow.departmentOptions, [
    "General",
    "Sales",
    "Support",
  ]);
  const locationOptions = toFlowDataSource(flow.locationOptions, [
    "Main branch",
    "Online consultation",
  ]);
  const serviceOptions = toFlowDataSource(serviceNames, [
    "General consultation",
  ]);
  const flowFieldLabels: Record<string, string> = {
    patient_name: flow.customerNameLabel || "Full name",
    phone: flow.phoneLabel || "Phone number",
    symptoms: flow.requirementLabel || "Requirement",
    preferred_date: flow.dateLabel || "Preferred date",
    preferred_time: flow.timeLabel || "Preferred time",
  };

  const inputComponents = selectedFields
    .filter((field) => field !== "service")
    .map((field) => ({
    type: "TextInput",
    name: field,
    label: flowFieldLabels[field] || appointmentFieldLabels[field] || field.replace(/_/g, " "),
    required: ["patient_name", "symptoms", "preferred_date", "preferred_time"].includes(field)
      ? true
      : requiredFields.includes(field),
    "input-type": field === "phone" ? "phone" : "text",
  }));
  const payload = {
    action: "book_appointment",
    workspace_id: String(workspace._id),
    waba_id: workspace.meta?.wabaId || "",
    phone_number_id: workspace.meta?.phoneNumberId || "",
    department: "${form.department}",
    location: "${form.location}",
    service: "${form.service}",
    patient_name: "${form.patient_name}",
    phone: "${form.phone}",
    symptoms: "${form.symptoms}",
    preferred_date: "${form.preferred_date}",
    preferred_time: "${form.preferred_time}",
  };

  return {
    version: flow.jsonVersion || "7.1",
    data_api_version: "3.0",
    ...(endpointUri ? { data_channel_uri: endpointUri } : {}),
    routing_model: {
      APPOINTMENT_FORM: [],
    },
    screens: [
      {
        id: "APPOINTMENT_FORM",
        title: "Book Appointment",
        terminal: true,
        success: true,
        data: {
          department_options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
              },
            },
            __example__: departmentOptions,
          },
          location_options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
              },
            },
            __example__: locationOptions,
          },
          service_options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
              },
            },
            __example__: serviceOptions,
          },
        },
        layout: {
          type: "SingleColumnLayout",
          children: [
            {
              type: "Form",
              name: "appointment_form",
              children: [
                {
                  type: "TextHeading",
                  text: `Book appointment with ${config.clinicName || workspace.organization?.name || "us"}`,
                },
                {
                  type: "TextBody",
                  text: "Share your appointment details. The business team will confirm availability.",
                },
                {
                  type: "Dropdown",
                  name: "department",
                  label: flow.departmentLabel || "Department",
                  required: true,
                  "data-source": "${data.department_options}",
                },
                {
                  type: "Dropdown",
                  name: "location",
                  label: flow.locationLabel || "Location",
                  required: true,
                  "data-source": "${data.location_options}",
                },
                {
                  type: "Dropdown",
                  name: "service",
                  label: flow.serviceLabel || "Service",
                  required: true,
                  "data-source": "${data.service_options}",
                },
                ...inputComponents,
                {
                  type: "Footer",
                  label: flow.submitButtonLabel || "Book appointment",
                  "on-click-action": {
                    name: "data_exchange",
                    payload,
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
};

const graphJsonRequest = async ({
  path,
  accessToken,
  method = "POST",
  body,
  version,
}: {
  path: string;
  accessToken: string;
  method?: "GET" | "POST";
  body?: Record<string, any>;
  version: string;
}) => {
  const response = await fetch(`https://graph.facebook.com/${version}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const metaError = data?.error || {};
    throw new Error(
      [
        metaError.message || "Meta Graph API request failed",
        metaError.error_user_title,
        metaError.error_user_msg,
        metaError.type ? `type=${metaError.type}` : "",
        metaError.code ? `code=${metaError.code}` : "",
        metaError.error_subcode ? `subcode=${metaError.error_subcode}` : "",
        metaError.fbtrace_id ? `fbtrace_id=${metaError.fbtrace_id}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }
  return data;
};

const syncAppointmentFlowEncryptionKey = async (workspace: any) => {
  const publicKey =
    cleanString(workspace.appointmentFlow?.publicKey) ||
    defaultWhatsAppFlowPublicKey;

  if (!publicKey) {
    workspace.appointmentFlow = {
      ...workspace.appointmentFlow,
      publicKeyStatus: "missing",
      lastError:
        "Add WHATSAPP_FLOW_PUBLIC_KEY or save a Flow public key before syncing the endpoint Flow.",
      updatedAt: new Date(),
    } as any;
    throw new Error(workspace.appointmentFlow.lastError);
  }

  if (!workspace.meta?.phoneNumberId || !workspace.meta?.accessToken) {
    workspace.appointmentFlow = {
      ...workspace.appointmentFlow,
      publicKey,
      publicKeyStatus: "error",
      lastError:
        "Connect a WhatsApp phone number before signing the Flow public key.",
      updatedAt: new Date(),
    } as any;
    throw new Error(workspace.appointmentFlow.lastError);
  }

  const result = await graphJsonRequest({
    path: `/${workspace.meta.phoneNumberId}/whatsapp_business_encryption`,
    accessToken: workspace.meta.accessToken,
    version: workspace.meta.graphApiVersion || metaGraphApiVersion,
    body: {
      business_public_key: publicKey,
    },
  });

  workspace.appointmentFlow = {
    ...workspace.appointmentFlow,
    publicKey,
    publicKeyStatus: "signed",
    lastError: "",
    updatedAt: new Date(),
  } as any;
  return result;
};

const createAppointmentFlow = async (workspace: any, flowJson: Record<string, any>) => {
  const baseName =
    cleanString(workspace.appointmentFlow?.name) ||
    `${workspace.organization?.name || "RocketReplai"} Appointment Booking`;
  const needsRevisionName = Boolean(workspace.appointmentFlow?.flowId);
  const name = needsRevisionName
    ? `${baseName.slice(0, 42)} ${Date.now()}`
    : baseName.slice(0, 60);
  const version = workspace.meta?.graphApiVersion || metaGraphApiVersion;
  const data = await graphJsonRequest({
    path: `/${workspace.meta.wabaId}/flows`,
    accessToken: workspace.meta.accessToken,
    version,
    body: {
      name,
      categories: ["APPOINTMENT_BOOKING"],
    },
  });
  workspace.appointmentFlow = {
    ...workspace.appointmentFlow,
    enabled: true,
    name,
    flowId: cleanString(data?.id),
    status: "draft",
    categories: ["APPOINTMENT_BOOKING"],
    jsonVersion: flowJson.version,
    validationErrors: [],
    lastError: "",
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
  return data;
};

const uploadAppointmentFlowJson = async (
  workspace: any,
  flowJson: Record<string, any>,
) => {
  const formData = new (globalThis as any).FormData();
  const flowBlob = new (globalThis as any).Blob([JSON.stringify(flowJson)], {
    type: "application/json",
  });
  formData.set("name", "flow.json");
  formData.set("asset_type", "FLOW_JSON");
  formData.set("file", flowBlob, "flow.json");

  const version = workspace.meta?.graphApiVersion || metaGraphApiVersion;
  const response = await fetch(
    `https://graph.facebook.com/${version}/${workspace.appointmentFlow.flowId}/assets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workspace.meta.accessToken}`,
      },
      body: formData,
    } as any,
  );
  const data = await response.json().catch(() => ({}));
  const validationErrors = Array.isArray(data?.validation_errors)
    ? data.validation_errors
    : [];
  workspace.appointmentFlow = {
    ...workspace.appointmentFlow,
    status: normalizeFlowStatus("draft", validationErrors),
    categories: ["APPOINTMENT_BOOKING"],
    jsonVersion: flowJson.version,
    validationErrors,
    lastError: response.ok
      ? ""
      : data?.error?.message || "Meta Flow JSON upload failed",
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
  if (!response.ok) {
    throw new Error(workspace.appointmentFlow.lastError);
  }
  return data;
};

const syncAppointmentFlowStatus = async (workspace: any) => {
  if (!workspace.appointmentFlow?.flowId || !workspace.meta?.accessToken) return;

  try {
    const version = workspace.meta?.graphApiVersion || metaGraphApiVersion;
    const phoneNumberId = cleanString(workspace.meta?.phoneNumberId);
    const fields = phoneNumberId
      ? `id,name,status,categories,validation_errors,json_version,preview,health_status.phone_number(${phoneNumberId})`
      : "id,name,status,categories,validation_errors,json_version,preview";
    const url = new URL(
      `https://graph.facebook.com/${version}/${workspace.appointmentFlow.flowId}`,
    );
    url.searchParams.set("fields", fields);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${workspace.meta.accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      workspace.appointmentFlow.lastError =
        data?.error?.message || "Could not sync WhatsApp Flow status";
      return;
    }
    const validationErrors = Array.isArray(data?.validation_errors)
      ? data.validation_errors
      : [];
    workspace.appointmentFlow = {
      ...workspace.appointmentFlow,
      name: cleanString(data?.name) || workspace.appointmentFlow.name,
      status: normalizeFlowStatus(data?.status, validationErrors),
      categories: Array.isArray(data?.categories)
        ? data.categories
        : workspace.appointmentFlow.categories || ["APPOINTMENT_BOOKING"],
      jsonVersion: cleanString(data?.json_version) || workspace.appointmentFlow.jsonVersion,
      validationErrors,
      lastError: validationErrors.length
        ? validationErrors.map((item: any) => item?.message).filter(Boolean).join("; ")
        : "",
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    workspace.appointmentFlow.lastError =
      error instanceof Error ? error.message : String(error);
  }
};

const publishAppointmentFlow = async (workspace: any) => {
  const version = workspace.meta?.graphApiVersion || metaGraphApiVersion;
  const data = await graphJsonRequest({
    path: `/${workspace.appointmentFlow.flowId}/publish`,
    accessToken: workspace.meta.accessToken,
    version,
  });
  workspace.appointmentFlow = {
    ...workspace.appointmentFlow,
    status: "published",
    validationErrors: [],
    lastError: "",
    publishedAt: new Date(),
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
  return data;
};

const normalizeQualityRating = (value: unknown) => {
  const rating = cleanString(value).toLowerCase();
  if (["low", "medium", "high"].includes(rating)) return rating;
  return "unknown";
};

const fetchFirstWabaPhoneNumber = async (
  wabaId: string,
  accessToken: string,
) => {
  try {
    const phoneNumbers = await graphFetch(
      `/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
      accessToken,
    );
    const phone = phoneNumbers?.data?.[0] || {};
    return {
      phoneNumberId: cleanString(phone.id),
      displayPhoneNumber:
        cleanString(phone.display_phone_number) ||
        cleanString(phone.verified_name),
      qualityRating: normalizeQualityRating(phone.quality_rating),
    };
  } catch (error) {
    console.warn("[whatsapp:connect] Could not fetch WABA phone numbers", {
      wabaId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      phoneNumberId: "",
      displayPhoneNumber: "",
      qualityRating: "unknown",
    };
  }
};

const fetchConnectionFromBusiness = async (
  businessId: string,
  accessToken: string,
) => {
  const edges = [
    "owned_whatsapp_business_accounts",
    "client_whatsapp_business_accounts",
  ];

  for (const edge of edges) {
    try {
      const accounts = await graphFetch(
        `/${businessId}/${edge}?fields=id,name,account_review_status`,
        accessToken,
      );
      for (const account of accounts?.data || []) {
        const wabaId = cleanString(account.id);
        if (!wabaId) continue;
        const phone = await fetchFirstWabaPhoneNumber(wabaId, accessToken);
        return {
          businessId,
          wabaId,
          ...phone,
        };
      }
    } catch (error) {
      console.warn("[whatsapp:connect] Could not fetch WABA edge", {
        businessId,
        edge,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    businessId,
    wabaId: "",
    phoneNumberId: "",
    displayPhoneNumber: "",
    qualityRating: "unknown",
  };
};

const resolveMetaWhatsAppConnection = async ({
  accessToken,
  setup,
  debugData,
}: {
  accessToken: string;
  setup: any;
  debugData: any;
}) => {
  const seeded = {
    businessId:
      cleanString(setup?.businessId) || cleanString(setup?.businessManagerId),
    wabaId: cleanString(setup?.wabaId),
    phoneNumberId: cleanString(setup?.phoneNumberId),
    displayPhoneNumber: cleanString(setup?.displayPhoneNumber),
    qualityRating: "unknown",
  };

  if (seeded.wabaId && !seeded.phoneNumberId) {
    const phone = await fetchFirstWabaPhoneNumber(seeded.wabaId, accessToken);
    seeded.phoneNumberId = phone.phoneNumberId;
    seeded.displayPhoneNumber =
      seeded.displayPhoneNumber || phone.displayPhoneNumber;
    seeded.qualityRating = phone.qualityRating;
  }

  if (seeded.wabaId && seeded.phoneNumberId) return seeded;

  const targetIds = Array.from(
    new Set<string>(
      ((debugData?.data?.granular_scopes || []) as any[])
        .flatMap((scope: any) =>
          Array.isArray(scope?.target_ids) ? scope.target_ids : [],
        )
        .map((targetId: unknown) => cleanString(targetId))
        .filter(Boolean),
    ),
  );

  for (const targetId of targetIds) {
    const phone = await fetchFirstWabaPhoneNumber(targetId, accessToken);
    if (phone.phoneNumberId) {
      return {
        ...seeded,
        wabaId: seeded.wabaId || targetId,
        phoneNumberId: phone.phoneNumberId,
        displayPhoneNumber:
          seeded.displayPhoneNumber || phone.displayPhoneNumber,
        qualityRating: phone.qualityRating,
      };
    }

    const businessConnection = await fetchConnectionFromBusiness(
      targetId,
      accessToken,
    );
    if (businessConnection.wabaId || businessConnection.phoneNumberId) {
      return {
        ...seeded,
        ...businessConnection,
        businessId: seeded.businessId || businessConnection.businessId,
        displayPhoneNumber:
          seeded.displayPhoneNumber || businessConnection.displayPhoneNumber,
      };
    }
  }

  if (seeded.businessId) {
    const businessConnection = await fetchConnectionFromBusiness(
      seeded.businessId,
      accessToken,
    );
    if (businessConnection.wabaId || businessConnection.phoneNumberId) {
      return {
        ...seeded,
        ...businessConnection,
        displayPhoneNumber:
          seeded.displayPhoneNumber || businessConnection.displayPhoneNumber,
      };
    }
  }

  try {
    const businesses = await graphFetch("/me/businesses?fields=id,name", accessToken);
    for (const business of businesses?.data || []) {
      const businessId = cleanString(business.id);
      if (!businessId) continue;
      const businessConnection = await fetchConnectionFromBusiness(
        businessId,
        accessToken,
      );
      if (businessConnection.wabaId || businessConnection.phoneNumberId) {
        return {
          ...seeded,
          ...businessConnection,
          businessId: seeded.businessId || businessConnection.businessId,
          displayPhoneNumber:
            seeded.displayPhoneNumber || businessConnection.displayPhoneNumber,
        };
      }
    }
  } catch (error) {
    console.warn("[whatsapp:connect] Could not list user businesses", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return seeded;
};

const subscribeAppToWaba = async (wabaId: string, accessToken: string) => {
  if (!wabaId) return;

  const url = new URL(
    `https://graph.facebook.com/${metaGraphApiVersion}/${wabaId}/subscribed_apps`,
  );
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { method: "POST" });
  const data: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.warn("[whatsapp:connect] Could not subscribe app to WABA", {
      wabaId,
      error: data?.error?.message || response.statusText,
    });
    return;
  }

  console.info("[whatsapp:connect] App subscribed to WABA", { wabaId });
};

const syncWorkspaceMetaConnection = async (workspace: any) => {
  const accessToken = cleanString(workspace.meta?.accessToken);
  if (!accessToken || (workspace.meta?.wabaId && workspace.meta?.phoneNumberId)) {
    return false;
  }

  const resolvedConnection = await resolveMetaWhatsAppConnection({
    accessToken,
    setup: {
      businessId:
        workspace.onboarding?.businessId || workspace.meta?.businessManagerId,
      wabaId: workspace.meta?.wabaId,
      phoneNumberId: workspace.meta?.phoneNumberId,
      displayPhoneNumber: workspace.meta?.displayPhoneNumber,
      requestedPhoneNumber:
        workspace.onboarding?.requestedPhoneNumber ||
        workspace.meta?.displayPhoneNumber,
    },
    debugData: null,
  });

  if (!resolvedConnection.wabaId && !resolvedConnection.phoneNumberId) {
    return false;
  }

  workspace.onboarding = {
    ...workspace.onboarding,
    businessId:
      workspace.onboarding?.businessId || resolvedConnection.businessId || "",
  };

  workspace.meta = {
    ...workspace.meta,
    businessManagerId:
      workspace.meta?.businessManagerId || resolvedConnection.businessId || "",
    wabaId: workspace.meta?.wabaId || resolvedConnection.wabaId || "",
    phoneNumberId:
      workspace.meta?.phoneNumberId || resolvedConnection.phoneNumberId || "",
    displayPhoneNumber:
      workspace.meta?.displayPhoneNumber ||
      resolvedConnection.displayPhoneNumber ||
      "",
    qualityRating:
      (resolvedConnection.qualityRating as any) ||
      workspace.meta?.qualityRating ||
      "unknown",
  };

  workspace.isConfigured = resolveWorkspaceConfigured(workspace);
  workspace.meta.status = workspace.isConfigured ? "connected" : "needs_setup";
  workspace.onboarding.status = workspace.isConfigured
    ? "connected"
    : workspace.onboarding?.status || "facebook_connected";
  if (workspace.isConfigured) {
    workspace.meta.lastVerifiedAt = new Date();
    workspace.onboarding.connectedAt =
      workspace.onboarding.connectedAt || new Date();
  }

  if (resolvedConnection.wabaId) {
    await subscribeAppToWaba(resolvedConnection.wabaId, accessToken);
  }

  console.info("[whatsapp:connect] Workspace Meta connection synced", {
    workspaceId: String(workspace._id),
    wabaId: workspace.meta.wabaId || null,
    phoneNumberId: workspace.meta.phoneNumberId || null,
    isConfigured: workspace.isConfigured,
  });

  return true;
};

const exchangeFacebookLoginCode = async (
  code: string,
  redirectUri = whatsappOAuthRedirectUri,
) => {
  if (!metaAppSecret) {
    throw new Error("Meta app secret is required to exchange Facebook login code");
  }

  const url = new URL(
    `https://graph.facebook.com/${metaGraphApiVersion}/oauth/access_token`,
  );
  url.searchParams.set("client_id", metaAppId);
  url.searchParams.set("client_secret", metaAppSecret);
  url.searchParams.set("code", code);
  url.searchParams.set("redirect_uri", redirectUri);

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error?.message || "Could not exchange Facebook login code");
  }

  return data.access_token as string;
};

export const getWhatsAppPlansController = async (_req: Request, res: Response) =>
  ok(res, { plans: whatsappPlans });

export const getWhatsAppFacebookConfigController = async (
  _req: Request,
  res: Response,
) => {
  const hostedSignupUrl = new URL(
    "https://business.facebook.com/messaging/whatsapp/onboard/",
  );
  hostedSignupUrl.searchParams.set("app_id", metaAppId);
  hostedSignupUrl.searchParams.set("config_id", embeddedSignupConfigId);
  hostedSignupUrl.searchParams.set(
    "extras",
    JSON.stringify({
      version: "v4",
      sessionInfoVersion: "3",
      featureType: "whatsapp_business_app_onboarding",
    }),
  );
  hostedSignupUrl.searchParams.set("redirect_uri", whatsappOAuthRedirectUri);

  return ok(res, {
    appId: metaAppId,
    graphApiVersion: metaGraphApiVersion,
    embeddedSignupConfigId,
    metaHostedSignupUrl: hostedSignupUrl.toString(),
    oauthRedirectUri: whatsappOAuthRedirectUri,
    integrationType: "tech_provider",
    webhookCallbackUrl: `${process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || ""}/api/webhooks/whatsapp`,
  });
};

export const connectWhatsAppFacebookController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { authResponse, setup } = req.body || {};
    let accessToken = cleanString(authResponse?.accessToken);
    const loginCode = cleanString(authResponse?.code);
    const loginRedirectUri =
      cleanString(authResponse?.redirectUri) || whatsappOAuthRedirectUri;
    const facebookUserId = cleanString(authResponse?.userID);

    if (!metaAppId) {
      return res.status(500).json({
        success: false,
        error: "Meta app id is not configured on the server",
        timestamp: new Date().toISOString(),
      });
    }

    if (!accessToken && loginCode) {
      accessToken = await exchangeFacebookLoginCode(
        loginCode,
        loginRedirectUri,
      );
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook access token or login code is required",
        timestamp: new Date().toISOString(),
      });
    }

    let facebookProfile: any = null;
    let debugData: any = null;
    if (metaAppSecret) {
      const debugUrl = new URL(
        `https://graph.facebook.com/${metaGraphApiVersion}/debug_token`,
      );
      debugUrl.searchParams.set("input_token", accessToken);
      debugUrl.searchParams.set("access_token", `${metaAppId}|${metaAppSecret}`);
      const debugResponse = await fetch(debugUrl);
      debugData = await debugResponse.json();
      if (!debugResponse.ok || !debugData?.data?.is_valid) {
        return res.status(401).json({
          success: false,
          error:
            debugData?.error?.message ||
            "Facebook login token could not be verified",
          timestamp: new Date().toISOString(),
        });
      }
      if (debugData.data.app_id && debugData.data.app_id !== metaAppId) {
        return res.status(401).json({
          success: false,
          error: "Facebook token belongs to a different Meta app",
          timestamp: new Date().toISOString(),
        });
      }
    }

    try {
      facebookProfile = await graphFetch(
        "/me?fields=id,name,picture",
        accessToken,
      );
    } catch (error) {
      console.warn("Unable to fetch Facebook profile during WhatsApp connect", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    if (resolveWorkspaceConfigured(workspace)) {
      return res.status(409).json({
        success: false,
        error:
          "WhatsApp is already connected. Delete existing WhatsApp account data before connecting another account.",
        timestamp: new Date().toISOString(),
      });
    }

    const resolvedConnection = await resolveMetaWhatsAppConnection({
      accessToken,
      setup,
      debugData,
    });
    const businessId = resolvedConnection.businessId;
    const wabaId = resolvedConnection.wabaId;
    const phoneNumberId = resolvedConnection.phoneNumberId;
    const displayPhoneNumber = resolvedConnection.displayPhoneNumber;
    const requestedPhoneNumber = cleanString(setup?.requestedPhoneNumber);
    const connected = Boolean(wabaId && phoneNumberId && accessToken);

    console.info("[whatsapp:connect] Meta connection details resolved", {
      businessId: businessId || null,
      wabaId: wabaId || null,
      phoneNumberId: phoneNumberId || null,
      hasAccessToken: Boolean(accessToken),
      connected,
    });

    if (wabaId) {
      await subscribeAppToWaba(wabaId, accessToken);
    }

    workspace.organization = {
      ...workspace.organization,
      name:
        cleanString(setup?.businessDisplayName) ||
        cleanString(setup?.organizationName) ||
        workspace.organization?.name ||
        "My Business",
      industry:
        cleanString(setup?.businessCategory) ||
        workspace.organization?.industry ||
        "Services",
      website:
        cleanString(setup?.businessWebsite) ||
        workspace.organization?.website ||
        "",
      timeZone: workspace.organization?.timeZone || "Asia/Kolkata",
    };

    if (setup?.notificationSettings) {
      const currentSettings = workspace.notificationSettings || {};
      workspace.notificationSettings = {
        email:
          setup.notificationSettings.email !== undefined
            ? cleanString(setup.notificationSettings.email)
            : currentSettings.email || "",
        whatsappNumber:
          setup.notificationSettings.whatsappNumber !== undefined
            ? cleanString(setup.notificationSettings.whatsappNumber)
            : currentSettings.whatsappNumber || "",
        emailEnabled:
          setup.notificationSettings.emailEnabled !== undefined
            ? Boolean(setup.notificationSettings.emailEnabled)
            : currentSettings.emailEnabled !== false,
        whatsappEnabled:
          setup.notificationSettings.whatsappEnabled !== undefined
            ? Boolean(setup.notificationSettings.whatsappEnabled)
            : currentSettings.whatsappEnabled !== false,
      } as any;
    }

    workspace.onboarding = {
      ...workspace.onboarding,
      status: connected ? "connected" : "facebook_connected",
      mode: "embedded_signup",
      facebookUserId: facebookProfile?.id || facebookUserId,
      facebookName: facebookProfile?.name || "",
      businessId,
      phoneSource:
        setup?.phoneSource === "meta_free_number"
          ? "meta_free_number"
          : "official_number",
      requestedPhoneNumber,
      businessDisplayName:
        cleanString(setup?.businessDisplayName) || workspace.organization.name,
      businessWebsite:
        cleanString(setup?.businessWebsite) || workspace.organization.website,
      businessCategory:
        cleanString(setup?.businessCategory) || workspace.organization.industry,
      lastError: "",
      connectedAt: connected ? new Date() : workspace.onboarding?.connectedAt,
    } as any;

    workspace.meta = {
      ...workspace.meta,
      businessManagerId: businessId || workspace.meta?.businessManagerId || "",
      wabaId: wabaId || workspace.meta?.wabaId || "",
      phoneNumberId: phoneNumberId || workspace.meta?.phoneNumberId || "",
      displayPhoneNumber:
        displayPhoneNumber ||
        requestedPhoneNumber ||
        workspace.meta?.displayPhoneNumber ||
        "",
      appId: metaAppId,
      graphApiVersion: metaGraphApiVersion,
      accessToken,
      qualityRating:
        (resolvedConnection.qualityRating as any) ||
        workspace.meta?.qualityRating ||
        "unknown",
    } as any;

    workspace.isConfigured = resolveWorkspaceConfigured(workspace);
    workspace.meta.status = workspace.isConfigured ? "connected" : "needs_setup";
    if (workspace.isConfigured) workspace.meta.lastVerifiedAt = new Date();
    await workspace.save();

    return ok(res, {
      workspace: sanitizeWorkspace(workspace),
      onboarding: workspace.onboarding,
    });
  } catch (error: any) {
    console.error("WhatsApp Facebook connect error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to connect Facebook Business",
      timestamp: new Date().toISOString(),
    });
  }
};

export const getWhatsAppDashboardController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    await syncWorkspaceMetaConnection(workspace);
    pruneExpiredWhatsAppAppointments(workspace);
    workspace.isConfigured = resolveWorkspaceConfigured(workspace);
    workspace.meta.status = workspace.isConfigured ? "connected" : "needs_setup";
    await workspace.save();

    const conversations = workspace.conversations || [];
    const outboundMessages = conversations.flatMap((conversation) =>
      conversation.messages.filter((message) => message.direction === "outbound"),
    );
    const readMessages = outboundMessages.filter(
      (message) => message.status === "read",
    );
    const deliveredMessages = outboundMessages.filter((message) =>
      ["delivered", "read"].includes(message.status),
    );

    return ok(res, {
      workspace: sanitizeWorkspace(workspace),
      overview: {
        totalContacts: workspace.contacts?.length || 0,
        optedInContacts:
          workspace.contacts?.filter((contact) => contact.consentStatus === "opted_in")
            .length || 0,
        openConversations: conversations.filter((item) => item.status !== "resolved").length,
        pendingHuman: conversations.filter((item) => item.status === "pending_human").length,
        totalAppointments: workspace.appointments?.length || 0,
        requestedAppointments:
          workspace.appointments?.filter((item) =>
            ["requested", "active"].includes(item.status),
          )
            .length || 0,
        messagesUsed: workspace.subscription.messagesUsed,
        messageLimit: workspace.subscription.messageLimit,
        deliveredRate:
          outboundMessages.length > 0
            ? Math.round((deliveredMessages.length / outboundMessages.length) * 100)
            : 0,
        readRate:
          outboundMessages.length > 0
            ? Math.round((readMessages.length / outboundMessages.length) * 100)
            : 0,
      },
      recentConversations: conversations
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 10),
      appointments: workspace.appointments
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 25),
      appointmentConfig: workspace.appointmentConfig,
      automationConfig: workspace.automationConfig,
      faqs: workspace.faqs || [],
      businessInfo: workspace.businessInfo,
    });
  } catch (error: any) {
    console.error("WhatsApp dashboard error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load WhatsApp dashboard",
      timestamp: new Date().toISOString(),
    });
  }
};

export const updateWhatsAppWorkspaceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    const {
      organization,
      meta,
      subscription,
      appointmentConfig,
      appointmentFlow,
      automationConfig,
      faqs,
      notificationSettings,
      businessInfo,
      greetingTemplate,
    } = req.body || {};

    if (appointmentFlow || greetingTemplate) {
      return res.status(410).json({
        success: false,
        error:
          "Native WhatsApp Flow and greeting-template configuration have been removed. Use Automations instead.",
        timestamp: new Date().toISOString(),
      });
    }

    if (subscription?.plan && subscription.plan !== "free") {
      const activePackage = await getActivePackageSubscription(userId);
      if (activePackage && subscription.plan !== "package") {
        return res.status(409).json({
          success: false,
          error:
            "Cancel the active common package before buying a standalone WhatsApp plan.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (organization) {
      workspace.organization = {
        ...workspace.organization,
        ...organization,
      };
    }

    if (meta && Object.keys(meta).length > 0) {
      return res.status(403).json({
        success: false,
        error:
          "Manual Meta credential editing is disabled. Use Facebook Business connect.",
        timestamp: new Date().toISOString(),
      });
    }

    if (subscription?.plan) {
      const plan = getPlanById(subscription.plan);
      if (plan.id !== "free" && plan.id !== "package") {
        const missingSetupFields = getMissingWhatsAppSetupFields(workspace);
        if (missingSetupFields.length > 0) {
          return res.status(409).json({
            success: false,
            error:
              "Complete WhatsApp Meta setup before activating a paid WhatsApp plan.",
            data: {
              missingFields: missingSetupFields,
              setupUrl: "/whatsapp/settings",
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      workspace.subscription.plan = plan.id;
      workspace.subscription.messageLimit = plan.messageLimit;
      workspace.subscription.numbersLimit = plan.numbersLimit;
      workspace.subscription.seatsLimit = plan.seatsLimit;
      workspace.subscription.agentsLimit = plan.agentsLimit;
      workspace.subscription.status = "active";
      if (subscription.billingCycle) {
        workspace.subscription.billingCycle = subscription.billingCycle;
      }
    }

    if (appointmentConfig) {
      workspace.appointmentConfig = {
        ...workspace.appointmentConfig,
        ...appointmentConfig,
        services: Array.isArray(appointmentConfig.services)
          ? appointmentConfig.services
              .map((service: any) => ({
                name: cleanString(service?.name).slice(0, 80),
                description: cleanString(service?.description).slice(0, 500),
                durationMinutes: clampNumber(
                  service?.durationMinutes || 30,
                  15,
                  480,
                ),
                priceInr: Math.max(0, Number(service?.priceInr || 0)),
                doctor: cleanString(service?.doctor).slice(0, 80),
                isActive: service?.isActive !== false,
              }))
              .filter((service: any) => service.name)
              .slice(0, 20)
          : workspace.appointmentConfig.services,
      } as any;
      workspace.appointmentFlow = {
        ...workspace.appointmentFlow,
        status:
          workspace.appointmentFlow?.status === "published"
            ? workspace.appointmentFlow.status
            : "draft",
        validationErrors: [],
        lastError: "",
        updatedAt: new Date(),
      } as any;
    }

    if (automationConfig) {
      const currentAutomation = workspace.automationConfig || ({} as any);
      const currentFollowUps = currentAutomation.followUps || {};
      const menuOptions = Array.isArray(automationConfig.menuOptions)
        ? automationConfig.menuOptions
            .map((option: any) => ({
              id: cleanString(option?.id),
              title: cleanString(option?.title).slice(0, 24),
              description: cleanString(option?.description).slice(0, 72),
              enabled: option?.enabled !== false,
            }))
            .filter(
              (option: any) =>
                automationMenuIds.has(option.id) && option.title,
            )
            .slice(0, 10)
        : currentAutomation.menuOptions;
      const appointmentQuestions = Array.isArray(
        automationConfig.appointmentQuestions,
      )
        ? automationConfig.appointmentQuestions
            .map((question: any, index: number) => ({
              id:
                cleanString(question?.id)
                  .replace(/[^a-zA-Z0-9_-]/g, "_")
                  .slice(0, 60) || `question_${index + 1}`,
              field: cleanString(question?.field),
              question: cleanString(question?.question).slice(0, 240),
              type: cleanString(question?.type) || "text",
              required: question?.required !== false,
              options: Array.isArray(question?.options)
                ? question.options
                    .map(cleanString)
                    .filter(Boolean)
                    .slice(0, 10)
                : [],
            }))
            .filter(
              (question: any) =>
                automationQuestionFields.has(question.field) &&
                automationQuestionTypes.has(question.type) &&
                question.question,
            )
            .slice(0, 10)
        : currentAutomation.appointmentQuestions;
      const followUps = automationConfig.followUps || {};
      workspace.automationConfig = {
        ...currentAutomation,
        enabled:
          automationConfig.enabled !== undefined
            ? Boolean(automationConfig.enabled)
            : currentAutomation.enabled !== false,
        greetingMessage:
          cleanString(automationConfig.greetingMessage).slice(0, 1024) ||
          currentAutomation.greetingMessage,
        menuMessage:
          cleanString(automationConfig.menuMessage).slice(0, 1024) ||
          currentAutomation.menuMessage,
        supportPrompt:
          cleanString(automationConfig.supportPrompt).slice(0, 1024) ||
          currentAutomation.supportPrompt,
        pricingMessage:
          cleanString(automationConfig.pricingMessage).slice(0, 1024) ||
          currentAutomation.pricingMessage,
        negotiationMessage:
          cleanString(automationConfig.negotiationMessage).slice(0, 1024) ||
          currentAutomation.negotiationMessage,
        ownerContactMessage:
          cleanString(automationConfig.ownerContactMessage).slice(0, 1024) ||
          currentAutomation.ownerContactMessage,
        menuOptions,
        appointmentQuestions,
        followUps: {
          ...currentFollowUps,
          enabled:
            followUps.enabled !== undefined
              ? Boolean(followUps.enabled)
              : currentFollowUps.enabled !== false,
          firstDelayMinutes: clampNumber(
            followUps.firstDelayMinutes || currentFollowUps.firstDelayMinutes || 30,
            5,
            1440,
          ),
          secondDelayMinutes: clampNumber(
            followUps.secondDelayMinutes ||
              currentFollowUps.secondDelayMinutes ||
              180,
            5,
            1440,
          ),
          firstMessage:
            cleanString(followUps.firstMessage).slice(0, 1024) ||
            currentFollowUps.firstMessage,
          secondMessage:
            cleanString(followUps.secondMessage).slice(0, 1024) ||
            currentFollowUps.secondMessage,
        },
        updatedAt: new Date(),
      } as any;
    }

    if (Array.isArray(faqs)) {
      const now = new Date();
      workspace.faqs = faqs
        .map((faq: any, index: number) => ({
          id:
            cleanString(faq?.id)
              .replace(/[^a-zA-Z0-9_-]/g, "_")
              .slice(0, 80) || `faq_${Date.now()}_${index}`,
          question: cleanString(faq?.question).slice(0, 240),
          answer: cleanString(faq?.answer).slice(0, 2000),
          isActive: faq?.isActive !== false,
          order: index,
          createdAt: faq?.createdAt ? new Date(faq.createdAt) : now,
          updatedAt: now,
        }))
        .filter((faq: any) => faq.question && faq.answer)
        .slice(0, 50) as any;
    }

    if (appointmentFlow) {
      const currentFlow = workspace.appointmentFlow || {};
      const endpointUri =
        appointmentFlow.endpointUri !== undefined
          ? cleanString(appointmentFlow.endpointUri)
          : cleanString(currentFlow.endpointUri) || defaultWhatsAppFlowEndpointUri;
      const publicKey =
        appointmentFlow.publicKey !== undefined
          ? cleanString(appointmentFlow.publicKey)
          : cleanString(currentFlow.publicKey) || defaultWhatsAppFlowPublicKey;
      workspace.appointmentFlow = {
        ...currentFlow,
        enabled:
          appointmentFlow.enabled !== undefined
            ? Boolean(appointmentFlow.enabled)
            : currentFlow.enabled !== false,
        name:
          cleanString(appointmentFlow.name) ||
          currentFlow.name ||
          "RocketReplai Appointment Booking",
        endpointUri,
        publicKey,
        endpointStatus: endpointUri
          ? currentFlow.endpointStatus === "healthy"
            ? "healthy"
            : "configured"
          : "missing",
        publicKeyStatus: publicKey
          ? currentFlow.publicKeyStatus === "signed"
            ? "signed"
            : "added"
          : "missing",
        phoneNumberStatus: workspace.meta?.phoneNumberId ? "added" : "missing",
        metaAppStatus: workspace.meta?.wabaId ? "connected" : "missing",
        departmentLabel:
          cleanString(appointmentFlow.departmentLabel) ||
          currentFlow.departmentLabel ||
          "Department",
        locationLabel:
          cleanString(appointmentFlow.locationLabel) ||
          currentFlow.locationLabel ||
          "Location",
        serviceLabel:
          cleanString(appointmentFlow.serviceLabel) ||
          currentFlow.serviceLabel ||
          "Service",
        customerNameLabel:
          cleanString(appointmentFlow.customerNameLabel) ||
          currentFlow.customerNameLabel ||
          "Full name",
        phoneLabel:
          cleanString(appointmentFlow.phoneLabel) ||
          currentFlow.phoneLabel ||
          "Phone number",
        requirementLabel:
          cleanString(appointmentFlow.requirementLabel) ||
          currentFlow.requirementLabel ||
          "Requirement",
        dateLabel:
          cleanString(appointmentFlow.dateLabel) ||
          currentFlow.dateLabel ||
          "Preferred date",
        timeLabel:
          cleanString(appointmentFlow.timeLabel) ||
          currentFlow.timeLabel ||
          "Preferred time",
        submitButtonLabel:
          cleanString(appointmentFlow.submitButtonLabel) ||
          currentFlow.submitButtonLabel ||
          "Book appointment",
        successMessage:
          cleanString(appointmentFlow.successMessage) ||
          currentFlow.successMessage ||
          "Thanks. Your appointment request has been sent. The business team will confirm availability soon.",
        departmentOptions: Array.isArray(appointmentFlow.departmentOptions)
          ? appointmentFlow.departmentOptions.map(cleanString).filter(Boolean).slice(0, 20)
          : currentFlow.departmentOptions || ["General", "Sales", "Support"],
        locationOptions: Array.isArray(appointmentFlow.locationOptions)
          ? appointmentFlow.locationOptions.map(cleanString).filter(Boolean).slice(0, 20)
          : currentFlow.locationOptions || ["Main branch", "Online consultation"],
        chatQuestions: Array.isArray(appointmentFlow.chatQuestions)
          ? appointmentFlow.chatQuestions
              .map((item: any) => ({
                field: cleanString(item?.field),
                question: cleanString(item?.question).slice(0, 240),
                required: item?.required !== false,
              }))
              .filter(
                (item: any) =>
                  appointmentChatQuestionFields.has(item.field) && item.question,
              )
              .slice(0, 10)
          : currentFlow.chatQuestions?.length
            ? currentFlow.chatQuestions
            : defaultAppointmentChatQuestions,
        status:
          currentFlow.status === "published" ? "draft" : currentFlow.status || "draft",
        validationErrors: [],
        lastError: "",
        updatedAt: new Date(),
      } as any;
    }

    if (businessInfo) {
      const fileSize = Number(businessInfo.fileSize || 0);
      if (fileSize > 10 * 1024 * 1024) {
        return res.status(413).json({
          success: false,
          error: "Business info file must be 10 MB or smaller.",
          timestamp: new Date().toISOString(),
        });
      }
      const hasKnowledgeInput = Boolean(
        cleanString(businessInfo.websiteUrl) ||
          cleanString(businessInfo.summary) ||
          cleanString(businessInfo.fileText) ||
          workspace.businessInfo?.knowledgeBaseUrl,
      );
      workspace.businessInfo = hasKnowledgeInput
        ? ({
            ...workspace.businessInfo,
            ...(await uploadWhatsAppKnowledge({ workspace, businessInfo })),
          } as any)
        : ({
            ...workspace.businessInfo,
            websiteUrl: "",
            summary: "",
            fileName: "",
            fileType: "",
            fileSize: 0,
            fileText: "",
            websiteKnowledgeUrl: "",
            fileKnowledgeUrl: "",
            knowledgeBaseUrl: "",
            knowledgeBaseFileName: "",
            updatedAt: new Date(),
          } as any);
      if (businessInfo.websiteUrl !== undefined) {
        workspace.organization.website = cleanString(businessInfo.websiteUrl);
      }
    }

    if (greetingTemplate) {
      const currentTemplate = workspace.greetingTemplate || {};
      const nextName =
        cleanString(greetingTemplate.name)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "") || "rocket_whatsapp_greeting";
      const nextBody =
        cleanString(greetingTemplate.body) ||
        "Hi, thanks for messaging {{1}}. Please choose an option or share what you need help with.";
      const changed =
        nextName !== currentTemplate.name || nextBody !== currentTemplate.body;
      workspace.greetingTemplate = {
        ...currentTemplate,
        name: nextName,
        language: cleanString(greetingTemplate.language) || "en_US",
        category: "utility",
        status: changed ? "draft" : currentTemplate.status || "draft",
        body: nextBody.slice(0, 1024),
        example:
          cleanString(greetingTemplate.example) ||
          nextBody.replace(/\{\{\s*1\s*\}\}/g, workspace.organization?.name || "Ainspiretech"),
        metaTemplateId: changed ? "" : currentTemplate.metaTemplateId,
        lastError: changed ? "" : currentTemplate.lastError,
        updatedAt: new Date(),
      } as any;
    }

    if (notificationSettings) {
      const currentSettings = workspace.notificationSettings || {};
      workspace.notificationSettings = {
        email:
          notificationSettings.email !== undefined
            ? cleanString(notificationSettings.email)
            : currentSettings.email || "",
        whatsappNumber:
          notificationSettings.whatsappNumber !== undefined
            ? cleanString(notificationSettings.whatsappNumber)
            : currentSettings.whatsappNumber || "",
        emailEnabled:
          notificationSettings.emailEnabled !== undefined
            ? Boolean(notificationSettings.emailEnabled)
            : currentSettings.emailEnabled !== false,
        whatsappEnabled:
          notificationSettings.whatsappEnabled !== undefined
            ? Boolean(notificationSettings.whatsappEnabled)
            : currentSettings.whatsappEnabled !== false,
      } as any;
    }

    workspace.isConfigured = resolveWorkspaceConfigured(workspace);
    workspace.meta.status = workspace.isConfigured ? "connected" : "needs_setup";
    if (workspace.isConfigured) workspace.meta.lastVerifiedAt = new Date();
    await workspace.save();

    return ok(res, { workspace: sanitizeWorkspace(workspace) });
  } catch (error: any) {
    console.error("WhatsApp workspace update error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update WhatsApp workspace",
      timestamp: new Date().toISOString(),
    });
  }
};

export const deleteWhatsAppWorkspaceController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const deletedWorkspace = await WhatsAppWorkspace.findOneAndDelete({
      clerkId: userId,
    });

    return ok(res, {
      deleted: Boolean(deletedWorkspace),
      message:
        "WhatsApp dashboard data, Meta connection data, business info, conversations, appointments, FAQs, and automations were deleted.",
    });
  } catch (error: any) {
    console.error("WhatsApp workspace delete error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete WhatsApp workspace data",
      timestamp: new Date().toISOString(),
    });
  }
};

export const submitWhatsAppGreetingTemplateController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    if (!workspace.meta?.wabaId || !workspace.meta?.accessToken) {
      return res.status(409).json({
        success: false,
        error: "Connect WhatsApp Business before submitting a greeting template.",
        timestamp: new Date().toISOString(),
      });
    }

    const currentTemplate = workspace.greetingTemplate || {};
    const name =
      cleanString(req.body?.name || currentTemplate.name)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "") || "rocket_whatsapp_greeting";
    const body =
      cleanString(req.body?.body || currentTemplate.body) ||
      "Hi, thanks for messaging {{1}}. Please choose an option or share what you need help with.";
    const language = cleanString(req.body?.language || currentTemplate.language) || "en_US";
    const exampleBusinessName = workspace.organization?.name || "Ainspiretech";
    const bodyComponent: Record<string, any> = {
      type: "BODY",
      text: body,
    };
    if (/\{\{\s*1\s*\}\}/.test(body)) {
      bodyComponent.example = {
        body_text: [[exampleBusinessName]],
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/${workspace.meta.graphApiVersion || metaGraphApiVersion}/${workspace.meta.wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${workspace.meta.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          language,
          category: "UTILITY",
          components: [bodyComponent],
        }),
      },
    );
    const data = await response.json().catch(() => ({}) as any);

    workspace.greetingTemplate = {
      ...currentTemplate,
      name,
      language,
      category: "utility",
      body: body.slice(0, 1024),
      example: body.replace(/\{\{\s*1\s*\}\}/g, exampleBusinessName),
      status: response.ok ? "pending" : "draft",
      metaTemplateId: response.ok ? cleanString(data?.id) : currentTemplate.metaTemplateId,
      submittedAt: response.ok ? new Date() : currentTemplate.submittedAt,
      lastError: response.ok
        ? ""
        : data?.error?.message || "Meta template submission failed",
      updatedAt: new Date(),
    } as any;
    await workspace.save();

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        error: workspace.greetingTemplate.lastError,
        data: { greetingTemplate: workspace.greetingTemplate },
        timestamp: new Date().toISOString(),
      });
    }

    return ok(res, {
      greetingTemplate: workspace.greetingTemplate,
      meta: data,
    });
  } catch (error: any) {
    console.error("WhatsApp greeting template submit error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to submit greeting template",
      timestamp: new Date().toISOString(),
    });
  }
};

export const syncWhatsAppAppointmentFlowController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    if (!workspace.meta?.wabaId || !workspace.meta?.accessToken) {
      return res.status(409).json({
        success: false,
        error: "Connect WhatsApp Business before creating a native WhatsApp Flow.",
        timestamp: new Date().toISOString(),
      });
    }

    workspace.appointmentFlow = {
      ...workspace.appointmentFlow,
      endpointUri:
        workspace.appointmentFlow?.endpointUri || defaultWhatsAppFlowEndpointUri,
      publicKey:
        workspace.appointmentFlow?.publicKey || defaultWhatsAppFlowPublicKey,
      endpointStatus:
        workspace.appointmentFlow?.endpointUri || defaultWhatsAppFlowEndpointUri
          ? "configured"
          : "missing",
      publicKeyStatus:
        workspace.appointmentFlow?.publicKey || defaultWhatsAppFlowPublicKey
          ? workspace.appointmentFlow?.publicKeyStatus || "added"
          : "missing",
      phoneNumberStatus: workspace.meta?.phoneNumberId ? "added" : "missing",
      metaAppStatus: workspace.meta?.wabaId ? "connected" : "missing",
    } as any;
    if (!workspace.appointmentFlow?.endpointUri) {
      await workspace.save();
      return res.status(409).json({
        success: false,
        error:
          "Set PUBLIC_API_URL or save a WhatsApp Flow endpoint URI before syncing the Flow.",
        data: { appointmentFlow: workspace.appointmentFlow },
        timestamp: new Date().toISOString(),
      });
    }

    const encryption = await syncAppointmentFlowEncryptionKey(workspace);
    const flowJson = buildAppointmentFlowJson(workspace);
    await syncAppointmentFlowStatus(workspace);
    const shouldCreateNewFlow =
      !workspace.appointmentFlow?.flowId ||
      ["published", "deprecated", "blocked"].includes(
        workspace.appointmentFlow?.status,
      );
    const meta = shouldCreateNewFlow
      ? {
          encryption,
          create: await createAppointmentFlow(workspace, flowJson),
          upload: await uploadAppointmentFlowJson(workspace, flowJson),
        }
      : {
          encryption,
          upload: await uploadAppointmentFlowJson(workspace, flowJson),
        };

    if (
      req.body?.publish &&
      workspace.appointmentFlow?.flowId &&
      !workspace.appointmentFlow?.validationErrors?.length
    ) {
      await publishAppointmentFlow(workspace);
    } else {
      await syncAppointmentFlowStatus(workspace);
    }

    await workspace.save();
    return ok(res, {
      appointmentFlow: workspace.appointmentFlow,
      meta,
      flowJson,
    });
  } catch (error: any) {
    console.error("WhatsApp appointment Flow sync error:", error);
    try {
      const userId = authUserId(req);
      if (userId) {
        const workspace = await getOrCreateWhatsAppWorkspace(userId);
        workspace.appointmentFlow = {
          ...workspace.appointmentFlow,
          status: "error",
          lastError: error.message || "Failed to sync WhatsApp Flow",
          updatedAt: new Date(),
        } as any;
        await workspace.save();
      }
    } catch (saveError) {
      console.warn("Could not persist WhatsApp Flow error state", {
        error: saveError instanceof Error ? saveError.message : String(saveError),
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to sync native WhatsApp Flow",
      timestamp: new Date().toISOString(),
    });
  }
};

export const publishWhatsAppAppointmentFlowController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    if (!workspace.meta?.wabaId || !workspace.meta?.accessToken) {
      return res.status(409).json({
        success: false,
        error: "Connect WhatsApp Business before publishing a native WhatsApp Flow.",
        timestamp: new Date().toISOString(),
      });
    }

    workspace.appointmentFlow = {
      ...workspace.appointmentFlow,
      endpointUri:
        workspace.appointmentFlow?.endpointUri || defaultWhatsAppFlowEndpointUri,
      publicKey:
        workspace.appointmentFlow?.publicKey || defaultWhatsAppFlowPublicKey,
      endpointStatus:
        workspace.appointmentFlow?.endpointUri || defaultWhatsAppFlowEndpointUri
          ? "configured"
          : "missing",
      publicKeyStatus:
        workspace.appointmentFlow?.publicKey || defaultWhatsAppFlowPublicKey
          ? workspace.appointmentFlow?.publicKeyStatus || "added"
          : "missing",
      phoneNumberStatus: workspace.meta?.phoneNumberId ? "added" : "missing",
      metaAppStatus: workspace.meta?.wabaId ? "connected" : "missing",
    } as any;
    if (!workspace.appointmentFlow?.endpointUri) {
      await workspace.save();
      return res.status(409).json({
        success: false,
        error:
          "Set PUBLIC_API_URL or save a WhatsApp Flow endpoint URI before publishing the Flow.",
        data: { appointmentFlow: workspace.appointmentFlow },
        timestamp: new Date().toISOString(),
      });
    }

    await syncAppointmentFlowEncryptionKey(workspace);

    if (!workspace.appointmentFlow?.flowId) {
      const flowJson = buildAppointmentFlowJson(workspace);
      await createAppointmentFlow(workspace, flowJson);
      await uploadAppointmentFlowJson(workspace, flowJson);
    } else {
      await syncAppointmentFlowStatus(workspace);
    }

    if (workspace.appointmentFlow?.validationErrors?.length) {
      await workspace.save();
      return res.status(400).json({
        success: false,
        error: "Fix Meta Flow validation errors before publishing.",
        data: { appointmentFlow: workspace.appointmentFlow },
        timestamp: new Date().toISOString(),
      });
    }

    if (workspace.appointmentFlow.status !== "published") {
      await publishAppointmentFlow(workspace);
    }
    await workspace.save();

    return ok(res, {
      appointmentFlow: workspace.appointmentFlow,
    });
  } catch (error: any) {
    console.error("WhatsApp appointment Flow publish error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to publish native WhatsApp Flow",
      timestamp: new Date().toISOString(),
    });
  }
};

export const getWhatsAppCollectionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const collection = toCollectionName(req.params.collection);
    if (!collection) {
      return res.status(400).json({
        success: false,
        error: "Invalid collection",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    if (collection === "appointments") {
      const removed = pruneExpiredWhatsAppAppointments(workspace);
      if (removed > 0) {
        await workspace.save();
      }
    }
    return ok(res, { [collection]: workspace[collection] || [] });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to load WhatsApp collection",
      timestamp: new Date().toISOString(),
    });
  }
};

export const createWhatsAppCollectionItemController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const collection = toCollectionName(req.params.collection);
    if (!collection) {
      return res.status(400).json({
        success: false,
        error: "Invalid collection",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);

    const itemPayload = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (workspace[collection] as any[]).push(itemPayload);
    await workspace.save();
    const item = (workspace[collection] as any[])[
      (workspace[collection] as any[]).length - 1
    ];

    if (collection === "appointments") {
      sendAppointmentNotifications({
        userId,
        source: "whatsapp",
        sourceRef: String(item?._id || itemPayload.createdAt.getTime()),
        appointment: objectToAppointmentAlert(itemPayload),
        ownerEmail: workspace.notificationSettings?.email,
        ownerWhatsAppNumber: workspace.notificationSettings?.whatsappNumber,
        emailEnabled: workspace.notificationSettings?.emailEnabled !== false,
        whatsappEnabled:
          workspace.notificationSettings?.whatsappEnabled !== false,
        dashboardPath: "/whatsapp/appointments",
      }).catch((error) => {
        console.error("Manual WhatsApp appointment notification error:", error);
      });
    }

    return ok(res, {
      [collection]: workspace[collection],
      item,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create WhatsApp item",
      timestamp: new Date().toISOString(),
    });
  }
};

export const updateWhatsAppAppointmentStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);
    const status = cleanString(req.body?.status);
    const allowedStatuses = new Set([
      "active",
      "confirmed",
      "resolved",
      "cancelled",
      "no_show",
    ]);
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid appointment status",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    pruneExpiredWhatsAppAppointments(workspace);
    const appointment = workspace.appointments.find(
      (item: any) => String(item._id) === req.params.appointmentId,
    );
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: "Appointment not found or already expired",
        timestamp: new Date().toISOString(),
      });
    }
    appointment.status = status as any;
    appointment.updatedAt = new Date();
    if (["resolved", "cancelled", "no_show"].includes(status)) {
      const conversation = workspace.conversations.find(
        (item) => item.waId === appointment.patientWaId,
      );
      if (conversation?.followUp) conversation.followUp.completed = true;
    }
    await workspace.save();
    return ok(res, { appointment });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update appointment status",
      timestamp: new Date().toISOString(),
    });
  }
};

export const sendWhatsAppTextController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = authUserId(req);
    if (!userId) return unauthorized(res);

    const { to, body } = req.body || {};
    if (!to || !body) {
      return res.status(400).json({
        success: false,
        error: "to and body are required",
        timestamp: new Date().toISOString(),
      });
    }

    await connectToDatabase();
    const workspace = await getOrCreateWhatsAppWorkspace(userId);
    const result = await sendWhatsAppTextMessage({ workspace, to, body });

    const now = new Date();
    let conversation = workspace.conversations.find(
      (item) => item.waId === to && item.status !== "resolved",
    );
    if (!conversation) {
      workspace.conversations.push({
        waId: to,
        contactName: to,
        phone: to,
        lastMessage: body,
        owner: "human",
        status: "open",
        intent: "general",
        sentiment: "neutral",
        messages: [],
        createdAt: now,
        updatedAt: now,
      });
      conversation = workspace.conversations[workspace.conversations.length - 1];
    }

    conversation.lastMessage = body;
    conversation.owner = "human";
    conversation.updatedAt = now;
    conversation.messages.push({
      providerMessageId: result?.messages?.[0]?.id,
      direction: "outbound",
      type: "text",
      body,
      status: "sent",
      createdAt: now,
    });
    workspace.subscription.messagesUsed += 1;
    await workspace.save();

    return ok(res, { result, conversation });
  } catch (error: any) {
    console.error("WhatsApp send message error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send WhatsApp message",
      timestamp: new Date().toISOString(),
    });
  }
};
