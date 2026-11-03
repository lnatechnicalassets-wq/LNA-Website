import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "*.tsbuildinfo",
      "next-env.d.ts",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "scripts/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // Rule R16: No console.log in committed code
      "no-console": ["error", { allow: ["warn", "error"] }],

      // Rule R4 & Architecture boundaries:
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["content/*", "**/content/*"],
              message:
                "Components never import from /content directly. Use @/lib/content (Rule R4).",
            },
          ],
        },
      ],

      // TypeScript strictness
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Specific restriction for server modules handling payments and enrollment
    files: ["src/server/{payments,enrollment}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/content", "@/lib/content/**", "content/**"],
              message:
                "Payment and enrollment server code may not import the content module. Prices always come from the database (Rule R5, SRS FR-PAY-003).",
            },
          ],
        },
      ],
    },
  }
);
