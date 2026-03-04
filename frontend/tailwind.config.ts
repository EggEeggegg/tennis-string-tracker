import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark background palette (from original app)
        bg: {
          base: "#0b0f1a",
          card: "rgba(255,255,255,0.035)",
          hover: "rgba(255,255,255,0.05)",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          focus: "#3b82f6",
        },
        content: {
          DEFAULT: "#e2e8f0",
          muted: "#64748b",
          dim: "#374560",
        },
        accent: {
          blue: "#3b82f6",
          green: "#22c55e",
          amber: "#f59e0b",
          purple: "#a78bfa",
          red: "#f87171",
        },
      },
      fontFamily: {
        sans: ["Sarabun", "-apple-system", "sans-serif"],
        mono: ["Space Grotesk", "monospace"],
      },
      borderRadius: {
        card: "16px",
        item: "14px",
        input: "12px",
        chip: "20px",
      },
    },
  },
  plugins: [],
};

export default config;
