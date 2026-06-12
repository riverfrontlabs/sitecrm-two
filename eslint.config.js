/**
 * ESLint flat config for every workspace in the monorepo.
 *
 * Layers, in order:
 * 1. Global ignores (build output, dependencies).
 * 2. ESLint's JS recommended rules.
 * 3. typescript-eslint's recommended rules (non-type-aware — fast enough to
 *    run on every save; `npm run typecheck` covers the type-level checks).
 * 4. React hooks rules for the two React workspaces.
 * 5. eslint-config-prettier last, to disable any rule that would fight
 *    Prettier over formatting.
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // React component code: enforce the Rules of Hooks.
    files: ['apps/web/**/*.{ts,tsx}', 'packages/design-system/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    rules: {
      // tsc already flags unused locals/params; keep ESLint aligned but allow
      // the conventional `_`-prefix escape hatch for intentionally unused args.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
);
