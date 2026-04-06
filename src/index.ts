import type { ESLint, Linter, Rule } from 'eslint';
import { preferArrowFunctions } from './rule';

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../package.json') as typeof import('../package.json');

/**
 * The rule is authored with @typescript-eslint/utils and is fully compatible
 * with ESLint at runtime, but TSESLint's rule types are not assignable to
 * ESLint's native ones until
 * https://github.com/typescript-eslint/typescript-eslint/issues/9724 is
 * fixed. Once it is, this directive will be reported as unused (TS2578),
 * prompting its removal.
 */
// @ts-expect-error TSESLint and ESLint rule types are structurally incompatible
const ruleModule: Rule.RuleModule = preferArrowFunctions;

export const meta = { name, version };

export const rules: Record<string, Rule.RuleModule> = {
  'prefer-arrow-functions': ruleModule,
};

export const configs: Record<string, Linter.Config> = {};

// Narrows ESLint.Plugin's members — most importantly `configs`, whose values
// would otherwise widen to `LegacyConfig | Config | Config[]` and make
// e.g. `defineConfig([plugin.configs.all])` fail to compile. The narrowed
// members also keep the plugin assignable to typescript-eslint's flat config
// types (see test/types.ts).
interface PreferArrowFunctionsPlugin extends ESLint.Plugin {
  meta: typeof meta;
  rules: typeof rules;
  configs: typeof configs;
}

const plugin: PreferArrowFunctionsPlugin = {
  meta,
  rules,
  configs,
};

configs.all = {
  plugins: { 'prefer-arrow-functions': plugin },
  rules: {
    'prefer-arrow-functions/prefer-arrow-functions': 'warn',
  },
};

export default plugin;
