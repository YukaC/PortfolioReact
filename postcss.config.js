module.exports = {
  plugins: {
    // Tailwind v4 already runs its output through Lightning CSS, which adds the
    // vendor prefixes this project needs. `autoprefixer` on top of it was a
    // second pass over the same CSS (P2-13); the dependency itself is the
    // package owner's call, not this file's.
    "@tailwindcss/postcss": {},
  },
}
