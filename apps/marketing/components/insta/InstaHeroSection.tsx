"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Heart,
  MessageCircle,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { trackMetaEvent } from "@/lib/meta-pixel";

type HeroScene = {
  brand: string;
  handle: string;
  avatar: string;
  image: string;
  keyword: string;
  caption: string;
  button: string;
  comments: Array<{
    user: string;
    avatar: string;
    keyword: string;
    time: string;
    reply: string;
  }>;
};

const scenes: HeroScene[] = [
  {
    brand: "The Plated Story",
    handle: "the_plated_story",
    avatar: "TP",
    image:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=85",
    keyword: "ORDER",
    caption: "to get our menu & delivery link",
    button: "Order Now",
    comments: [
      {
        user: "foodie.raj",
        avatar: "FR",
        keyword: "ORDER 😍",
        time: "1m ago",
        reply: "Hey Foodie! Here's our menu & order link 👇",
      },
      {
        user: "sara.eats",
        avatar: "SE",
        keyword: "ORDER 🍰",
        time: "Just now",
        reply: "Hey Sara! Here's our menu & order link 👇",
      },
    ],
  },
  {
    brand: "Sculpt Gym",
    handle: "sculpt_gym",
    avatar: "SG",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=85",
    keyword: "FIT",
    caption: "to get your free workout plan",
    button: "Get Plan",
    comments: [
      {
        user: "alex.lifts",
        avatar: "AL",
        keyword: "FIT 💪",
        time: "3m ago",
        reply: "Hey Alex! Here's your free workout plan 👇",
      },
      {
        user: "fitgirl.nina",
        avatar: "FN",
        keyword: "FIT 🏋️",
        time: "Just now",
        reply: "Hey Fitgirl! Here's your free workout plan 👇",
      },
    ],
  },
  {
    brand: "Beauty Care",
    handle: "beauty_care",
    avatar: "BC",
    image:
      "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=900&q=85",
    keyword: "GLOW",
    caption: "to get your skincare routine",
    button: "Get Routine",
    comments: [
      {
        user: "mike.wellness",
        avatar: "MW",
        keyword: "GLOW ✨",
        time: "1m ago",
        reply: "Hey Mike! Here's your skincare routine 👇",
      },
      {
        user: "skincare.emma",
        avatar: "SE",
        keyword: "GLOW 🧴",
        time: "Just now",
        reply: "Hey Skincare! Here's your routine 👇",
      },
    ],
  },
  {
    brand: "Art Apparel",
    handle: "art_apparel",
    avatar: "AA",
    image:
      "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=85",
    keyword: "FASHION",
    caption: "below and I'll DM you the link",
    button: "Open Link",
    comments: [
      {
        user: "john.deals",
        avatar: "JD",
        keyword: "Fashion 🔥",
        time: "2m ago",
        reply: "Hey John! Here's your exclusive link 👇",
      },
      {
        user: "thesaraofficial",
        avatar: "TS",
        keyword: "Fashion 💕",
        time: "Just now",
        reply: "Hey Thesaraofficial! Here's your exclusive link 👇",
      },
    ],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

function MetaMark() {
  return (
    <span className="text-[2rem] font-black leading-none text-[#0a7cff] sm:text-[2.35rem]">
      ∞
    </span>
  );
}

function Avatar({
  label,
  colorful = true,
}: {
  label: string;
  colorful?: boolean;
}) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[8px] font-black sm:h-9 sm:w-9 sm:text-[10px] ${
        colorful
          ? "bg-gradient-to-br from-pink-500 via-orange-400 to-blue-500 p-[2px] text-slate-950"
          : "bg-slate-100 text-slate-400"
      }`}
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-white">
        {label}
      </span>
    </div>
  );
}

function InstagramPost({ scene }: { scene: HeroScene }) {
  return (
    <motion.div
      key={`post-${scene.handle}`}
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -18, scale: 0.98 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative w-[10.3rem] -rotate-1 rounded-xl bg-white p-1.5 shadow-[0_14px_32px_rgba(15,23,42,0.16)] transition-shadow duration-500 min-[390px]:w-[11.4rem] sm:w-[15rem] sm:rounded-[1.15rem] sm:p-2.5 lg:w-[18rem] xl:w-[22rem] dark:shadow-[0_18px_44px_rgba(0,0,0,0.42)]"
    >
      <div className="flex items-center justify-between px-1.5 pb-1.5 pt-1 sm:px-2 sm:pb-2">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Avatar label={scene.avatar} />
          <span className="text-[10px] font-black uppercase tracking-tight text-slate-950 sm:text-xs">
            {scene.handle}
          </span>
        </div>
        <span className="text-base font-bold leading-none text-slate-700 sm:text-xl">
          ...
        </span>
      </div>

      <div className="aspect-[0.86] overflow-hidden bg-slate-100">
        <img
          src={scene.image}
          alt={`${scene.brand} Instagram post`}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="px-2 pt-2">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500 sm:h-5 sm:w-5" />
            <MessageCircle className="h-4 w-4 text-slate-950 sm:h-5 sm:w-5" />
            <Send className="h-4 w-4 text-slate-950 sm:h-5 sm:w-5" />
          </div>
          <div className="h-4 w-3 rounded-sm border-2 border-slate-950 border-t-0 sm:h-5 sm:w-4" />
        </div>
        <p className="text-[9px] font-semibold text-slate-900 sm:text-xs">
          447 likes
        </p>
        <p className="text-[9px] font-black leading-tight text-slate-950 sm:text-base">
          <span>{scene.handle}</span> Comment{" "}
          <span className="text-red-500">"{scene.keyword}"</span>{" "}
          {scene.caption}
        </p>
      </div>
    </motion.div>
  );
}

function CommentCard({
  comment,
  compact,
}: {
  comment: HeroScene["comments"][number];
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`rotate-1 rounded-lg bg-white shadow-[0_8px_20px_rgba(15,23,42,0.14)] transition-shadow duration-500 sm:rounded-xl dark:shadow-[0_12px_26px_rgba(0,0,0,0.38)] ${
        compact
          ? "w-[6.7rem] p-1.5 sm:w-[7.6rem] sm:p-2"
          : "w-[11rem] p-2 sm:w-[13rem] sm:p-3"
      }`}
    >
      <div className="flex items-start gap-2">
        <Avatar label={comment.avatar} />
        <div className="min-w-0">
          <p className="truncate text-xs font-black leading-tight text-slate-950 sm:text-sm">
            {comment.user}
          </p>
          <p className="text-xs leading-tight text-slate-950 sm:text-sm">
            {comment.keyword}
          </p>
        </div>
        <span className="ml-auto text-slate-300">♡</span>
      </div>
      <p className="mt-1 text-xs text-slate-600 sm:mt-2 sm:text-sm">
        {comment.time}
      </p>
    </motion.div>
  );
}

function ReplyCard({
  scene,
  comment,
}: {
  scene: HeroScene;
  comment: HeroScene["comments"][number];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.4, delay: 0.08, ease: "easeOut" }}
      className="w-[8.15rem] rotate-1 rounded-lg bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition-shadow duration-500 min-[390px]:w-[8.9rem] sm:w-[17rem] sm:rounded-xl sm:p-3 lg:w-[19rem] dark:shadow-[0_14px_30px_rgba(0,0,0,0.42)]"
    >
      <div className="flex gap-0 sm:gap-2">
        <Avatar label={scene.avatar} colorful={false} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black leading-tight text-slate-950 sm:text-sm">
            {scene.brand}
          </p>
          <p className="text-xs leading-tight text-slate-950 sm:text-sm">
            {comment.reply}
          </p>
          <button className="mt-1.5 w-full rounded-md bg-[#1e39e8] px-2 py-1.5 text-xs font-black text-white sm:mt-2 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm">
            {scene.button}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function HeroMockup({
  scene,
  activeIndex,
}: {
  scene: HeroScene;
  activeIndex: number;
}) {
  const secondComment = scene.comments[1];

  return (
    <div className="mx-auto w-full max-w-[32rem] lg:max-w-[36rem]">
      <div className="relative mx-auto flex  min-h-[23rem]  items-start gap-2 min-[390px]:min-h-[25.5rem] sm:min-h-[32rem]  lg:mx-0 lg:min-h-[35rem] ">
        <div className="relative z-10 justify-self-end sm:justify-self-start">
          <AnimatePresence mode="wait">
            <InstagramPost scene={scene} />
          </AnimatePresence>
        </div>

        <div className="relative z-20 flex flex-col gap-2 pt-1 sm:gap-3 sm:pt-12 lg:pt-16">
          <AnimatePresence mode="wait">
            <CommentCard
              key={`${scene.handle}-${scene.comments[0].user}`}
              comment={scene.comments[0]}
              compact
            />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <ReplyCard
              key={`${scene.handle}-${scene.comments[0].reply}`}
              scene={scene}
              comment={scene.comments[0]}
            />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <CommentCard
              key={`${scene.handle}-${secondComment.user}`}
              comment={secondComment}
              compact
            />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <ReplyCard
              key={`${scene.handle}-${secondComment.reply}`}
              scene={scene}
              comment={secondComment}
            />
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-5 sm:mt-4 sm:gap-6">
        {scenes.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Show example ${index + 1}`}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index ? "w-7 bg-[#1e39e8]" : "w-2 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function InstagramAutomationHero() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeScene = scenes[activeIndex];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % scenes.length);
    }, 3600);

    return () => window.clearInterval(interval);
  }, []);

  const goToSignup = () => {
    trackMetaEvent("Lead", {
      content_name: "Instagram hero get free forever",
      content_category: "marketing_cta",
    });
    window.location.href = "https://app.rocketreplai.com/sign-in";
  };

  const goToPricing = () => {
    trackMetaEvent("ViewContent", {
      content_name: "Instagram hero how it works",
      content_category: "marketing_cta",
    });
    router.push("/insta/pricing");
  };

  const title = (
    <motion.h1
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      transition={{ duration: 0.55 }}
      className="mx-auto max-w-[42rem] text-center text-[1.75rem] font-black leading-[1.02] text-[#101828] transition-colors duration-500 min-[390px]:text-[2rem] sm:text-[2.15rem] md:text-[2.8rem] lg:mx-0 lg:text-left xl:text-[3.45rem] dark:text-white"
    >
      Automate Instagram replies.
      <br />
      <span className="text-[#1e39e8] dark:text-[#7da2ff]">
        Grow from every comment.
      </span>
    </motion.h1>
  );

  const body = (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeUp}
      transition={{ duration: 0.55, delay: 0.08 }}
      className="mx-auto max-w-[43rem] text-center lg:mx-0 lg:text-left"
    >
      <p className="text-sm leading-relaxed text-slate-700 transition-colors duration-500 min-[390px]:text-base sm:text-xl sm:leading-[1.45] xl:text-[1.45rem] dark:text-slate-200">
        RocketReplai watches comment keywords and sends the next step in DM:
        links, menus, offers, lead magnets, and follow-ups without manual work.
      </p>
      <p className="mt-2 text-xs italic text-slate-500 transition-colors duration-500 min-[390px]:text-sm sm:mt-3 sm:text-lg dark:text-slate-400">
        Built for creators, stores, restaurants, coaches, and local brands.
      </p>
    </motion.div>
  );

  return (
    <section className="relative mx-[calc(50%-50vw)] w-[100vw] lg:w-[99.5vw] overflow-hidden bg-[#f8fbff] text-slate-950 transition-colors duration-500 dark:bg-[#07111f] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_14%,rgba(30,57,232,0.13),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#fbfdff_100%)] opacity-100 transition-opacity duration-500 dark:opacity-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(125,162,255,0.22),transparent_32%),linear-gradient(135deg,#06101d_0%,#0b1730_54%,#050912_100%)] opacity-0 transition-opacity duration-500 dark:opacity-100" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 px-3 pb-7 pt-3 min-[390px]:px-4 sm:px-6 sm:pb-9 sm:pt-4 lg:grid-cols-[1fr_0.86fr] lg:gap-8 lg:px-10 lg:pt-8 xl:px-16">
        <div className="flex flex-col justify-center lg:min-h-[38rem] lg:pl-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mx-auto mb-4 inline-flex max-w-max items-center rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#1e39e8] shadow-sm backdrop-blur transition-colors duration-500 lg:mx-0 dark:border-blue-400/30 dark:bg-white/10 dark:text-blue-200"
          >
            Instagram Automation
          </motion.div>
          <div className="lg:hidden">{title}</div>

          <div className="order-2 mt-5 lg:order-none lg:hidden">
            <HeroMockup scene={activeScene} activeIndex={activeIndex} />
          </div>

          <div className="mt-7 hidden lg:block">{title}</div>
          <div className="order-3 mt-5 lg:order-none lg:mt-6">{body}</div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="order-4 mt-5 grid gap-3 sm:mx-auto sm:w-full sm:max-w-[31rem] sm:grid-cols-2 lg:mx-0 lg:mt-8"
          >
            <button
              onClick={goToSignup}
              className="rounded-xl bg-[#1e39e8] px-5 py-4 text-sm font-black text-white shadow-[0_14px_24px_rgba(30,57,232,0.28)] transition hover:-translate-y-0.5 hover:bg-[#1730cc] sm:px-6 sm:py-4 dark:bg-[#6f8dff] dark:text-[#06101d] dark:shadow-[0_14px_28px_rgba(111,141,255,0.24)] dark:hover:bg-[#89a5ff]"
            >
              Get Free Forever
            </button>
            <button
              onClick={goToPricing}
              className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 sm:px-6 sm:py-4 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              See How It Works <ArrowRight className="ml-2 inline h-5 w-5" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.22 }}
            className="order-5 mt-5 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 transition-colors duration-500 sm:text-base lg:justify-start dark:text-slate-300"
          >
            <MetaMark />
            <span>Meta Tech Provider</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.28 }}
            className="order-6 mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500 transition-colors duration-500 sm:text-sm lg:justify-start dark:text-slate-300"
          >
            {["No credit card required", "Meta Verified", "Instant Setup"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 fill-[#2563eb] text-white sm:h-5 sm:w-5" />
                  {item}
                </span>
              ),
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="hidden items-center justify-center lg:flex"
        >
          <HeroMockup scene={activeScene} activeIndex={activeIndex} />
        </motion.div>
      </div>
    </section>
  );
}
