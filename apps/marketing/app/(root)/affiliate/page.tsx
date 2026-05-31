"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@rocketreplai/ui";
import {
  Check,
  Star,
  Users,
  DollarSign,
  TrendingUp,
  Award,
  Clock,
  Shield,
  ChevronRight,
  Zap,
  BarChart3,
  Target,
  Gift,
  Link as LinkIcon,
  RefreshCw,
  CreditCard,
  HelpCircle,
} from "lucide-react";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@rocketreplai/ui";

const stats = [
  {
    icon: DollarSign,
    label: "Commission Rate",
    value: "25%",
    description: "On every subscription",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    icon: Clock,
    label: "Duration",
    value: "10-36 months",
    description: "Monthly: 10 months, Yearly: 3 years",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    icon: Users,
    label: "Active Affiliates",
    value: "500+",
    description: "Growing community",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    icon: TrendingUp,
    label: "Total Payouts",
    value: "$50K+",
    description: "Paid to affiliates",
    gradient: "from-orange-400 to-red-500",
  },
];

const features = [
  {
    icon: DollarSign,
    title: "High Commission",
    description:
      "Earn 25% on every subscription. Multiple products mean multiple earnings!",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Reliable Payouts",
    description:
      "Monthly payouts processed on time via your preferred payment method.",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    icon: Award,
    title: "Dual Product Earnings",
    description:
      "Earn from both Web Chatbots and Instagram Automation subscriptions.",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    icon: RefreshCw,
    title: "Recurring Commissions",
    description:
      "Earn for 10 months on monthly plans and 3 years on yearly plans.",
    gradient: "from-orange-400 to-red-500",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "SignUp-Affiliate",
    description:
      "Complete the registration form and get your unique affiliate link.",
    icon: "👥",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    step: "2",
    title: "Share Your Link",
    description:
      "Share your unique link on social media, websites, or with your audience.",
    icon: "🔗",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    step: "3",
    title: "Earn Commissions",
    description: "Get 25% commission when users subscribe through your link.",
    icon: "💰",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    step: "4",
    title: "Get Paid Monthly Now",
    description:
      "Receive your earnings monthly via bank transfer, UPI, or PayPal.",
    icon: "📅",
    gradient: "from-orange-400 to-red-500",
  },
];

const products = [
  {
    name: "Web Chatbots",
    types: ["Lead Generation", "Education"],
    monthlyPrice: "$10",
    commission: "25% for 10 months",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    name: "Instagram Automation",
    types: ["Free", "Pro"],
    monthlyPrice: "$5",
    commission: "25% for 10 months",
    gradient: "from-purple-400 to-pink-500",
  },
];

const faqData = [
  {
    question: "How do I get paid?",
    answer:
      "We process payouts monthly via bank transfer, UPI, or PayPal. Minimum payout is $50.",
  },
  {
    question: "How long do commissions last?",
    answer:
      "Monthly subscriptions: 10 months. Yearly subscriptions: 3 years. You earn as long as the customer stays subscribed.",
  },
  {
    question: "Can I promote both products?",
    answer:
      "Yes! You earn commissions on both Web Chatbots and Instagram Automation subscriptions.",
  },
  {
    question: "Is there a fee to join?",
    answer: "No, it's completely free to join our affiliate program.",
  },
  {
    question: "When are commissions calculated?",
    answer:
      "Commissions are calculated at the end of each month and paid within 7 business days.",
  },
  {
    question: "Can I track my referrals?",
    answer:
      "Yes, you'll have access to a detailed dashboard showing all your referrals, earnings, and performance metrics.",
  },
];

export default function AffiliateLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [referrals, setReferrals] = useState(10);
  const { theme, resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const currentTheme = resolvedTheme || theme || "light";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    setMounted(true);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: "bg-transparent",
      badgeBorder: isDark
        ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
        : "border-blue-200 bg-blue-50 text-blue-700",
      titleText: isDark ? "text-white" : "text-slate-950",
      descriptionText: isDark ? "text-slate-300" : "text-slate-600",
      cardBg: isDark
        ? "bg-white/[0.04] border border-white/10 shadow-sm"
        : "bg-white border border-slate-200 shadow-sm",
      softCard: isDark
        ? "bg-white/[0.06] border border-white/10"
        : "bg-slate-50 border border-slate-200",
      gradientBg: isDark ? "from-blue-500/10 to-transparent" : "from-blue-50 to-transparent",
    };
  }, [currentTheme]);
  // Theme-based styles

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 60,
      scale: 0.9,
      rotateX: -10,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      borderColor:
        theme === "dark" ? "rgba(0, 240, 255, 0.4)" : "rgba(59, 130, 246, 0.4)",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        delay: 0.2,
      },
    },
  };

  // Calculate earnings
  const calculateEarnings = (referralsCount: number) => {
    const avgSubscription = 10;
    const commissionRate = 0.25;
    const monthly = referralsCount * avgSubscription * commissionRate;
    const yearly = monthly * 12;
    const threeYear = yearly * 3;

    return {
      monthly: monthly.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      yearly: yearly.toLocaleString("en-US", { maximumFractionDigits: 0 }),
      threeYear: threeYear.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      }),
    };
  };

  const earnings = calculateEarnings(referrals);
  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-transparent  flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.containerBg} relative z-10`}>
      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 mx-auto h-80 max-w-5xl rounded-full bg-blue-500/10 blur-3xl" />

        <div className="wrapper2 w-full mx-auto relative max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              variants={titleVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className={`inline-flex items-center px-4 py-2 rounded-full border mb-6 ${themeStyles.badgeBorder}`}
            >
              <Star className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold">
                Earn up to $6,000 per referral
              </span>
            </motion.div>

            <motion.h1
              variants={titleVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-normal"
            >
              <span className="gradient-text-main">Become an</span>
              <br />
              <span className={themeStyles.titleText}>Affiliate Partner</span>
            </motion.h1>

            <motion.p
              variants={textVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="text-xl mb-10 max-w-2xl mx-auto font-montserrat"
            >
              <span className={themeStyles.descriptionText}>
                Promote our powerful automation tools. Earn recurring
                commissions for up to 3 years from every customer you refer.
              </span>
            </motion.p>

            <motion.div
              variants={textVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="https://app.rocketreplai.com/sign-in">
                <Button
                  size="lg"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-8 rounded-full shadow-sm shadow-blue-700/20"
                >
                  Start Earning Now <Zap className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="#howitworks">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-20"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={cardVariants}
                whileHover="hover"
                whileInView="visible"
                viewport={{ once: false }}
                className={`p-6 rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 rounded-xl bg-blue-700">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold mb-2 text-blue-700">
                  {stat.value}
                </h3>
                <p className={`font-semibold mb-1 ${themeStyles.titleText} `}>
                  {stat.label}
                </p>
                <p
                  className={`text-sm ${themeStyles.descriptionText} font-montserrat`}
                >
                  {stat.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        <div className="wrapper2 w-full mx-auto px-4 relative">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.div
              variants={titleVariants}
              className="flex items-center justify-center text-blue-700 mb-4"
            >
              <span className={`text-sm font-semibold uppercase tracking-widest border ${themeStyles.badgeBorder} rounded-full px-4 py-1`}>
                Why Choose Us
              </span>
            </motion.div>
            <motion.h2
              variants={titleVariants}
              className="text-4xl font-bold mb-4"
            >
              <span className={themeStyles.titleText}>
                Powerful Features for{" "}
              </span>
              <span className="gradient-text-main">
                Maximum Earnings
              </span>
            </motion.h2>
            <motion.p
              variants={textVariants}
              className={`text-lg max-w-2xl mx-auto ${themeStyles.descriptionText} font-montserrat`}
            >
              We have built one of the most rewarding affiliate programs in the
              automation space
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover="hover"
                whileInView="visible"
                viewport={{ once: false }}
                className={`rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
              >
                <div className="p-6">
                  <div className="w-14 h-14 rounded-xl bg-blue-700 flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3
                    className={`${themeStyles.descriptionText} text-xl font-bold mb-3`}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={`${themeStyles.descriptionText} font-montserrat`}
                  >
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* How It Works */}
      <section id="howitworks" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/5" />
        <div className="wrapper2 w-full mx-auto px-4 relative">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.div
              variants={titleVariants}
              className="flex items-center justify-center text-blue-700 mb-4"
            >
              <span className={`text-sm font-semibold uppercase tracking-widest border ${themeStyles.badgeBorder} rounded-full px-4 py-1`}>
                Get Started
              </span>
            </motion.div>
            <motion.h2
              variants={titleVariants}
              className="text-4xl font-bold mb-4"
            >
              <span className={themeStyles.titleText}>Start Earning in </span>
              <span className="gradient-text-main">
                4 Simple Steps
              </span>
            </motion.h2>
          </motion.div>

          <div className="relative max-w-6xl mx-auto">
            {/* <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[#00F0FF] via-[#B026FF] to-[#FF2E9F] -translate-y-1/2" /> */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, margin: "-50px" }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative"
            >
              {howItWorks.map((step, index) => (
                <motion.div
                  key={step.step}
                  variants={cardVariants}
                  whileHover="hover"
                  whileInView="visible"
                  viewport={{ once: false }}
                  className="relative"
                >
                  <div
                    className={`p-8 rounded-2xl backdrop-blur-sm ${themeStyles.cardBg} text-center relative z-10`}
                  >
                    <div
                      className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-6 mx-auto"
                    >
                      {step.step}
                    </div>
                    <div className="text-4xl mb-4">{step.icon}</div>
                    <h3
                      className={`${themeStyles.descriptionText} text-xl font-bold mb-3`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`${themeStyles.descriptionText} font-montserrat`}
                    >
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
      {/* Earnings Calculator */}
      <section id="earnings" className="py-20 relative">
        <div
          className={` absolute inset-0 bg-gradient-to-br ${themeStyles.gradientBg}`}
        />
        <div className="wrapper2 w-full mx-auto px-4 relative">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.div
              variants={titleVariants}
              className="flex items-center justify-center text-blue-700 mb-4"
            >
              <span className={`text-sm font-semibold uppercase tracking-widest border ${themeStyles.badgeBorder} rounded-full px-4 py-1`}>
                Calculate Earnings
              </span>
            </motion.div>
            <motion.h2
              variants={titleVariants}
              className={`${themeStyles.descriptionText} text-4xl font-bold mb-4`}
            >
              How Much{" "}
              <span className="gradient-text-main">
                Can You Earn?
              </span>
            </motion.h2>
            <motion.p
              variants={textVariants}
              className={`text-lg max-w-2xl mx-auto ${themeStyles.descriptionText} font-montserrat`}
            >
              Calculate your potential monthly earnings
            </motion.p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            whileInView="visible"
            viewport={{ once: false }}
            className={`max-w-6xl mx-auto rounded-3xl backdrop-blur-sm ${themeStyles.cardBg} p-8 md:p-12`}
          >
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Products */}
              <div>
                <h3
                  className={`${themeStyles.descriptionText} text-2xl font-bold mb-8`}
                >
                  Products You Can Promote
                </h3>
                <div className="space-y-6">
                  {products.map((product) => (
                    <div
                      key={product.name}
                      className={`rounded-2xl p-6 backdrop-blur-sm ${themeStyles.cardBg}`}
                    >
                      <h4
                        className={`${themeStyles.descriptionText} font-bold text-xl mb-4`}
                      >
                        {product.name}
                      </h4>
                      <div className="space-y-3 mb-6">
                        {product.types.map((type) => (
                          <div
                            key={type}
                            className="flex items-center font-montserrat"
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-600 mr-3" />
                            <span className={themeStyles.descriptionText}>
                              {type}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p
                            className={`text-sm ${themeStyles.descriptionText}`}
                          >
                            Monthly Price
                          </p>
                          <p
                            className={`font-bold text-lg ${themeStyles.descriptionText}`}
                          >
                            {product.monthlyPrice}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`text-sm ${themeStyles.descriptionText}`}
                          >
                            Your Commission
                          </p>
                          <p className="font-bold text-lg text-green-400">
                            {product.commission}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculator */}
              <div>
                <h3
                  className={`text-2xl font-bold mb-8 ${themeStyles.descriptionText}`}
                >
                  Earnings Calculator
                </h3>
                <div className="space-y-8">
                  <div>
                    <label className={`block mb-4 ${themeStyles.titleText}`}>
                      Monthly Referrals:{" "}
                      <span className="text-blue-700 dark:text-blue-300 font-bold">
                        {referrals}
                      </span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={referrals}
                      onChange={(e) => setReferrals(parseInt(e.target.value))}
                      className="w-full h-3 bg-blue-100 dark:bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-blue-700"
                    />
                    <div className="flex justify-between mt-2">
                      <span className={themeStyles.descriptionText}>1</span>
                      <span className={themeStyles.descriptionText}>50</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div
                      className={`p-6 rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p
                            className={`text-sm ${themeStyles.descriptionText}`}
                          >
                            Monthly Earnings
                          </p>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                            ${earnings.monthly}
                          </p>
                        </div>
                        <BarChart3 className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                      </div>
                    </div>

                    <div
                      className={`p-6 rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p
                            className={`text-sm ${themeStyles.descriptionText}`}
                          >
                            Yearly Earnings
                          </p>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                            ${earnings.yearly}
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                      </div>
                    </div>

                    <div
                      className={`p-6 rounded-2xl backdrop-blur-sm ${themeStyles.cardBg}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p
                            className={`text-sm ${themeStyles.descriptionText}`}
                          >
                            3-Year Earnings
                          </p>
                          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                            ${earnings.threeYear}
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                      </div>
                    </div>
                  </div>

                  <p
                    className={`text-sm text-center ${themeStyles.descriptionText} font-montserrat`}
                  >
                    Based on average subscription value of $10 and 25%
                    commission
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-blue-500/5" />
        <div className="wrapper2 w-full mx-auto px-4 relative">
          <motion.div
            variants={cardVariants}
            whileInView="visible"
            viewport={{ once: false }}
            className="max-w-5xl mx-auto rounded-3xl p-8 md:p-12 text-center relative overflow-hidden border border-blue-200 bg-blue-700 shadow-sm shadow-blue-700/20 dark:border-blue-400/20"
          >
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-6 text-white">
                Ready to Start Earning?
              </h2>
              <p className="text-xl mb-10 text-white/90 max-w-2xl mx-auto font-montserrat">
                Join thousands of affiliates who are already earning recurring
                income with our program.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="https://app.rocketreplai.com/sign-in">
                  <Button
                    size="lg"
                    className="bg-white text-blue-700 hover:bg-blue-50 px-12 rounded-full font-semibold"
                  >
                    Join Free <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="#faq">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white border-white/40 bg-white/10 hover:bg-white/15 px-12 rounded-full"
                  >
                    Read FAQ <HelpCircle className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: false, margin: "-50px" }}
                className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                {[
                  { label: "No Fee", value: "Free to join", icon: Gift },
                  { label: "30 Days", value: "Cookie duration", icon: Clock },
                  { label: "24/7", value: "Support", icon: Shield },
                  { label: "$50", value: "Minimum payout", icon: CreditCard },
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    variants={cardVariants}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-white">
                      {item.label}
                    </div>
                    <div className="text-sm text-white/80">{item.value}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
      {/* FAQ Section */}
      <section id="faq" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        <div className="wrapper2 w-full mx-auto px-4 relative">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.div
              variants={titleVariants}
              className="flex items-center justify-center text-blue-700 mb-4"
            >
              <span className={`text-sm font-semibold uppercase tracking-widest border ${themeStyles.badgeBorder} rounded-full px-4 py-1`}>
                FAQ
              </span>
            </motion.div>
            <motion.h2
              variants={titleVariants}
              className={`text-4xl font-bold mb-4 ${themeStyles.descriptionText} `}
            >
              Frequently Asked{" "}
              <span className="gradient-text-main">
                Questions
              </span>
            </motion.h2>
            <motion.p
              variants={textVariants}
              className={`text-lg max-w-2xl mx-auto ${themeStyles.descriptionText} font-montserrat`}
            >
              Get answers to common questions about our affiliate program
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            className="max-w-4xl mx-auto space-y-6"
          >
            {faqData.map((faq, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover="hover"
                whileInView="visible"
                viewport={{ once: false }}
              >
                <Card className={`backdrop-blur-sm ${themeStyles.cardBg}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start">
                      <div className="bg-blue-700 rounded-xl p-3 mr-4">
                        <HelpCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3
                          className={`font-bold text-lg mb-3 ${themeStyles.titleText}`}
                        >
                          {faq.question}
                        </h3>
                        <p
                          className={`${themeStyles.descriptionText} font-montserrat`}
                        >
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      {/* Footer CTA */}
      <footer className="py-12 relative">
        <div className="wrapper2 w-full mx-auto px-4 relative">
          <div
            className={`rounded-3xl backdrop-blur-sm ${themeStyles.cardBg} p-8 md:p-12`}
          >
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-8 md:mb-0 text-center md:text-left">
                <div className="flex items-center space-x-3 justify-center md:justify-start">
                  <div className="w-12 h-12 bg-blue-700 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span
                      className={`text-2xl font-bold ${themeStyles.titleText}`}
                    >
                      Start Earning
                      <span className="gradient-text-main">
                        Today
                      </span>
                    </span>
                    <p
                      className={`mt-2 ${themeStyles.descriptionText} font-montserrat`}
                    >
                      Join our growing community of successful affiliates
                    </p>
                  </div>
                </div>
              </div>
              <Link href="https://app.rocketreplai.com/sign-in">
                <Button
                  size="lg"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-8 rounded-full"
                >
                  Start Earning Now <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
