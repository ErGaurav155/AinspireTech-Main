import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  deleteSharedBusinessKnowledge,
  getSharedBusinessKnowledge,
  toPublicSharedKnowledge,
  updateSharedBusinessKnowledge,
} from "@/services/shared-business-knowledge.service";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "html",
  "htm",
  "log",
  "xml",
  "yaml",
  "yml",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (ALLOWED_EXTENSIONS.has(extension)) {
      callback(null, true);
      return;
    }
    callback(
      new Error(
        "Use a plain-text file: TXT, MD, CSV, JSON, HTML, LOG, XML, YAML, or YML.",
      ),
    );
  },
});

export const uploadSharedBusinessKnowledgeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("file")(req, res, (error: any) => {
    if (!error) return next();
    return res.status(error?.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      success: false,
      error:
        error?.code === "LIMIT_FILE_SIZE"
          ? "Business info file must be 10 MB or smaller."
          : error?.message || "Invalid business info file.",
      timestamp: new Date().toISOString(),
    });
  });
};

const unauthorized = (res: Response) =>
  res.status(401).json({
    success: false,
    error: "Unauthorized",
    timestamp: new Date().toISOString(),
  });

export const getSharedBusinessKnowledgeController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) return unauthorized(res);
    const knowledge = await getSharedBusinessKnowledge(userId);
    return res.status(200).json({
      success: true,
      data: await toPublicSharedKnowledge(knowledge),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Shared business knowledge read error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to load business knowledge.",
      timestamp: new Date().toISOString(),
    });
  }
};

export const updateSharedBusinessKnowledgeController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) return unauthorized(res);
    const file = req.file;
    const knowledge = await updateSharedBusinessKnowledge(userId, {
      websiteUrl:
        req.body.websiteUrl !== undefined ? String(req.body.websiteUrl) : undefined,
      businessInfo:
        req.body.businessInfo !== undefined
          ? String(req.body.businessInfo)
          : undefined,
      fileName: file?.originalname,
      fileType: file?.mimetype,
      fileSize: file?.size,
      fileText: file ? file.buffer.toString("utf8") : undefined,
      removeWebsite: String(req.body.removeWebsite || "") === "true",
      removeFile: String(req.body.removeFile || "") === "true",
    });
    return res.status(200).json({
      success: true,
      data: await toPublicSharedKnowledge(knowledge),
      message: knowledge
        ? "Business knowledge updated for WhatsApp, web, and Instagram."
        : "Business knowledge cleared.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Shared business knowledge update error:", error);
    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update business knowledge.",
      timestamp: new Date().toISOString(),
    });
  }
};

export const deleteSharedBusinessKnowledgeController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) return unauthorized(res);
    await deleteSharedBusinessKnowledge(userId);
    return res.status(200).json({
      success: true,
      data: await toPublicSharedKnowledge(null),
      message: "All shared business knowledge was deleted.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Shared business knowledge delete error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete business knowledge.",
      timestamp: new Date().toISOString(),
    });
  }
};
