"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Globe2,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApi } from "@/lib/useApi";

interface SharedKnowledgeData {
  websiteUrl: string;
  businessInfo: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  hasKnowledge: boolean;
  knowledgeUpdatedAt?: string | null;
}

const emptyKnowledge: SharedKnowledgeData = {
  websiteUrl: "",
  businessInfo: "",
  fileName: "",
  fileType: "",
  fileSize: 0,
  hasKnowledge: false,
};

const getErrorMessage = (error: unknown) => {
  const raw = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(raw);
    return parsed.error || parsed.message || raw;
  } catch {
    return raw;
  }
};

export default function SharedBusinessKnowledgeForm({
  className = "",
  onSaved,
}: {
  className?: string;
  onSaved?: (data: SharedKnowledgeData) => void;
}) {
  const { apiRequest } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<SharedKnowledgeData>(emptyKnowledge);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessInfo, setBusinessInfo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operation, setOperation] = useState<
    "save" | "website" | "file" | "all" | null
  >(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const applyData = (data: SharedKnowledgeData, notify = false) => {
    const next = { ...emptyKnowledge, ...data };
    setSaved(next);
    setWebsiteUrl(next.websiteUrl);
    setBusinessInfo(next.businessInfo);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (notify) onSaved?.(next);
  };

  useEffect(() => {
    let active = true;
    apiRequest<SharedKnowledgeData>("/user/business-knowledge")
      .then((data) => {
        if (active) applyData(data);
      })
      .catch((loadError) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // applyData intentionally reads only stable state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRequest]);

  const updateKnowledge = async ({
    removeWebsite = false,
    removeFile = false,
  } = {}) => {
    const body = new FormData();
    body.set("websiteUrl", websiteUrl.trim());
    body.set("businessInfo", businessInfo.trim());
    if (file && !removeFile) body.set("file", file);
    if (removeWebsite) body.set("removeWebsite", "true");
    if (removeFile) body.set("removeFile", "true");
    return apiRequest<SharedKnowledgeData>("/user/business-knowledge", {
      method: "PUT",
      body,
    });
  };

  const runUpdate = async (
    nextOperation: "save" | "website" | "file",
    options: { removeWebsite?: boolean; removeFile?: boolean } = {},
  ) => {
    setOperation(nextOperation);
    setError("");
    setMessage("");
    try {
      const data = await updateKnowledge(options);
      applyData(data, true);
      setMessage(
        options.removeWebsite
          ? "Website knowledge removed from all three products."
          : options.removeFile
            ? "Uploaded-file knowledge removed from all three products."
            : "Knowledge updated for WhatsApp, web chatbot, and Instagram.",
      );
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setOperation(null);
    }
  };

  const deleteAll = async () => {
    setOperation("all");
    setError("");
    setMessage("");
    try {
      const data = await apiRequest<SharedKnowledgeData>(
        "/user/business-knowledge",
        { method: "DELETE" },
      );
      applyData(data, true);
      setMessage("All shared business knowledge was deleted.");
      setShowDeleteDialog(false);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setOperation(null);
    }
  };

  if (isLoading) {
    return (
      <section
        className={`flex min-h-48 items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] ${className}`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        <span className="ml-2 text-sm text-gray-500 dark:text-white/55">
          Loading business knowledge...
        </span>
      </section>
    );
  }

  const isBusy = operation !== null;
  const processingMessage = file
    ? "Extracting the file, merging sources, and updating one shared knowledge base. Keep this page open."
    : websiteUrl.trim() !== saved.websiteUrl
      ? "Scraping the website and updating one shared knowledge base. This may take 1-2 minutes."
      : "Optimizing and updating the shared knowledge base. Keep this page open.";

  return (
    <section
      className={`min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Shared Business Knowledge
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500 dark:text-white/55">
            This single source trains WhatsApp replies, the website chatbot, and
            Instagram Pro DM replies. Updating it here updates all three.
          </p>
        </div>
        {saved.hasKnowledge && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Ready
          </span>
        )}
      </div>

      <form
        className="mt-5 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void runUpdate("save");
        }}
      >
        <div className="border-b border-gray-100 pb-5 dark:border-white/[0.07]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="shared-business-website"
              className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/80"
            >
              <Globe2 className="h-4 w-4 text-blue-500" /> Website URL
            </label>
            {saved.websiteUrl && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void runUpdate("website", { removeWebsite: true })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
              >
                {operation === "website" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remove website data
              </button>
            )}
          </div>
          <input
            id="shared-business-website"
            type="url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://yourbusiness.com"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-400 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white"
          />
        </div>

        <div className="border-b border-gray-100 pb-5 dark:border-white/[0.07]">
          <label
            htmlFor="shared-business-info"
            className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80"
          >
            Business information <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="shared-business-info"
            rows={7}
            value={businessInfo}
            onChange={(event) => setBusinessInfo(event.target.value)}
            placeholder="Services, prices, addresses, opening hours, policies, FAQs, support contacts, and booking requirements."
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm leading-6 text-gray-900 outline-none transition focus:border-emerald-400 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white"
          />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor="shared-business-file"
              className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-white/80"
            >
              <FileText className="h-4 w-4 text-amber-500" /> Business info file
              <span className="font-normal text-gray-400">(optional, max 10 MB)</span>
            </label>
            {saved.fileName && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void runUpdate("file", { removeFile: true })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
              >
                {operation === "file" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remove file data
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            id="shared-business-file"
            type="file"
            accept=".txt,.md,.csv,.json,.html,.htm,.log,.xml,.yaml,.yml"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              if (nextFile && nextFile.size > 10 * 1024 * 1024) {
                setError("Business info file must be 10 MB or smaller.");
                event.target.value = "";
                setFile(null);
                return;
              }
              setError("");
              setFile(nextFile);
            }}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-white/60 dark:file:bg-white/[0.08] dark:file:text-white/75"
          />
          <p className="mt-2 text-xs text-gray-400 dark:text-white/40">
            {file
              ? `New file: ${file.name} (${Math.ceil(file.size / 1024)} KB)`
              : saved.fileName
                ? `Current file: ${saved.fileName} (${Math.ceil(saved.fileSize / 1024)} KB)`
                : "Supported: TXT, MD, CSV, JSON, HTML, LOG, XML, and YAML."}
          </p>
        </div>

        {operation === "save" && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>{processingMessage}</span>
          </div>
        )}
        {message && (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {message}
          </p>
        )}
        {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={isBusy || !saved.hasKnowledge}
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-400/20 dark:text-red-400 dark:hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" /> Delete all knowledge
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {operation === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved.hasKnowledge ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved.hasKnowledge ? "Update knowledge" : "Save knowledge"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => void deleteAll()}
        title="Delete all business knowledge?"
        description="This removes the shared website, business information, file metadata, and Cloudinary knowledge used by WhatsApp, web, and Instagram. You can leave it empty and add new information later."
        confirmText="Delete all knowledge"
        cancelText="Cancel"
        isDestructive
        isLoading={operation === "all"}
        acknowledgements={[
          {
            id: "delete-shared-business-knowledge",
            label:
              "I understand all three automation products will stop using this knowledge.",
          },
        ]}
      />
    </section>
  );
}
