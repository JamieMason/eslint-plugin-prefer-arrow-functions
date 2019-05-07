import { DEFAULT_OPTIONS } from './config';
import preferArrowFunctions from './prefer-arrow-functions';

export = {
  rules: {
    'prefer-arrow-functions': preferArrowFunctions
  },
  rulesConfig: {
    'prefer-arrow-functions': [2, DEFAULT_OPTIONS]
  }
};
