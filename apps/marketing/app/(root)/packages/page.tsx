import type { Metadata } from "next";
import { PackagesBuilder } from "@/components/packages/PackagesBuilder";

export const metadata: Metadata = {
  title: "Packages | RocketReplai",
  description: "Build RocketReplai service packages and proposal pricing.",
};

export default function PackagesPage() {
  return (
    <section className="px-2 py-6 sm:px-4 lg:px-8">
      <PackagesBuilder />
    </section>
  );
}
