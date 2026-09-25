"use client";

import { useParams } from "next/navigation";
import PlatformShell from "@/components/platform/PlatformShell";

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ agencyId: string }>();
  return <PlatformShell agencyId={params.agencyId}>{children}</PlatformShell>;
}
