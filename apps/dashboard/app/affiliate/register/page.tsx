"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import Logo from "@ainspiretech/public/assets/img/logo.png";
import {
  ChevronRight,
  Check,
  ArrowLeft,
  BanknoteIcon,
  Smartphone,
  CreditCard,
  Shield,
  FileText,
  CheckCircle2,
  Zap,
  Building,
  User,
  Mail,
} from "lucide-react";

import { ThemeToggle } from "@ainspiretech/ui/components/shared/theme-toggle";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@ainspiretech/ui/components/radix/button";
import { toast } from "@ainspiretech/ui/components/radix/use-toast";
import { createAffiliateLink } from "@/lib/services/affiliate-actions.api";
import { useAuth } from "@clerk/nextjs";

export default function AffiliateRegisterPage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "upi" | "paypal">(
    "bank",
  );
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  // Use resolvedTheme to avoid theme switching flash
  const currentTheme = resolvedTheme || theme || "light";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    upiId: "",
    paypalEmail: "",
  });

  // Set mounted state after hydration
  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }
    if (!isLoaded) {
      return;
    }
    setMounted(true);
  }, [router, userId, isLoaded]);

  // Memoize theme-based styles to prevent recalculation on every render
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      containerBg: isDark
        ? "bg-[#0a0a0a]"
        : "bg-gradient-to-b from-gray-50 to-white",
      cardBg: isDark
        ? "bg-[#1a1a1a] border-white/10"
        : "bg-white border-gray-200",
      titleText: isDark ? "text-white" : "text-gray-900",
      descriptionText: isDark ? "text-gray-300" : "text-gray-600",
      inputBg: isDark
        ? "bg-[#2a2a2a] border-white/20"
        : "bg-white border-gray-300",
      badgeBorder: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
      gradientBg: isDark
        ? "from-[#00F0FF]/10 via-[#B026FF]/5 to-transparent"
        : "from-blue-50 via-purple-50 to-transparent",
    };
  }, [currentTheme]);

  // Simplified animation variants (remove viewport triggers)
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, duration: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3 },
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
  };

  const stepVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.2 },
    },
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the terms and conditions",
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      const data = await createAffiliateLink({
        paymentMethod,
        ...formData,
      });

      if (data.success) {
        toast({
          title: "Success!",
          description: "Affiliate account created successfully",
          duration: 3000,
        });
        router.push("/affiliate/dashboard");
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create account",
          duration: 3000,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        duration: 3000,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: "bank" as const,
      icon: Building,
      title: "Bank Transfer",
      description: "Direct to your account",
      gradient: "from-blue-400 to-cyan-500",
    },
    {
      id: "upi" as const,
      icon: Smartphone,
      title: "UPI",
      description: "Instant UPI transfer",
      gradient: "from-purple-400 to-pink-500",
    },
    {
      id: "paypal" as const,
      icon: CreditCard,
      title: "PayPal",
      description: "International payments",
      gradient: "from-orange-400 to-red-500",
    },
  ];

  const steps = [
    { number: 1, title: "Personal Info", description: "Basic details" },
    { number: 2, title: "Payment Setup", description: "How you get paid" },
    { number: 3, title: "Terms", description: "Review and agree" },
    { number: 4, title: "Complete", description: "Ready to go!" },
  ];

  // Don't render until mounted to avoid hydration mismatch
  if (!isLoaded || !mounted) {
    return (
      <div className="min-h-screen bg-transparent  flex items-center justify-center h-full w-full">
        <div className="w-5 h-5 border-2 border-t-transparent border-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${themeStyles.containerBg} transition-colors duration-300`}
    >
      {/* Simple Header without animations */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/95 dark:bg-[#0a0a0a]/95 border-b border-gray-200 dark:border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#B026FF]"></div>
                <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
                  <Image
                    alt="Logo"
                    src={Logo}
                    width={24}
                    height={24}
                    className="object-contain"
                    priority // Add priority for LCP
                  />
                </div>
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]">
                Ainpire<span className="text-[#B026FF]">Tech</span>
              </h1>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center text-blue-700 mb-4">
            <span
              className={`text-sm font-medium uppercase tracking-widest border ${themeStyles.badgeBorder} rounded-full px-4 py-1`}
            >
              Join Our Program
            </span>
          </div>
          <h1
            className={`text-3xl md:text-4xl font-bold mb-4 ${themeStyles.titleText}`}
          >
            Become an{" "}
            <span className="bg-gradient-to-r from-[#00F0FF] to-[#B026FF] bg-clip-text text-transparent">
              Affiliate Partner
            </span>
          </h1>
          <p
            className={`text-lg max-w-2xl mx-auto ${themeStyles.descriptionText} font-montserrat`}
          >
            Earn 30% commission on every subscription you refer! Monthly
            subscriptions pay for 10 months, yearly for 3 years.
          </p>
        </div>

        {/* Progress Steps - Simplified */}
        <div className="mb-12">
          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 -translate-y-1/2"></div>
            <div
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] -translate-y-1/2 transition-all duration-500"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />

            <div className="relative flex justify-between">
              {steps.map((s) => (
                <div key={s.number} className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                      step >= s.number
                        ? "bg-gradient-to-r from-[#00F0FF] to-[#B026FF] border-transparent text-white"
                        : `border-gray-300 ${
                            currentTheme === "dark"
                              ? "bg-[#2a2a2a] text-gray-400"
                              : "bg-white text-gray-400"
                          }`
                    }`}
                  >
                    {step > s.number ? (
                      <Check className="w-6 h-6" />
                    ) : (
                      <span className="text-lg font-bold">{s.number}</span>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div
                      className={`text-sm font-medium ${
                        step >= s.number
                          ? themeStyles.titleText
                          : themeStyles.descriptionText
                      }`}
                    >
                      {s.title}
                    </div>
                    <div className="text-xs text-gray-500 font-montserrat">
                      {s.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Container */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className={`rounded-2xl ${themeStyles.cardBg} border p-6 md:p-8 shadow-lg`}
        >
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <h2
                      className={`text-2xl font-bold mb-2 ${themeStyles.titleText}`}
                    >
                      Personal Information
                    </h2>
                    <p
                      className={`${themeStyles.descriptionText} font-montserrat`}
                    >
                      Tell us a bit about yourself
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                      >
                        First Name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                      >
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                      required
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 2: Payment Setup */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <h2
                      className={`text-2xl font-bold mb-2 ${themeStyles.titleText}`}
                    >
                      Payment Information
                    </h2>
                    <p
                      className={`${themeStyles.descriptionText} font-montserrat`}
                    >
                      Choose how you want to receive payments
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          paymentMethod === method.id
                            ? "border-[#00F0FF] bg-gradient-to-br from-[#00F0FF]/10 to-[#B026FF]/10"
                            : "border-gray-300 hover:border-[#00F0FF]/50"
                        } ${themeStyles.cardBg}`}
                      >
                        <div
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${method.gradient} flex items-center justify-center mb-3`}
                        >
                          <method.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="font-bold text-base mb-1">
                          {method.title}
                        </div>
                        <div
                          className={`text-sm font-montserrat ${themeStyles.descriptionText}`}
                        >
                          {method.description}
                        </div>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "bank" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                          >
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            name="accountName"
                            value={formData.accountName}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                            required
                          />
                        </div>

                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                          >
                            Account Number
                          </label>
                          <input
                            type="text"
                            name="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                          >
                            Bank Name
                          </label>
                          <input
                            type="text"
                            name="bankName"
                            value={formData.bankName}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                            required
                          />
                        </div>

                        <div>
                          <label
                            className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                          >
                            IFSC Code
                          </label>
                          <input
                            type="text"
                            name="ifscCode"
                            value={formData.ifscCode}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "upi" && (
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                      >
                        UPI ID
                      </label>
                      <input
                        type="text"
                        name="upiId"
                        value={formData.upiId}
                        onChange={handleChange}
                        placeholder="yourname@upi"
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                        required
                      />
                    </div>
                  )}

                  {paymentMethod === "paypal" && (
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${themeStyles.descriptionText}`}
                      >
                        PayPal Email
                      </label>
                      <input
                        type="email"
                        name="paypalEmail"
                        value={formData.paypalEmail}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent ${themeStyles.inputBg}`}
                        required
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Terms & Conditions */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div>
                    <h2
                      className={`text-2xl font-bold mb-2 ${themeStyles.titleText}`}
                    >
                      Terms & Conditions
                    </h2>
                    <p className={themeStyles.descriptionText}>
                      Please review and agree to continue
                    </p>
                  </div>

                  <div
                    className={`p-6 rounded-xl max-h-80 overflow-y-auto font-montserrat ${
                      currentTheme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-50"
                    }`}
                  >
                    <div className="space-y-6">
                      {[
                        {
                          icon: BanknoteIcon,
                          title: "Commission Structure",
                          items: [
                            "30% commission on every successful referral",
                            "Monthly subscriptions: Commission paid for 10 consecutive months",
                            "Yearly subscriptions: Commission paid for 3 consecutive years",
                            "Earn commission on each product if user subscribes to multiple",
                          ],
                          gradient: "from-blue-400 to-cyan-500",
                        },
                        {
                          icon: FileText,
                          title: "Payout Schedule",
                          items: [
                            "Commissions calculated at the end of each month",
                            "Payouts processed within 7 business days after month-end",
                            "Minimum payout amount: $50",
                            "Unpaid earnings roll over to the next month",
                          ],
                          gradient: "from-purple-400 to-pink-500",
                        },
                        {
                          icon: Shield,
                          title: "Rules & Guidelines",
                          items: [
                            "Do not spam or use unethical marketing practices",
                            "Do not create fake accounts or self-refer",
                            "Commissions void if referred user requests a refund",
                            "We reserve the right to terminate violating accounts",
                          ],
                          gradient: "from-orange-400 to-red-500",
                        },
                      ].map((section, idx) => (
                        <div key={idx}>
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`w-8 h-8 rounded-lg bg-gradient-to-r ${section.gradient} flex items-center justify-center`}
                            >
                              <section.icon className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="font-bold text-lg">
                              {section.title}
                            </h3>
                          </div>
                          <ul className="space-y-2 pl-2">
                            {section.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="flex items-start">
                                <Check className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                                <span className={themeStyles.descriptionText}>
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center p-4 rounded-lg border border-gray-300">
                    <input
                      type="checkbox"
                      id="agree"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="h-5 w-5 rounded bg-gradient-to-r from-[#00F0FF] to-[#B026FF] checked:bg-gradient-to-r"
                    />
                    <label htmlFor="agree" className="ml-3 cursor-pointer">
                      <span
                        className={`block font-medium ${themeStyles.titleText}`}
                      >
                        I agree to the terms and conditions
                      </span>
                      <span
                        className={`text-sm font-montserrat ${themeStyles.descriptionText}`}
                      >
                        By checking this box, you agree to our affiliate program
                        rules
                      </span>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Complete */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center py-8"
                >
                  <div className="w-24 h-24 bg-gradient-to-r from-[#00F0FF] to-[#B026FF] rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                  <h2
                    className={`text-3xl font-bold mb-4 ${themeStyles.titleText}`}
                  >
                    Ready to Go!
                  </h2>
                  <p
                    className={`text-lg mb-8 max-w-md mx-auto font-montserrat ${themeStyles.descriptionText}`}
                  >
                    Your affiliate account will be created. You will receive
                    your unique affiliate link immediately.
                  </p>

                  <div
                    className={`p-6 rounded-xl ${
                      currentTheme === "dark" ? "bg-[#2a2a2a]" : "bg-gray-50"
                    } mb-8`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className={themeStyles.descriptionText}>
                          Payment Method
                        </span>
                        <span className="font-medium capitalize">
                          {paymentMethod}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={themeStyles.descriptionText}>
                          Email
                        </span>
                        <span className="font-medium">{formData.email}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={themeStyles.descriptionText}>
                          Commission Rate
                        </span>
                        <span className="font-bold text-green-400">30%</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
              {step > 1 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  variant="outline"
                  className="px-6 rounded-lg border-[#00F0FF]/50 text-[#00F0FF] hover:bg-[#00F0FF]/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="ml-auto px-8 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#B026FF] hover:from-[#00F0FF] hover:to-[#B026FF]/90 text-white"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !agreed}
                  className="ml-auto px-8 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-400 hover:to-emerald-600 text-white disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Submit <Zap className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
