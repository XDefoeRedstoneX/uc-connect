import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Client-side data fetching effects (the dominant pattern in this app —
      // load auth session, then fetch via a token) legitimately call setState
      // after an await. The rule's "cascading renders" warning fires on those
      // even though the setState is async. Demote to warning so the rule still
      // surfaces accidental synchronous chains without blocking lint.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // postcss.config.mjs is a config file; its anonymous default export is the
    // documented Tailwind v4 form. Silencing the rule for config files only.
    files: ["postcss.config.mjs"],
    rules: {
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
