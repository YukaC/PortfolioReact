/** @type {import('tailwindcss').Config} */
// Theme tokens live in `src/styles/globals.css` (`@theme`). This file is kept
// for `darkMode: "class"` (`html.dark` in `_document.js`) and content globs.
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
