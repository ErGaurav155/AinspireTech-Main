import { connectToDatabase } from "@/config/database.config";
import { scrapeWebsitePagesForKnowledge } from "@/controllers/web/scrape/scrap-anu.controller";
import SharedBusinessKnowledge, {
  ISharedBusinessKnowledge,
} from "@/models/SharedBusinessKnowledge.model";
import User from "@/models/user.model";
import WebChatbot from "@/models/web/WebChatbot.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";
import {
  compactSharedBusinessKnowledge,
  normalizeSharedBusinessKnowledgeSource,
} from "@/services/ai.service";
import { deleteFromCloudinary } from "@/services/cloudinary.service";
import {
  createSharedKnowledgeArtifact,
  getSharedKnowledgeSourceArchive,
} from "@/services/shared-business-knowledge-format";
import { uploadTextAssetToCloudinary } from "@/services/transaction.service";

const WEBSITE_HEADING = "=== WEBSITE KNOWLEDGE ===";
const OWNER_HEADING = "=== OWNER INFORMATION ===";
const FILE_HEADING = "=== UPLOADED FILE KNOWLEDGE ===";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_AI_INPUT_TOKENS = 5000;
const RESERVED_AI_PROMPT_TOKENS = 1000;
const CONSERVATIVE_CHARACTERS_PER_TOKEN = 3;
const MAX_AI_SOURCE_INPUT_CHARACTERS =
  (MAX_AI_INPUT_TOKENS - RESERVED_AI_PROMPT_TOKENS) *
  CONSERVATIVE_CHARACTERS_PER_TOKEN;
const MAX_AI_MERGE_INPUT_CHARACTERS = MAX_AI_SOURCE_INPUT_CHARACTERS;

export interface SharedKnowledgeUpdate {
  websiteUrl?: string;
  businessInfo?: string;
  websitePages?: Array<{ url?: string; content?: string; fullText?: string }>;
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
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
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

const normalizeSourceKnowledge = async ({
  clerkId,
  businessName,
  sourceType,
  sourceName,
  content,
  maxCharacters,
}: {
  clerkId: string;
  businessName: string;
  sourceType: "website" | "owner" | "file";
  sourceName: string;
  content: string;
  maxCharacters: number;
}) => {
  const inputLimit = Math.min(maxCharacters, MAX_AI_SOURCE_INPUT_CHARACTERS);
  const localFallback = normalizeKnowledgeText(content, inputLimit);
  if (!localFallback) return "";

  try {
    const normalized = await normalizeSharedBusinessKnowledgeSource({
      businessName,
      sourceType,
      sourceName,
      content: localFallback,
      maxCharacters,
    });
    return normalizeKnowledgeText(normalized, maxCharacters) || localFallback;
  } catch (error) {
    console.warn("[shared-knowledge] AI source normalization failed", {
      clerkId,
      sourceType,
      error: error instanceof Error ? error.message : String(error),
    });
    return localFallback;
  }
};

const buildWebsiteSourceText = (pages: any[]) => {
  const validPages = pages.filter(
    (page) => cleanString(page?.fullText || page?.content),
  );
  if (validPages.length === 0) return "";

  const perPageCharacters = Math.max(
    500,
    Math.floor(MAX_AI_SOURCE_INPUT_CHARACTERS / validPages.length) - 160,
  );
  return validPages
    .map((page) => {
      const url = cleanString(page?.url);
      const content = cleanString(page?.fullText || page?.content).slice(
        0,
        perPageCharacters,
      );
      return `Page: ${url}\n${content}`;
    })
    .join("\n\n")
    .slice(0, MAX_AI_SOURCE_INPUT_CHARACTERS);
};

const fitSourcesIntoMergeBudget = ({
  website,
  owner,
  file,
}: Omit<KnowledgeSections, "hasMarkers">) => {
  const sources = [website, owner, file];
  const nonEmptyCount = Math.max(1, sources.filter(Boolean).length);
  const perSourceLimit = Math.floor(
    MAX_AI_MERGE_INPUT_CHARACTERS / nonEmptyCount,
  );
  return {
    website: website.slice(0, perSourceLimit),
    owner: owner.slice(0, perSourceLimit),
    file: file.slice(0, perSourceLimit),
    hasMarkers: true,
  } satisfies KnowledgeSections;
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
    const sourceArchive = getSharedKnowledgeSourceArchive(raw);
    const parsed = parseKnowledgeSections(sourceArchive);
    if (parsed.hasMarkers) return parsed;

    // Migrate a legacy single artifact into the source most likely to own it.
    if (knowledge.fileName) return { ...parsed, file: sourceArchive };
    if (knowledge.websiteUrl) {
      return { ...parsed, website: sourceArchive, file: "" };
    }
    return { ...parsed, owner: sourceArchive, file: "" };
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

const syncKnowledgeConsumers = async ({
  clerkId,
  websiteUrl,
  knowledgeBaseUrl,
}: {
  clerkId: string;
  websiteUrl: string;
  knowledgeBaseUrl: string;
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
    // Remove the pre-shared-model copy. WhatsApp reads the canonical shared
    // document directly and must not own a second knowledge artifact.
    WhatsAppWorkspace.collection.updateOne(
      { clerkId },
      { $unset: { businessInfo: "" } } as any,
    ),
  ]);
};

export const toPublicSharedKnowledge = async (
  knowledge: ISharedBusinessKnowledge | null,
) => {
  const sections = await getCurrentSections(knowledge);
  return {
    websiteUrl: knowledge?.websiteUrl || "",
    businessInfo: sections.owner || "",
    fileName: knowledge?.fileName || "",
    fileType: knowledge?.fileType || "",
    fileSize: Number(knowledge?.fileSize || 0),
    hasKnowledge: Boolean(knowledge?.knowledgeBaseUrl),
    knowledgeUpdatedAt: knowledge?.knowledgeUpdatedAt || null,
  };
};

export async function getSharedBusinessKnowledge(
  clerkId: string,
): Promise<ISharedBusinessKnowledge | null> {
  await connectToDatabase();
  let knowledge = await SharedBusinessKnowledge.findOne({ clerkId });
  if (knowledge) {
    await Promise.all([
      SharedBusinessKnowledge.collection.updateOne(
        { clerkId },
        {
          $unset: {
            businessInfo: "",
            websiteKnowledge: "",
            ownerKnowledge: "",
            fileKnowledge: "",
          },
        } as any,
      ),
      WhatsAppWorkspace.collection.updateOne(
        { clerkId },
        { $unset: { businessInfo: "" } } as any,
      ),
    ]);
    return knowledge;
  }

  const [workspace, webChatbot] = await Promise.all([
    WhatsAppWorkspace.collection.findOne(
      { clerkId },
      { projection: { businessInfo: 1 } },
    ),
    WebChatbot.findOne({ clerkId }).lean(),
  ]);
  const whatsappInfo = (workspace as any)?.businessInfo || {};
  const knowledgeBaseUrl =
    cleanString(whatsappInfo.knowledgeBaseUrl) ||
    cleanString((webChatbot as any)?.scrappedFile);
  const websiteUrl =
    cleanString(whatsappInfo.websiteUrl) ||
    cleanString((webChatbot as any)?.websiteUrl);
  const legacyBusinessInfo = cleanString(whatsappInfo.summary);
  const fileName = cleanString(whatsappInfo.fileName);

  if (!knowledgeBaseUrl && !websiteUrl && !legacyBusinessInfo && !fileName) {
    await WhatsAppWorkspace.collection.updateOne(
      { clerkId },
      { $unset: { businessInfo: "" } } as any,
    );
    return null;
  }

  try {
    knowledge = await SharedBusinessKnowledge.create({
      clerkId,
      websiteUrl,
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
  if (!knowledgeBaseUrl && knowledge && (websiteUrl || legacyBusinessInfo)) {
    return updateSharedBusinessKnowledge(clerkId, {
      websiteUrl,
      businessInfo: legacyBusinessInfo,
    });
  }
  await WhatsAppWorkspace.collection.updateOne(
    { clerkId },
    { $unset: { businessInfo: "" } } as any,
  );
  return knowledge;
}

export async function updateSharedBusinessKnowledge(
  clerkId: string,
  update: SharedKnowledgeUpdate,
): Promise<ISharedBusinessKnowledge | null> {
  await connectToDatabase();
  const current: ISharedBusinessKnowledge | null =
    await getSharedBusinessKnowledge(clerkId);
  const sections = await getCurrentSections(current);
  const websiteProvided = update.websiteUrl !== undefined;
  const ownerProvided = update.businessInfo !== undefined;
  const nextWebsiteUrl = update.removeWebsite
    ? ""
    : websiteProvided
      ? cleanString(update.websiteUrl).slice(0, 2048)
      : current?.websiteUrl || "";
  const nextBusinessInfo = ownerProvided
    ? cleanString(update.businessInfo).slice(0, 12000)
    : sections.owner;
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
  const ownerChanged = nextBusinessInfo !== sections.owner;
  const fileChanged = Boolean(fileText) || Boolean(update.removeFile);
  const sourceChanged =
    websiteChanged || ownerChanged || fileChanged || !current?.knowledgeBaseUrl;

  if (!sourceChanged && current) {
    return current;
  }

  const businessName = await getBusinessName(clerkId);
  const resolveWebsiteKnowledge = async () => {
    if (!nextWebsiteUrl || update.removeWebsite) return "";
    if (
      !websiteChanged &&
      !update.websitePages?.length &&
      sections.hasMarkers &&
      normalizeKnowledgeText(sections.website, 20)
    ) {
      return sections.website;
    }

    const scrapedPages = update.websitePages?.length
      ? update.websitePages.slice(0, 10)
      : (await scrapeWebsitePagesForKnowledge(nextWebsiteUrl)).scrapedPages;
    console.info("[shared-knowledge] Website scraped", {
      clerkId,
      websiteUrl: nextWebsiteUrl,
      successfulPages: scrapedPages.length,
      crawlDepth: 3,
      maxPages: 10,
      reusedProvidedPages: Boolean(update.websitePages?.length),
    });
    const scrapedWebsiteText = buildWebsiteSourceText(
      scrapedPages,
    );
    return normalizeSourceKnowledge({
      clerkId,
      businessName,
      sourceType: "website",
      sourceName: nextWebsiteUrl,
      content: scrapedWebsiteText,
      maxCharacters: 14000,
    });
  };

  const [websiteKnowledge, ownerKnowledge, uploadedFileKnowledge] =
    await Promise.all([
      resolveWebsiteKnowledge(),
      ownerChanged
        ? normalizeSourceKnowledge({
            clerkId,
            businessName,
            sourceType: "owner",
            sourceName: "Owner-provided business information",
            content: nextBusinessInfo,
            maxCharacters: 6000,
          })
        : Promise.resolve(sections.owner),
      update.removeFile
        ? Promise.resolve("")
        : fileText
          ? normalizeSourceKnowledge({
              clerkId,
              businessName,
              sourceType: "file",
              sourceName: nextFileName,
              content: fileText,
              maxCharacters: 9000,
            })
          : Promise.resolve(sections.file),
    ]);
  console.info("[shared-knowledge] Sources normalized", {
    clerkId,
    websiteChanged,
    ownerChanged,
    fileChanged,
    websiteCharacters: websiteKnowledge.length,
    ownerCharacters: ownerKnowledge.length,
    fileCharacters: uploadedFileKnowledge.length,
    maxAiInputTokens: MAX_AI_INPUT_TOKENS,
  });
  const hasAnyKnowledge = Boolean(
    nextWebsiteUrl || ownerKnowledge || uploadedFileKnowledge,
  );

  if (!hasAnyKnowledge) {
    await deleteKnowledgeArtifact(current);
    await SharedBusinessKnowledge.deleteOne({ clerkId });
    await syncKnowledgeConsumers({
      clerkId,
      websiteUrl: "",
      knowledgeBaseUrl: "",
    });
    return null;
  }

  const localSections = dedupeSectionsLocally({
    website: [nextWebsiteUrl ? `Website: ${nextWebsiteUrl}` : "", websiteKnowledge]
      .filter(Boolean)
      .join("\n"),
    owner: [`Business name: ${businessName}`, ownerKnowledge]
      .filter(Boolean)
      .join("\n"),
    file: uploadedFileKnowledge,
  });
  const mergeInput = fitSourcesIntoMergeBudget(localSections);
  let compacted = serializeKnowledgeSections(mergeInput);
  try {
    const aiCompacted = await compactSharedBusinessKnowledge({
      businessName,
      websiteUrl: nextWebsiteUrl,
      websiteKnowledge: mergeInput.website,
      ownerInformation: mergeInput.owner,
      uploadedFileName: nextFileName,
      uploadedFileKnowledge: mergeInput.file,
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
  const artifactText = createSharedKnowledgeArtifact({
    runtimeKnowledge: compacted,
    sourceArchive: serializeKnowledgeSections({
      website: websiteKnowledge,
      owner: ownerKnowledge,
      file: uploadedFileKnowledge,
      hasMarkers: true,
    }),
  });
  const asset = await uploadTextAssetToCloudinary(
    artifactText,
    knowledgeBaseFileName,
  );
  console.info("[shared-knowledge] Merged artifact uploaded", {
    clerkId,
    mergedCharacters: compacted.length,
    artifactCharacters: artifactText.length,
    sourceCount: [websiteKnowledge, ownerKnowledge, uploadedFileKnowledge].filter(
      Boolean,
    ).length,
    resourceType: asset.resourceType,
  });
  const now = new Date();
  const saved = await SharedBusinessKnowledge.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        websiteUrl: nextWebsiteUrl,
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

  await syncKnowledgeConsumers({
    clerkId,
    websiteUrl: nextWebsiteUrl,
    knowledgeBaseUrl: asset.secureUrl,
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
  await syncKnowledgeConsumers({
    clerkId,
    websiteUrl: "",
    knowledgeBaseUrl: "",
  });
}
