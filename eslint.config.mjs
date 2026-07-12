import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  {
    // R3F mutates camera/scene inside useFrame — required Three.js pattern.
    files: ["src/components/bebop/**/*.{js,jsx}"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);
