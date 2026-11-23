/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { primary: { DEFAULT: "#2563EB", dark: "#1D4ED8", soft: "#EFF6FF" }, secondary: { DEFAULT: "#14B8A6", soft: "#F0FDFA", ink: "#0F766E" },
                canvas: "#F8FAFC", ink: "#0F172A", line: "#E2E8F0", muted: "#475569" },
      fontFamily: { display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"], sans: ["Figtree", "system-ui", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(15,23,42,.05), 0 8px 24px -12px rgba(15,23,42,.12)" },
    },
  },
  plugins: [],
};
