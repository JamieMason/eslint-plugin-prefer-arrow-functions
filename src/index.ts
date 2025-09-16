import { TSESLint } from '@typescript-eslint/utils';
import { preferArrowFunctions } from './rule';

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../package.json') as typeof import('../package.json');

export const meta = { name, version };

export const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  'prefer-arrow-functions': preferArrowFunctions,
};

const plugin: TSESLint.FlatConfig.Plugin = {
  meta,
  rules,
};

export const configs: TSESLint.FlatConfig.SharedConfigs = {
  all: {
    plugins: { 'prefer-arrow-functions': plugin },
    rules: {
      'prefer-arrow-functions/prefer-arrow-functions': 'warn',
    },
  },
};
plugin.configs = configs;

export default plugin;
