/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        "amber-glow": "var(--color-amber-glow)",
        "bg-main": "var(--color-bg)",
        "bg-light": "var(--color-bg-light)",
        surface: "var(--color-surface)",
        "text-main": "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        heading: ["Space Grotesk", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
      maxWidth: {
        container: "1280px",
      },
    },
  },
  plugins: [],
};
