import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(239, 68, 68, 0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashGreen: {
          "0%": { backgroundColor: "rgba(34, 197, 94, 0.28)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashGold: {
          "0%": { backgroundColor: "rgba(234, 179, 8, 0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        floatUp: {
          "0%": {
            opacity: "0",
            transform: "translateY(4px) scale(0.9)",
          },
          "15%": {
            opacity: "1",
            transform: "translateY(-4px) scale(1.05)",
          },
          "80%": {
            opacity: "1",
            transform: "translateY(-14px) scale(1)",
          },
          "100%": {
            opacity: "0",
            transform: "translateY(-22px) scale(0.95)",
          },
        },
      },
      animation: {
        shake: "shake 0.4s cubic-bezier(.36,.07,.19,.97) both",
        flashRed: "flashRed 0.4s ease-out",
        flashGreen: "flashGreen 0.5s ease-out",
        flashGold: "flashGold 0.5s ease-out",
        floatUp: "floatUp 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
