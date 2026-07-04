import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 暖炭黑背景
        canvas: "#14110F",
        // 结果代码块更深一档
        code: "#100D0B",
        // 正文米灰白 / 次要文字
        ink: "#E8E3DB",
        muted: "#8A837A",
        // 唯一强调色：朱砂红
        vermilion: "#C4302B",
        // 1px 描边
        hairline: "#2A2622",
      },
      fontFamily: {
        serif: ["var(--font-noto-serif-sc)", "Noto Serif SC", "serif"],
        sans: ["var(--font-noto-sans-sc)", "Noto Sans SC", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
