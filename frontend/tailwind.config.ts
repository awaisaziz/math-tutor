import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tutor: {
          primary: "#5B8DEF",
          accent: "#FFC857",
        },
      },
    },
  },
  plugins: [],
};

export default config;
