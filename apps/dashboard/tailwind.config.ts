const withMT = require("@material-tailwind/react/utils/withMT");
import plugin from "tailwindcss/plugin";

module.exports = withMT({
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    extend: {
      // ── Custom colours ─────────────────────────────────────────────────────
      colors: {
        // Dark theme surfaces  (replaces bg-[#0F0F11] etc.)
        "dark-page": "#0F0F11",
        "dark-card": "#1A1A1E",
        "dark-input": "#252529",
        // Light theme surfaces
        "light-page": "#F8F9FA",
        "light-card": "#F8F9FC",
        // Brand
        brand: {
          pink: "#ec4899",
          rose: "#f43f5e",
          blue: "#3b82f6",
          purple: "#a855f7",
        },
      },

      // ── Font families ────────────────────────────────────────────────────
      fontFamily: {
        montserrat: ["var(--font-montserrat)", "sans-serif"],
        code: "var(--font-code)",
        orbitron: ["var(--font-orbitron)", "sans-serif"],
      },

      // ── Sidebar width token ──────────────────────────────────────────────
      spacing: {
        sidebar: "18rem", // var(--sidebar-width) = w-72 = 288px
        0.25: "0.0625rem",
        7.5: "1.875rem",
        15: "3.75rem",
      },

      // ── Extra backdrop blur steps ────────────────────────────────────────
      backdropBlur: {
        xs: "4px",
        "2xl": "32px",
        "3xl": "48px",
      },

      // ── Box shadows — glass ──────────────────────────────────────────────
      boxShadow: {
        glass:
          "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)",
        "glass-hover":
          "0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.10)",
        "card-pink": "0 8px 24px rgba(236,72,153,0.25)",
        "card-blue": "0 8px 24px rgba(59,130,246,0.25)",
        "card-green": "0 8px 24px rgba(34,197,94,0.25)",
      },

      // ── Background sizes for animated gradients ──────────────────────────
      backgroundSize: {
        "300%": "300% 300%",
      },

      // ── Keyframe animations ──────────────────────────────────────────────
      keyframes: {
        "grad-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "shimmer-sweep": {
          "0%": { transform: "translateX(-100%) rotate(25deg)" },
          "100%": { transform: "translateX(200%)  rotate(25deg)" },
        },
        "float-orb": {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%": { transform: "translateY(-20px) scale(1.05)" },
        },
        "ai-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(96,165,250,0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(96,165,250,0)" },
        },
      },

      // ── Animation utilities ──────────────────────────────────────────────
      animation: {
        "grad-shift": "grad-shift 15s ease infinite",
        "shimmer-sweep": "shimmer-sweep 4s ease-in-out infinite",
        "float-orb": "float-orb 8s ease-in-out infinite",
        "ai-pulse": "ai-pulse 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
      },

      // ── Border radius ────────────────────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },

  plugins: [
    plugin(function ({ addBase, addUtilities }) {
      addBase({});
      require("tailwindcss-animate");
      addUtilities({
        ".tap-highlight-color": {
          "-webkit-tap-highlight-color": "rgba(0, 0, 0, 0)",
        },
      });
    }),
  ],
});
