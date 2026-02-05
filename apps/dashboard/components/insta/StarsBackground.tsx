"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export default function StarsBackground() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme || "light";

  useEffect(() => {
    const createStarParticles = () => {
      const starsContainer = document.getElementById("stars-container");
      if (!starsContainer) return;

      starsContainer.innerHTML = "";
      const numberOfStars = theme === "dark" ? 150 : 50;

      for (let i = 0; i < numberOfStars; i++) {
        const star = document.createElement("div");
        star.className = "absolute rounded-full star";

        const size = Math.random() * (theme === "dark" ? 3 : 2);
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        const darkColors = ["#00F0FF", "#B026FF", "#FF2E9F", "#FFFFFF"];
        const lightColors = ["#0066CC", "#8B5CF6", "#EC4899", "#64748B"];
        const colors = theme === "dark" ? darkColors : lightColors;
        star.style.backgroundColor =
          colors[Math.floor(Math.random() * colors.length)];

        star.style.opacity = `${Math.random() * 0.8 + 0.2}`;
        star.style.animationDelay = `${Math.random() * 3}s`;

        starsContainer.appendChild(star);
      }
    };

    createStarParticles();
  }, [theme]);

  return (
    <div
      id="stars-container"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
