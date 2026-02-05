"use client";
import { Card, CardContent } from "@ainspiretech/ui/components/radix/card";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useMemo } from "react";

const testimonials = [
  {
    name: "Sarah Johnson",
    company: "Fashion Boutique",
    content:
      "“It answers customer questions instantly and sends their details to us — we never lose a lead now!”",
    rating: 5,
  },
  {
    name: "Mike Chen",
    company: "Tech Startup",
    content:
      "It handles FAQs better than a human. Visitors are impressed with fast, accurate replies.",
    rating: 5,
  },
  {
    name: "Emma Rodriguez",
    company: "Food Blog",
    content:
      "Our bookings increased by 40% just by adding the bot to our website.",
    rating: 5,
  },
];

export function WebTestimonialsSection() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  // Theme-based styles
  const themeStyles = useMemo(() => {
    const isDark = currentTheme === "dark";
    return {
      textPrimary: isDark ? "text-white" : "text-n-7",
      textSecondary: isDark ? "text-gray-300" : "text-n-5",
      textMuted: isDark ? "text-gray-400" : "text-n-5",
      containerBg: isDark ? "bg-[#0a0a0a]/10" : "bg-gray-100/50",
      cardBg: isDark ? "bg-[#0a0a0a]/10" : "bg-white/80",
      cardBorder: isDark ? "border-white/10" : "border-gray-300",
      cardHoverBorder: isDark
        ? "hover:border-[#258b94]/40"
        : "hover:border-[#00F0FF]/60",
      badgeBg: isDark ? "border-[#00F0FF]/30" : "border-blue-700/30",
    };
  }, [currentTheme]);
  // Enhanced animation variants matching FAQ section
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
      boxShadow: "0 20px 40px -10px rgba(37, 139, 148, 0.2)",
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

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  const contentVariants = {
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

  const ratingVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
    hover: {
      scale: 1.2,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <motion.section
      className={`py-16 ${themeStyles.textPrimary}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-100px" }}
      variants={containerVariants}
    >
      <motion.div
        className="flex items-center justify-center text-blue-700 mb-4"
        variants={titleVariants}
        whileInView="visible"
        viewport={{ once: false }}
        initial="hidden"
      >
        <span
          className={`text-sm font-medium uppercase tracking-widest border ${themeStyles.badgeBg} rounded-full px-4 py-1`}
        >
          CUSTOMER REVIEW
        </span>
      </motion.div>
      <div className="text-center mb-12">
        <motion.h2
          className={`text-3xl font-bold mb-4 gradient-text-main ${themeStyles.textPrimary}`}
          variants={titleVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          What Our Customers Say
        </motion.h2>
        <motion.p
          className={`text-xl ${themeStyles.textSecondary} font-montserrat`}
          variants={itemVariants}
          whileInView="visible"
          viewport={{ once: false }}
          initial="hidden"
        >
          Join Thousands Of Business Owners Who Have Transformed Their Website
          Visitors Into Booking Clients
        </motion.p>
      </div>

      <motion.div
        className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 ${themeStyles.containerBg} backdrop-blur-sm`}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-50px" }}
      >
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={index}
            variants={cardVariants}
            whileHover="hover"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px" }}
            initial="hidden"
            className={`h-full border ${themeStyles.cardBorder} rounded-lg ${themeStyles.cardBg}  ${themeStyles.cardHoverBorder} transition-colors duration-300`}
          >
            <Card className={`border-0 bg-transparent shadow-none h-full`}>
              <CardContent className="p-3 md:p-6">
                <motion.div
                  className="flex items-center gap-1 mb-4"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: false }}
                >
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-4 w-4 rounded-full bg-gradient-to-r from-[#00F0FF] to-[#FF2E9F]"
                      variants={ratingVariants}
                      whileHover="hover"
                    />
                  ))}
                </motion.div>

                <motion.p
                  className={`${themeStyles.textSecondary} mb-4 font-montserrat`}
                  variants={contentVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                >
                  {testimonial.content}
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  whileInView="visible"
                  viewport={{ once: false }}
                  initial="hidden"
                >
                  <p className={`font-semibold ${themeStyles.textPrimary}`}>
                    {testimonial.name}
                  </p>
                  <p className={`text-sm ${themeStyles.textMuted}`}>
                    {testimonial.company}
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export default WebTestimonialsSection;
