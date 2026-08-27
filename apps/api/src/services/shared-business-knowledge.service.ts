import { connectToDatabase } from "@/config/database.config";
import { scrapeWebsitePagesForKnowledge } from "@/controllers/web/scrape/scrap-anu.controller";
import SharedBusinessKnowledge, {
  ISharedBusinessKnowledge,
} from "@/models/SharedBusinessKnowledge.model";
import User from "@/models/user.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import { compactSharedBusinessKnowledge } from "@/services/ai.service";
import { deleteFromCloudinary } from "@/services/cloudinary.service";
import { uploadTextAssetToCloudinary } from "@/services/transaction.service";

const WEBSITE_HEADING = "=== WEBSITE KNOWLEDGE ===";
const OWNER_HEADING = "=== OWNER INFORMATION ===";
const FILE_HEADING = "=== UPLOADED FILE KNOWLEDGE ===";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface SharedKnowledgeUpdate {
  websiteUrl?: string;
  businessInfo?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileText?: string;
  removeWebsite?: boolean;
  removeFile?: boolean;
}

interface KnowledgeSections {
  website: string;
  owner: string;
  file: string;
  hasMarkers: boolean;
}

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeKnowledgeText = (value: unknown, maxCharacters: number) => {
  const cleaned = String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/data:image\/[^;]+;base64,[a-z0-9+/=]+/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?\S*)?/gi, " ")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const seen = new Set<string>();
  return cleaned
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter((segment) => {
      if (segment.length < 2 || /^none$/i.test(segment)) return false;
      const key = segment.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n")
    .slice(0, maxCharacters)
    .trim();
};

const parseKnowledgeSections = (raw: string): KnowledgeSections => {
  const websiteIndex = raw.indexOf(WEBSITE_HEADING);
  const ownerIndex = raw.indexOf(OWNER_HEADING);
  const fileIndex = raw.indexOf(FILE_HEADING);
  const hasMarkers =
    websiteIndex >= 0 && ownerIndex > websiteIndex && fileIndex > ownerIndex;

  if (!hasMarkers) {
    return { website: "", owner: "", file: raw.trim(), hasMarkers: false };
  }

  return {
    website: raw.slice(websiteIndex + WEBSITE_HEADING.length, ownerIndex).trim(),
    owner: raw.slice(ownerIndex + OWNER_HEADING.length, fileIndex).trim(),
    file: raw.slice(fileIndex + FILE_HEADING.length).trim(),
    hasMarkers: true,
  };
};

const serializeKnowledgeSections = (sections: KnowledgeSections) =>
  `${WEBSITE_HEADING}\n${sections.website || "No website information provided."}\n\n${OWNER_HEADING}\n${sections.owner || "No owner information provided."}\n\n${FILE_HEADING}\n${sections.file || "No uploaded file information provided."}`;

const dedupeSectionsLocally = ({
  website,
  owner,
  file,
}: Omit<KnowledgeSections, "hasMarkers">): KnowledgeSections => {
  const seen = new Set<string>();
  const dedupe = (text: string, maxCharacters: number) =>
    normalizeKnowledgeText(text, maxCharacters)
      .split("\n")
      .filter((line) => {
        const key = line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join("\n");

  // Owner-entered facts win, followed by website facts and uploaded files.
  const ownerResult = dedupe(owner, 6000);
  const websiteResult = dedupe(website, 14000);
  const fileResult = dedupe(file, 9000);
  return {
    website: websiteResult,
    owner: ownerResult,
    file: fileResult,
    hasMarkers: true,
  };
};

const downloadKnowledge = async (url: string) => {
  if (!url) return "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const getCurrentSections = async (
  knowledge: ISharedBusinessKnowledge | null,
): Promise<KnowledgeSections> => {
  if (!knowledge?.knowledgeBaseUrl) {
    return { website: "", owner: "", file: "", hasMarkers: true };
  }

  try {
    const raw = await downloadKnowledge(knowledge.knowledgeBaseUrl);
    const parsed = parseKnowledgeSections(raw);
    if (parsed.hasMarkers) return parsed;

    // Migrate a legacy single artifact into the source most likely to own it.
    if (knowledge.fileName) return { ...parsed, file: raw };
    if (knowledge.websiteUrl) {
      return { ...parsed, website: raw, file: "" };
    }
    return { ...parsed, owner: raw, file: "" };
  } catch (error) {
    console.warn("[shared-knowledge] Could not load existing artifact", {
      clerkId: knowledge.clerkId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { website: "", owner: "", file: "", hasMarkers: true };
  }
};

const getBusinessName = async (clerkId: string) => {
  const [workspace, user] = await Promise.all([
    WhatsAppWorkspace.findOne({ clerkId }).select("organization.name").lean(),
    User.findOne({ clerkId }).select("firstName lastName username").lean(),
  ]);
  return (
    cleanString((workspace as any)?.organization?.name) ||
    [cleanString((user as any)?.firstName), cleanString((user as any)?.lastName)]
      .filter(Boolean)
      .join(" ") ||
    cleanString((user as any)?.username) ||
    "Business"
  );
};

const safeFileName = (value: string) =>
  value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120) || "business_info";

const deleteKnowledgeArtifact = async (
  knowledge: ISharedBusinessKnowledge | null,
) => {
  if (!knowledge) return;
  let publicId = knowledge.knowledgeBasePublicId;
  let resourceType: "image" | "raw" =
    knowledge.knowledgeBaseResourceType || "raw";
  if (!publicId && knowledge.knowledgeBaseUrl) {
    try {
      const pathname = decodeURIComponent(
        new URL(knowledge.knowledgeBaseUrl).pathname,
      );
      const match = pathname.match(
        /^\/[^/]+\/(image|raw)\/upload\/(?:v\d+\/)?(.+)$/,
      );
      if (match) {
        resourceType = match[1] === "raw" ? "raw" : "image";
        publicId = match[2].replace(/\.[a-z0-9]+$/i, "");
      }
    } catch {
      // Invalid legacy URLs are simply detached from the database below.
    }
  }
  if (!publicId) return;
  try {
    await deleteFromCloudinary(publicId, resourceType);
  } catch (error) {
    console.warn("[shared-knowledge] Could not delete old Cloudinary artifact", {
      clerkId: knowledge.clerkId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const syncLegacyKnowledgeReferences = async ({
  clerkId,
  websiteUrl,
  businessInfo,
  fileName,
  fileType,
  fileSize,
  knowledgeBaseUrl,
  knowledgeBaseFileName,
  knowledgeUpdatedAt,
}: {
  clerkId: string;
  websiteUrl: string;
  businessInfo: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  knowledgeBaseUrl: string;
  knowledgeBaseFileName: string;
  knowledgeUpdatedAt?: Date;
}) => {
  const ready = Boolean(knowledgeBaseUrl);
  await Promise.all([
    WebChatbot.updateMany(
      { clerkId },
      {
        $set: {
          websiteUrl,
          scrappedFile: knowledgeBaseUrl,
          isScrapped: ready,
        },
      },
    ),
    WhatsAppWorkspace.updateOne(
      { clerkId },
      {
        $set: {
          "organization.website": websiteUrl,
          "businessInfo.websiteUrl": websiteUrl,
          "businessInfo.summary": businessInfo,
          "businessInfo.fileName": fileName,
          "businessInfo.fileType": fileType,
          "businessInfo.fileSize": fileSize,
          "businessInfo.fileText": "",
          "businessInfo.websiteKnowledgeUrl": "",
          "businessInfo.fileKnowledgeUrl": "",
          "businessInfo.knowledgeBaseUrl": knowledgeBaseUrl,
          "businessInfo.knowledgeBaseFileName": knowledgeBaseFileName,
          "businessInfo.knowledgeUpdatedAt": knowledgeUpdatedAt,
          "businessInfo.updatedAt": new Date(),
        },
      },
    ),
  ]);
};

export const toPublicSharedKnowledge = (
  knowledge: ISharedBusinessKnowledge | null,
) => ({
  websiteUrl: knowledge?.websiteUrl || "",
  businessInfo: knowledge?.businessInfo || "",
  fileName: knowledge?.fileName || "",
  fileType: knowledge?.fileType || "",
  fileSize: Number(knowledge?.fileSize || 0),
  hasKnowledge: Boolean(knowledge?.knowledgeBaseUrl),
  knowledgeUpdatedAt: knowledge?.knowledgeUpdatedAt || null,
});

export async function getSharedBusinessKnowledge(clerkId: string) {
  await connectToDatabase();
  let knowledge = await SharedBusinessKnowledge.findOne({ clerkId });
  if (knowledge) return knowledge;

  const [workspace, webChatbot] = await Promise.all([
    WhatsAppWorkspace.findOne({ clerkId }).lean(),
    WebChatbot.findOne({ clerkId }).lean(),
  ]);
  const whatsappInfo = (workspace as any)?.businessInfo || {};
  const knowledgeBaseUrl =
    cleanString(whatsappInfo.knowledgeBaseUrl) ||
    cleanString((webChatbot as any)?.scrappedFile);
  const websiteUrl =
    cleanString(whatsappInfo.websiteUrl) ||
    cleanString((webChatbot as any)?.websiteUrl);
  const businessInfo = cleanString(whatsappInfo.summary);
  const fileName = cleanString(whatsappInfo.fileName);

  if (!knowledgeBaseUrl && !websiteUrl && !businessInfo && !fileName) {
    return null;
  }

  try {
    knowledge = await SharedBusinessKnowledge.create({
      clerkId,
      websiteUrl,
      businessInfo,
      fileName,
      fileType: cleanString(whatsappInfo.fileType),
      fileSize: Number(whatsappInfo.fileSize || 0),
      knowledgeBaseUrl,
      knowledgeBaseFileName: cleanString(whatsappInfo.knowledgeBaseFileName),
      knowledgeUpdatedAt: whatsappInfo.knowledgeUpdatedAt || new Date(),
    });
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    knowledge = await SharedBusinessKnowledge.findOne({ clerkId });
  }
  return knowledge;
}

export async function updateSharedBusinessKnowledge(
  clerkId: string,
  update: SharedKnowledgeUpdate,
) {
  await connectToDatabase();
  const current = await getSharedBusinessKnowledge(clerkId);
  const sections = await getCurrentSections(current);
  const websiteProvided = update.websiteUrl !== undefined;
  const ownerProvided = update.businessInfo !== undefined;
  const nextWebsiteUrl = update.removeWebsite
    ? ""
    : websiteProvided
      ? cleanString(update.websiteUrl)
      : current?.websiteUrl || "";
  const nextBusinessInfo = ownerProvided
    ? cleanString(update.businessInfo).slice(0, 12000)
    : current?.businessInfo || "";
  const fileText = cleanString(update.fileText);
  const nextFileName = update.removeFile
    ? ""
    : fileText
      ? cleanString(update.fileName)
      : current?.fileName || "";
  const nextFileType = update.removeFile
    ? ""
    : fileText
      ? cleanString(update.fileType) || "text/plain"
      : current?.fileType || "";
  const nextFileSize = update.removeFile
    ? 0
    : fileText
      ? Number(update.fileSize || 0)
      : Number(current?.fileSize || 0);

  if (nextFileSize > MAX_FILE_SIZE) {
    throw new Error("Business info file must be 10 MB or smaller.");
  }
  if (nextWebsiteUrl) {
    const parsed = new URL(nextWebsiteUrl);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Website URL must use HTTP or HTTPS.");
    }
  }

  const websiteChanged = nextWebsiteUrl !== (current?.websiteUrl || "");
  let websiteKnowledge = update.removeWebsite ? "" : sections.website;
  if (
    nextWebsiteUrl &&
    (websiteChanged ||
      !sections.hasMarkers ||
      !normalizeKnowledgeText(websiteKnowledge, 20))
  ) {
    const scrapeResult = await scrapeWebsitePagesForKnowledge(nextWebsiteUrl);
    websiteKnowledge = normalizeKnowledgeText(
      scrapeResult.scrapedPages
        .map(
          (page: any) =>
            `Page: ${cleanString(page?.url)}\n${cleanString(
              page?.fullText || page?.content,
            )}`,
        )
        .join("\n\n"),
      14000,
    );
  }
  if (!nextWebsiteUrl) websiteKnowledge = "";

  const ownerKnowledge = normalizeKnowledgeText(nextBusinessInfo, 6000);
  const uploadedFileKnowledge = update.removeFile
    ? ""
    : fileText
      ? normalizeKnowledgeText(fileText, 9000)
      : sections.file;
  const hasAnyKnowledge = Boolean(
    nextWebsiteUrl || ownerKnowledge || uploadedFileKnowledge,
  );

  if (!hasAnyKnowledge) {
    await deleteKnowledgeArtifact(current);
    await SharedBusinessKnowledge.deleteOne({ clerkId });
    await syncLegacyKnowledgeReferences({
      clerkId,
      websiteUrl: "",
      businessInfo: "",
      fileName: "",
      fileType: "",
      fileSize: 0,
      knowledgeBaseUrl: "",
      knowledgeBaseFileName: "",
    });
    return null;
  }

  const businessName = await getBusinessName(clerkId);
  const localSections = dedupeSectionsLocally({
    website: [nextWebsiteUrl ? `Website: ${nextWebsiteUrl}` : "", websiteKnowledge]
      .filter(Boolean)
      .join("\n"),
    owner: [`Business name: ${businessName}`, ownerKnowledge]
      .filter(Boolean)
      .join("\n"),
    file: uploadedFileKnowledge,
  });
  let compacted = serializeKnowledgeSections(localSections);
  try {
    const aiCompacted = await compactSharedBusinessKnowledge({
      businessName,
      websiteUrl: nextWebsiteUrl,
      websiteKnowledge: localSections.website,
      ownerInformation: localSections.owner,
      uploadedFileName: nextFileName,
      uploadedFileKnowledge: localSections.file,
    });
    if (parseKnowledgeSections(aiCompacted).hasMarkers) {
      compacted = aiCompacted;
    } else {
      console.warn(
        "[shared-knowledge] AI output omitted source headings; using local compaction",
        { clerkId },
      );
    }
  } catch (error) {
    console.warn("[shared-knowledge] AI compaction failed; using local compaction", {
      clerkId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const knowledgeBaseFileName = `shared_${clerkId}_${Date.now()}_${safeFileName(
    nextWebsiteUrl || nextFileName || "business_info",
  )}`;
  const asset = await uploadTextAssetToCloudinary(
    compacted,
    knowledgeBaseFileName,
  );
  const now = new Date();
  const saved = await SharedBusinessKnowledge.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        websiteUrl: nextWebsiteUrl,
        businessInfo: nextBusinessInfo,
        fileName: nextFileName,
        fileType: nextFileType,
        fileSize: nextFileSize,
        knowledgeBaseUrl: asset.secureUrl,
        knowledgeBasePublicId: asset.publicId,
        knowledgeBaseResourceType: asset.resourceType,
        knowledgeBaseFileName,
        knowledgeUpdatedAt: now,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  await syncLegacyKnowledgeReferences({
    clerkId,
    websiteUrl: nextWebsiteUrl,
    businessInfo: nextBusinessInfo,
    fileName: nextFileName,
    fileType: nextFileType,
    fileSize: nextFileSize,
    knowledgeBaseUrl: asset.secureUrl,
    knowledgeBaseFileName,
    knowledgeUpdatedAt: now,
  });
  if (current?.knowledgeBaseUrl !== asset.secureUrl) {
    await deleteKnowledgeArtifact(current);
  }
  return saved;
}

export async function deleteSharedBusinessKnowledge(clerkId: string) {
  await connectToDatabase();
  const current = await SharedBusinessKnowledge.findOne({ clerkId });
  await deleteKnowledgeArtifact(current);
  await SharedBusinessKnowledge.deleteOne({ clerkId });
  await syncLegacyKnowledgeReferences({
    clerkId,
    websiteUrl: "",
    businessInfo: "",
    fileName: "",
    fileType: "",
    fileSize: 0,
    knowledgeBaseUrl: "",
    knowledgeBaseFileName: "",
  });
}
