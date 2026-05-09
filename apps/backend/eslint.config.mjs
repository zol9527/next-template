import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "src/app/admin/users/page.tsx",
      "src/components/business/admin/order/admin-order-detail-form.tsx",
      "src/components/business/admin/mfa-setup/mfa-setup-page.tsx",
      "src/components/business/admin/user/admin-user-columns.tsx",
      "src/components/business/admin/user/document-review-tab.tsx",
      "src/components/business/admin/user-document/user-documents-section.tsx",
      "src/components/business/shared/user-avatar.tsx",
      "src/components/business/user/user-document/document-card.tsx",
      "src/components/business/user/user-shell.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: [
      "src/components/business/admin/agreement/admin-agreement-form.tsx",
      "src/components/ui/data-table/index.tsx",
    ],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "**/.next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "dist/**",
    "logs/**",
    "node_modules/**",
    "next-env.d.ts",
    // Exclude compiled/miniprogram outputs
    "platforms/**/unpackage/**",
    // Exclude deployment snapshot artifacts
    "deploy-prepare/raw/**",
    // Exclude auto-generated files
    "**/prisma/generated/**",
  ]),
]);

export default eslintConfig;
