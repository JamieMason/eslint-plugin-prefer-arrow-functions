module.exports = {
  DEFAULT_OPTIONS: {
    classPropertiesAllowed: false,
    disallowPrototype: false,
    returnStyle: 'unchanged',
    singleReturnOnly: false
  },
  USE_ARROW_WHEN_SINGLE_RETURN:
    'Prefer using arrow functions when the function contains only a return',
  USE_ARROW_WHEN_FUNCTION: 'Prefer using arrow functions over plain functions',
  USE_EXPLICIT:
    'Prefer using explicit returns when the arrow function contain only a return',
  USE_IMPLICIT:
    'Prefer using implicit returns when the arrow function contain only a return'
};
