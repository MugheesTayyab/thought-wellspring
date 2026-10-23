import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      ".output/**",
      ".vinxi/**",
      ".tmp-*/**",
      ".wrangler/**",
      ".tanstack/**",
      "artifacts/**",
      "src/routeTree.gen.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: [
      "src/client/components/ui/**/*.tsx",
      "src/client/stores/**/*-context.tsx",
      "src/routes/__root.tsx",
    ],
    rules: {
      // These modules intentionally colocate component-adjacent variants, contexts, and hooks.
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "src/server/__tests__/**/*.ts",
      "src/server/db/**/*.ts",
      "src/server/functions/posts.ts",
      "src/server/handlers/cron.ts",
      "src/server/lib/get-env.ts",
      "src/server/lib/wrap-server-fn.ts",
    ],
    rules: {
      // Supabase's dynamic row/error boundaries and legacy integration fixtures are runtime-validated.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  prettierConfig,
);
