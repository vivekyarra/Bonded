import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        teal: "rgb(var(--teal) / <alpha-value>)",
        tealsoft: "rgb(var(--teal-soft) / <alpha-value>)",
        coral: "rgb(var(--coral) / <alpha-value>)",
        coralsoft: "rgb(var(--coral-soft) / <alpha-value>)",
        coralink: "rgb(var(--coral-ink) / <alpha-value>)",
        violet: "rgb(var(--violet) / <alpha-value>)",
        good: "rgb(var(--good) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "'SF Pro Text'", "'Segoe UI'", "Roboto", "sans-serif"],
        display: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "'SF Pro Display'", "sans-serif"],
        serif: ["var(--font-serif)", "'Iowan Old Style'", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: { xl2: "1.25rem", "3xl": "1.25rem" },
      screens: { fit: { raw: "(min-width: 1024px) and (min-height: 480px)" } },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.03)",
        glass: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.03)",
        lift: "0 12px 32px -12px rgb(15 23 42 / 0.22)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(10px) scale(0.98)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        flow: { "0%": { backgroundPosition: "0% 50%" }, "100%": { backgroundPosition: "200% 50%" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        blob: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.08)" },
          "66%": { transform: "translate(-30px,20px) scale(0.95)" },
        },
        pop: { "0%": { transform: "scale(0.6)", opacity: "0" }, "60%": { transform: "scale(1.08)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        sheet: { from: { transform: "translateY(24px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
      },
      animation: {
        rise: "rise .5s cubic-bezier(.2,.8,.2,1) backwards",
        shimmer: "shimmer 1.4s infinite",
        flow: "flow 3s linear infinite",
        float: "float 5s ease-in-out infinite",
        blob: "blob 22s ease-in-out infinite",
        pop: "pop .45s cubic-bezier(.2,.8,.2,1) backwards",
        sheet: "sheet .35s cubic-bezier(.2,.8,.2,1) backwards",
      },
    },
  },
  plugins: [],
};

export default config;
