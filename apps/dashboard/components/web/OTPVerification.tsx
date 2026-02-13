"use client";

import React, { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@rocketreplai/ui/components/radix/use-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@rocketreplai/ui/components/radix/alert-dialog";
import { updateNumberByUserId } from "@/lib/services/user-actions.api";

interface OTPVerificationProps {
  phone: string;
  onVerified: () => void;
  userId: string | null;
}

const formSchema = z.object({
  OTP: z
    .string()
    .min(6, "OTP is required")
    .regex(/^\d+$/, "Invalid OTP format"),
});

type FormData = z.infer<typeof formSchema>;

export default function OTPVerification({
  phone,
  onVerified,
  userId,
}: OTPVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [wrongOtp, setWrongOtp] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const inputVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut",
      },
    }),
    focus: {
      scale: 1.05,
      borderColor: "#00F0FF",
      boxShadow: "0 0 20px rgba(0, 240, 255, 0.3)",
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
    hover: {
      borderColor: "#B026FF",
      boxShadow: "0 0 15px rgba(176, 38, 255, 0.2)",
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
  };
  const buttonVariants = {
    initial: {
      background: "linear-gradient(135deg, #00F0FF 0%, #B026FF 100%)",
    },
    hover: {
      background: "linear-gradient(135deg, #00F0FF 20%, #B026FF 80%)",
      scale: 1.02,
      boxShadow: "0 10px 30px rgba(0, 240, 255, 0.3)",
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    tap: {
      scale: 0.98,
    },
    loading: {
      background: "linear-gradient(135deg, #666 0%, #888 100%)",
    },
  };
  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtpValues = [...otpValues];
      newOtpValues[index] = value;
      setOtpValues(newOtpValues);

      // Update form value
      const otpString = newOtpValues.join("");
      setValue("OTP", otpString);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pasteData)) {
      const newOtpValues = pasteData.split("").slice(0, 6);
      const filledOtpValues = [
        ...newOtpValues,
        ...Array(6 - newOtpValues.length).fill(""),
      ];
      setOtpValues(filledOtpValues);
      setValue("OTP", pasteData);

      // Focus the next empty input or last input
      const nextIndex = Math.min(pasteData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleOTPSubmit = async (data: FormData) => {
    setIsVerifying(true);
    setWrongOtp(false);

    try {
      const { OTP } = data;
      const res = await fetch("/api/web/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, OTP }),
      });

      if (res.ok) {
        onVerified();
        if (!userId) {
          throw new Error("User database ID is not available.");
        }

        const response = await updateNumberByUserId(userId, phone);
        if (response) {
          toast({
            title: "Number successfully verified!",
            duration: 2000,
            className:
              "bg-gradient-to-r from-green-500 to-emerald-700 text-white border-0",
          });
        } else {
          toast({
            title: "Failed to verify number",
            duration: 2000,
            className:
              "bg-gradient-to-r from-[#FF2E9F] to-[#B026FF] text-white border-0",
          });
        }
      } else {
        setWrongOtp(true);
        // Shake animation for wrong OTP
        inputRefs.current.forEach((input, index) => {
          if (input) {
            input.animate(
              [
                { transform: "translateX(0)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(5px)" },
                { transform: "translateX(-5px)" },
                { transform: "translateX(5px)" },
                { transform: "translateX(0)" },
              ],
              {
                duration: 400,
                iterations: 1,
              },
            );
          }
        });
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Verification failed",
        description: "Please try again",
        duration: 2000,
        className:
          "bg-gradient-to-r from-red-500 to-pink-700 text-white border-0",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AlertDialog defaultOpen>
      <AlertDialogContent className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md p-0 overflow-hidden shadow-2xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00F0FF]/5 via-transparent to-[#B026FF]/5"></div>

          {/* Header */}
          <div className="relative p-6 border-b border-white/10">
            <div className="flex justify-between items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <AlertDialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF]">
                  OTP Verification
                </AlertDialogTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Secure your account
                </p>
              </motion.div>

              <AlertDialogCancel
                onClick={() => router.push(`/`)}
                className="border-0 p-2 hover:bg-white/10 rounded-xl transition-all duration-300 group"
              >
                <XMarkIcon className="size-5 text-gray-400 group-hover:text-white transition-colors" />
              </AlertDialogCancel>
            </div>
          </div>

          {/* Content */}
          <form
            onSubmit={handleSubmit(handleOTPSubmit)}
            className="p-6 space-y-6"
          >
            {/* Phone Number Display */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className="text-gray-300 text-sm mb-2">
                Enter the verification code sent to
              </p>
              <p className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF]">
                {phone}
              </p>
            </motion.div>

            {/* OTP Input Boxes */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-gray-300 text-center">
                Enter 6-digit code
              </label>

              <div className="flex justify-center gap-3">
                {otpValues.map((value, index) => (
                  <motion.input
                    key={index}
                    ref={(el: any) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    custom={index}
                    variants={inputVariants}
                    initial="hidden"
                    animate="visible"
                    whileFocus="focus"
                    whileHover="hover"
                    className="w-12 h-12 bg-[#1a1a1a]/80 backdrop-blur-sm border-2 border-white/10 rounded-xl text-white text-center text-xl font-bold focus:outline-none focus:border-[#00F0FF] transition-all duration-300"
                    disabled={isVerifying}
                  />
                ))}
              </div>

              <AnimatePresence>
                {(errors.OTP || wrongOtp) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-center"
                  >
                    <p className="text-red-400 text-sm bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                      {errors.OTP?.message ||
                        "Wrong OTP. Please enter the correct code."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Verify Button */}
            <motion.button
              type="submit"
              variants={buttonVariants}
              initial="initial"
              whileHover={isVerifying ? "loading" : "hover"}
              whileTap="tap"
              animate={isVerifying ? "loading" : "initial"}
              className={`w-full py-4 relative z-30 rounded-xl font-bold text-lg text-white transition-all duration-300 ${
                isVerifying ? "cursor-not-allowed" : ""
              }`}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <motion.div
                  className="flex items-center justify-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Verifying...
                </motion.div>
              ) : (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Verify OTP
                </motion.span>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="p-4 text-center border-t border-white/10 bg-black/20"
          >
            <AlertDialogDescription className="text-sm">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00F0FF] to-[#B026FF] font-semibold font-montserrat">
                IT WILL HELP US TO PROVIDE BETTER SERVICES
              </span>
            </AlertDialogDescription>
          </motion.div>

          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-[#00F0FF]/10 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-[#B026FF]/10 rounded-full blur-xl translate-x-1/2 translate-y-1/2"></div>
        </motion.div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
