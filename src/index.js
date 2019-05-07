const { DEFAULT_OPTIONS } = require('./config');
const preferArrowFunctions = require('./prefer-arrow-functions');

module.exports = {
  rules: {
    'prefer-arrow-functions': preferArrowFunctions
  },
  rulesConfig: {
    'prefer-arrow-functions': [2, DEFAULT_OPTIONS]
  }
};
