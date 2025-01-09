import { TSESLint } from '@typescript-eslint/utils';
import { preferArrowFunctions } from './prefer-arrow-functions';

const { name, version } =
  // `import`ing here would bypass the TSConfig's `"rootDir": "src"`
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../package.json') as typeof import('../package.json');

const plugin: TSESLint.FlatConfig.Plugin = {
  meta: { name, version },
  rules: {
    'prefer-arrow-functions': preferArrowFunctions,
  },
};

export default plugin;
