"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ApiRequestFn, useApi } from "@/lib/useApi";

const ownerAccessCache = new Map<string, boolean>();
const ownerAccessRequests = new Map<string, Promise<boolean>>();

const requestOwnerAccess = (userId: string, apiRequest: ApiRequestFn) => {
  const cached = ownerAccessCache.get(userId);
  if (cached !== undefined) return Promise.resolve(cached);

  const pending = ownerAccessRequests.get(userId);
  if (pending) return pending;

  const request = apiRequest<{ isOwner: boolean }>("/admin/verify-owner")
    .then((result) => {
      const isOwner = Boolean(result?.isOwner);
      ownerAccessCache.set(userId, isOwner);
      return isOwner;
    })
    .catch(() => false)
    .finally(() => {
      ownerAccessRequests.delete(userId);
    });

  ownerAccessRequests.set(userId, request);
  return request;
};

export const useCallAssistantAdmin = () => {
  const { userId, isLoaded } = useAuth();
  const { apiRequest } = useApi();
  const [isOwner, setIsOwner] = useState(
    userId ? ownerAccessCache.get(userId) || false : false,
  );

  useEffect(() => {
    if (!isLoaded || !userId) {
      setIsOwner(false);
      return;
    }

    let active = true;
    void requestOwnerAccess(userId, apiRequest).then((hasAccess) => {
      if (active) setIsOwner(hasAccess);
    });

    return () => {
      active = false;
    };
  }, [apiRequest, isLoaded, userId]);

  return isOwner;
};

export const CALL_ASSISTANT_COMING_SOON_TEXT =
  "Coming soon";
