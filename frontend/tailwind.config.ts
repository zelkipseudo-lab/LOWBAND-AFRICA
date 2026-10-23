import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      canvas: token("canvas"),
      ink: token("ink"),
      surface: token("surface"),
      "surface-raised": token("surface-raised"),
      foreground: token("foreground"),
      muted: token("muted"),
      accent: token("accent"),
      "accent-strong": token("accent-strong"),
      "accent-on-ink": token("accent-on-ink"),
      "accent-soft": token("accent-soft"),
      "on-ink": token("on-ink"),
      outline: token("border"),
      danger: token("danger"),
      warning: token("warning"),
    },
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        sm: "0 1px 2px rgb(var(--ink-rgb) / 0.18)",
        DEFAULT: "0 1px 3px rgb(var(--ink-rgb) / 0.22), 0 1px 2px rgb(var(--ink-rgb) / 0.12)",
        lg: "0 10px 15px -3px rgb(var(--ink-rgb) / 0.24), 0 4px 6px -4px rgb(var(--ink-rgb) / 0.18)",
        inner: "inset 0 2px 4px rgb(var(--ink-rgb) / 0.24)",
      },
    },
  },
  plugins: [],
} satisfies Config;
