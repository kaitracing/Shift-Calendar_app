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
        racing: {
          red: "#e11d48",
          darkred: "#9f1239",
          black: "#0f172a",
          gold: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
export default config;
