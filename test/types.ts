/**
 * Compile-time regression tests for the plugin's exported types, checked by
 * `npm run typecheck`. If any of these assignments stops compiling, a change
 * has broken consumers of that ecosystem.
 *
 * See https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/pull/70
 */
import type { TSESLint } from '@typescript-eslint/utils';
import type { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import preferArrowFunctions, { configs } from '../src/index';

// ESLint-native consumers: defineConfig() accepts the plugin and its shared
// configs without TS2322.
export const nativeDefineConfig = defineConfig([
  {
    plugins: {
      'prefer-arrow-functions': preferArrowFunctions,
    },
    rules: {
      'prefer-arrow-functions/prefer-arrow-functions': 'error',
    },
  },
]);
export const nativeSharedConfig = defineConfig([preferArrowFunctions.configs.all]);
export const nativeFlatConfigArray: Linter.Config[] = [configs.all];

// typescript-eslint consumers: the plugin stays assignable to TSESLint's flat
// config types, so `tseslint.config({ plugins: { ... } })` keeps compiling.
export const tseslintPlugin: TSESLint.FlatConfig.Plugin = preferArrowFunctions;
export const tseslintPlugins: TSESLint.FlatConfig.Plugins = {
  'prefer-arrow-functions': preferArrowFunctions,
};
