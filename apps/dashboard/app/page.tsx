"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bot, Building2, Check, Instagram, MessageCircle, Phone, Sparkles, Store, Users } from "lucide-react";
import { Orbs, useThemeStyles } from "@rocketreplai/ui";
import { usePlatformAccess } from "@/components/platform/PlatformAccessProvider";

const products: Array<{
  key: string;
  title: string;
  description: string;
  href: string;
  icon: typeof Bot;
  accent: string;
  comingSoon?: boolean;
}> = [
  { key: "website", title: "Website Chatbot", description: "Capture leads, answer questions and book appointments on your website.", href: "/web", icon: Bot, accent: "from-violet-500 to-pink-500" },
  { key: "instagram", title: "Instagram Automation", description: "Automate comments and DMs, collect leads and run follow-up conversations.", href: "/insta", icon: Instagram, accent: "from-pink-500 to-rose-500" },
  { key: "whatsapp", title: "WhatsApp Automation", description: "Handle support, qualify leads and collect appointment requests on WhatsApp.", href: "/whatsapp", icon: MessageCircle, accent: "from-emerald-500 to-teal-500" },
  { key: "call", title: "AI Call Assistant", description: "An AI receptionist for inbound calls, qualification and smart follow-up.", href: "/call", icon: Phone, accent: "from-cyan-500 to-blue-500", comingSoon: true },
];

const signInDestination = (path: string) => `/sign-in?redirect_url=${encodeURIComponent(path)}`;
const businessSetupDestination = (path: string) =>
  `/business/setup?redirect=${encodeURIComponent(path)}`;

export default function HomePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { styles, isDark } = useThemeStyles();
  const platformAccess = usePlatformAccess();
  const [mode, setMode] = useState<"choose" | "individual">("choose");
  const individualAccountLocked = platformAccess.primaryAccountType === "BUSINESS";
  const visibleMode = individualAccountLocked ? "individual" : mode;

  const openProtected = (path: string) => {
    if (isLoaded) router.push(isSignedIn ? path : signInDestination(path));
  };

  return (
    <main className={`${styles.page} ${isDark ? "bg-[#0f0f11]" : "bg-[#f8f9fa]"}`}>
      {isDark && <Orbs />}
      <div className={`${styles.container} relative z-10 mx-auto max-w-7xl py-14`}>
        {visibleMode === "choose" ? (
          <>
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-400"><Sparkles className="h-4 w-4" /> Welcome to RocketReplAI</div>
              <h1 className={`mt-6 text-4xl font-bold md:text-6xl ${styles.text.primary}`}>How will you use RocketReplAI?</h1>
              <p className={`mx-auto mt-5 max-w-2xl text-lg ${styles.text.secondary}`}>Choose your account type. Manage your own business or deliver automation services to multiple clients.</p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
              <motion.button whileHover={{ y: -4 }} onClick={() => setMode("individual")} className={`${styles.card} group rounded-3xl p-8 text-left`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Store className="h-7 w-7" /></div>
                <h2 className={`mt-6 text-2xl font-bold ${styles.text.primary}`}>Individual business</h2>
                <p className={`mt-3 ${styles.text.secondary}`}>Use RocketReplAI for your own company and choose the automation product you need.</p>
                <ul className={`mt-6 space-y-3 text-sm ${styles.text.secondary}`}>{["Simple business setup", "Choose one or multiple products", "Own leads, conversations and appointments"].map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{item}</li>)}</ul>
                <span className="mt-8 inline-flex items-center gap-2 font-semibold text-emerald-500">Choose individual <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </motion.button>
              <motion.button whileHover={{ y: -4 }} onClick={() => openProtected("/agency/setup")} className={`${styles.card} group rounded-3xl border-violet-500/30 p-8 text-left`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"><Building2 className="h-7 w-7" /></div>
                <div className="mt-6 flex items-center gap-3"><h2 className={`text-2xl font-bold ${styles.text.primary}`}>Agency</h2><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">1 client free</span></div>
                <p className={`mt-3 ${styles.text.secondary}`}>Manage client workspaces, services, usage, leads and appointment performance from one dashboard.</p>
                <ul className={`mt-6 space-y-3 text-sm ${styles.text.secondary}`}>{["Invite one client on the free allowance", "Central client and service management", "Usage and conversion reporting", "Upgrade for 5, 20 or 50 clients"].map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-violet-400" />{item}</li>)}</ul>
                <span className="mt-8 inline-flex items-center gap-2 font-semibold text-violet-400">Continue as agency <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </motion.button>
            </div>
          </>
        ) : (
          <>
            {!individualAccountLocked && <button onClick={() => setMode("choose")} className={`inline-flex items-center gap-2 text-sm ${styles.text.secondary}`}><ArrowLeft className="h-4 w-4" /> Back to account type</button>}
            <div className={individualAccountLocked ? "text-center" : "mt-8 text-center"}><p className="text-sm font-semibold text-emerald-500">Individual business</p><h1 className={`mt-2 text-4xl font-bold md:text-5xl ${styles.text.primary}`}>Choose your AI product</h1><p className={`mx-auto mt-4 max-w-2xl ${styles.text.secondary}`}>{individualAccountLocked ? "Your account is registered as an Individual business. Choose the automation product you want to manage." : "After sign-in, you will return to the selected product and continue its existing setup."}</p></div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product, index) => { const Icon = product.icon; return (
                <motion.button key={product.key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} disabled={product.comingSoon} onClick={() => openProtected(businessSetupDestination(product.href))} className={`${styles.card} group rounded-3xl p-7 text-left disabled:cursor-not-allowed disabled:opacity-70`}>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${product.accent} text-white`}><Icon className="h-7 w-7" /></div>
                  <div className="mt-6 flex min-h-14 items-start justify-between gap-2"><h2 className={`text-xl font-bold ${styles.text.primary}`}>{product.title}</h2>{product.comingSoon && <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-400">COMING SOON</span>}</div>
                  <p className={`mt-3 min-h-24 text-sm ${styles.text.secondary}`}>{product.description}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-semibold text-violet-400">{product.comingSoon ? "Not available yet" : "Start setup"}{!product.comingSoon && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}</span>
                </motion.button>
              ); })}
            </div>
            {!individualAccountLocked && <div className={`mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 rounded-2xl p-4 text-sm ${styles.innerCard} ${styles.text.secondary}`}><Users className="h-4 w-4 text-violet-400" /> Need to manage client businesses? Return and choose Agency.</div>}
          </>
        )}
      </div>
    </main>
  );
}
