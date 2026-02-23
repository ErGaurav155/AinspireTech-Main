"use client";

import Link from "next/link";
import { MessageCircle, BookOpen, MessageSquare, Radio } from "lucide-react";

const automationTypes = [
  {
    id: "comments",
    icon: MessageCircle,
    title: "DM from Comments",
    description:
      "Automatically send a DM to users who comment on a selected post.",
    comingSoon: false,
    href: "/insta/automations/add/comments",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-500",
    iconBorder: "border-pink-100",
  },
  {
    id: "stories",
    icon: BookOpen,
    title: "DM from Stories",
    description:
      "Auto-DM users who engage with your Story (replies, likes, reactions).",
    comingSoon: false,
    href: "/insta/automations/add/stories",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-500",
    iconBorder: "border-pink-100",
  },
  {
    id: "dms",
    icon: MessageSquare,
    title: "Respond to all DMs",
    description: "Auto-respond to every incoming DM.",
    comingSoon: false,
    href: "/insta/automations/add/dms",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-500",
    iconBorder: "border-pink-100",
  },
  {
    id: "live",
    icon: Radio,
    title: "DM from Live Comments",
    description:
      "Send automatic DMs to users commenting during your Instagram Live sessions.",
    comingSoon: true,
    href: "#",
    iconBg: "bg-gray-50",
    iconColor: "text-gray-400",
    iconBorder: "border-gray-100",
  },
];

export default function AddAutomationPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automationTypes.map((type) => {
            const Icon = type.icon;
            const card = (
              <div
                className={`relative bg-white border border-gray-100 rounded-2xl p-6 md:p-8 transition-all group ${
                  type.comingSoon
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:border-gray-200 hover:shadow-md hover:shadow-black/5 cursor-pointer"
                }`}
              >
                {/* Coming Soon badge */}
                {type.comingSoon && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-pink-500 text-white text-xs font-medium rounded-full">
                    Coming Soon
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 ${type.iconBg} border ${type.iconBorder} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}
                >
                  <Icon
                    className={`h-6 w-6 ${type.iconColor}`}
                    strokeWidth={1.5}
                  />
                </div>

                {/* Text */}
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {type.title}
                </h3>
                <p
                  className={`text-sm leading-relaxed ${type.comingSoon ? "text-gray-400" : "text-gray-500"}`}
                >
                  {type.description}
                </p>
              </div>
            );

            if (type.comingSoon) {
              return <div key={type.id}>{card}</div>;
            }

            return (
              <Link key={type.id} href={type.href}>
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
