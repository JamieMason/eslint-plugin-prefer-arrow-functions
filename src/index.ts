import type { ESLint, Linter, Rule } from 'eslint';
import { preferArrowFunctions } from './rule';

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../package.json') as typeof import('../package.json');

/**
 * Bridges a TSESLint rule to an ESLint-native Rule.RuleModule.
 *
 * TSESLint rules use TypeScript-enhanced AST types (TSESTree) internally
 * but are fully compatible with ESLint's native types at runtime.
 * The type systems are structurally incompatible due to TSESTree extending
 * ESTree's node unions with TypeScript-specific AST node types.
 * See: https://github.com/typescript-eslint/typescript-eslint/issues/9724
 */
function toRuleModule(rule: typeof preferArrowFunctions): Rule.RuleModule {
  return {
    // @ts-expect-error — TSESLint's RuleMetaData.deprecated is 'boolean | DeprecatedInfo'
    // which is wider than ESLint's 'boolean'. Compatible at runtime.
    meta: rule.meta,
    create(context): Rule.RuleListener {
      // @ts-expect-error — TSESLint and ESLint define RuleContext/RuleListener with
      // structurally incompatible AST types (TSESTree vs ESTree) that are identical
      // at runtime. See: https://github.com/typescript-eslint/typescript-eslint/issues/9724
      return rule.create(context);
    },
  };
}

export const meta = { name, version };

export const rules: Record<string, Rule.RuleModule> = {
  'prefer-arrow-functions': toRuleModule(preferArrowFunctions),
};

const plugin: ESLint.Plugin = {
  meta,
  rules,
};

export const configs: Record<string, Linter.Config> = {
  all: {
    plugins: { 'prefer-arrow-functions': plugin },
    rules: {
      'prefer-arrow-functions/prefer-arrow-functions': 'warn',
    },
  },
};
plugin.configs = configs;

export default plugin;
