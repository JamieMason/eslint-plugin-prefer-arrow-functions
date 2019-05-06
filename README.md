# eslint-plugin-prefer-arrow

ESLint plugin to prefer arrow functions. By default, the plugin allows usage of
`function` as a member of an Object's prototype, but this can be changed with
the property `disallowPrototype`. Functions referencing `this` will also be
allowed. Alternatively, with the `singleReturnOnly` option, this plugin only
reports functions where converting to an arrow function would dramatically
simplify the code.

This plugin will automatically fix your code using ESLint's `--fix` option, as
long as you use the `singleReturnOnly` option.

# Installation

Install the npm package

```bash
# If eslint is installed globally
npm install -g eslint-plugin-prefer-arrow

# If eslint is installed locally
npm install -D eslint-plugin-prefer-arrow
```

Add the plugin to the `plugins` section and the rule to the `rules` section in
your .eslintrc

```js
"plugins": [
  "prefer-arrow"
],
"rules": [
  "prefer-arrow/prefer-arrow-functions": [
     "warn",
     {
       "disallowPrototype": true,
       "singleReturnOnly": false,
       "classPropertiesAllowed": false
     }
   ]
]
```

# Configuration

- `disallowPrototype`: If set to true, the plugin will warn if `function` is
  used anytime. Otherwise, the plugin allows usage of `function` if it is a
  member of an Object's prototype.
- `singleReturnOnly`: If set to true, the plugin will only warn for `function`
  declarations which _only_ contain a return statement. These often look much
  better when declared as arrow functions without braces. Works well in
  conjunction with ESLint's built-in
  [arrow-body-style](http://eslint.org/docs/rules/arrow-body-style) set to
  `as-needed`.
- `classPropertiesAllowed`: (Only takes effect if `singleReturnOnly` is enabled)
  If set to true, the plugin will warn about functions which could be replaced
  with arrow functions defined as
  [class instance fields](https://github.com/jeffmo/es-class-static-properties-and-fields).
  Enable if you're using Babel's
  [transform-class-properties](https://babeljs.io/docs/plugins/transform-class-properties/)
  plugin.

# Autofixing

To autofix your code, simply run ESLint with the `--fix` option. Note that this
only works when the `singleReturnOnly` option is set to true.

```bash
eslint --fix src
```
