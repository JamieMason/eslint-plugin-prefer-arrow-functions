'use strict';

const { DEFAULT_OPTIONS } = require('./lib/config');
const preferArrowFunctions = require('./lib/rules/prefer-arrow-functions');

module.exports = {
  rules: {
    'prefer-arrow-functions': preferArrowFunctions
  },
  rulesConfig: {
    'prefer-arrow-functions': [2, DEFAULT_OPTIONS]
  }
};
