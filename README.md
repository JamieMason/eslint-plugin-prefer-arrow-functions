# eslint-plugin-prefer-arrow-functions

> An ESLint Plugin to Lint and auto-fix plain Functions into Arrow Functions, in all cases where conversion would result in the same behaviour (Arrow Functions do not support `this`, `arguments`, or `new.target` for example).

## Installation

```bash
npm install --save-dev eslint eslint-plugin-prefer-arrow-functions
```

## Configuration

Add the plugin to the `plugins` section and the rule to the `rules` section in your .eslintrc. The default values for options are listed in this example.

```json
{
  "plugins": ["prefer-arrow-functions"],
  "rules": {
    "prefer-arrow-functions/prefer-arrow-functions": [
      "warn",
      {
        "allowedNames": [],
        "allowNamedFunctions": false,
        "allowObjectProperties": false,
        "classPropertiesAllowed": false,
        "disallowPrototype": false,
        "returnStyle": "unchanged",
        "singleReturnOnly": false
      }
    ]
  }
}
```

## Options

### `allowedNames`

An optional array of function names to ignore. When set, the rule won't report named functions such as `function foo() {}` whose name is identical to a member of this array.

### `allowNamedFunctions`

If set to true, the rule won't report named functions such as `function foo() {}`. Anonymous function such as `const foo = function() {}` will still be reported.

### `allowObjectProperties`

If set to true, the rule won't report named methods such as

```js
const myObj = {
  hello() {}
}
```

### `classPropertiesAllowed`

When `true`, functions defined as [class instance fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Field_declarations) will be converted to arrow functions when doing so would not alter or break their behaviour.

### `disallowPrototype`

When `true`, functions assigned to a `prototype` will be converted to arrow functions when doing so would not alter or break their behaviour.

### `returnStyle`

-   When `"implicit"`, arrow functions such as `x => { return x; }` will be converted to `x => x`.
-   When `"explicit"`, arrow functions such as `x => x` will be converted to `x => { return x; }`.
-   When `"unchanged"` or not set, arrow functions will be left as they were.

### `singleReturnOnly`

When `true`, only `function` declarations which _only_ contain a return statement will be converted. Functions containing block statements will be ignored.

> This option works well in conjunction with ESLint's built-in [arrow-body-style](http://eslint.org/docs/rules/arrow-body-style) set to `as-needed`.

## Credits

This project is a fork of <https://github.com/TristonJ/eslint-plugin-prefer-arrow> by [Triston Jones](https://github.com/TristonJ).

## Badges

- [![support on ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C4PY4P)
- [![NPM version](http://img.shields.io/npm/v/eslint-plugin-prefer-arrow-functions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prefer-arrow-functions)
- [![NPM downloads](http://img.shields.io/npm/dm/eslint-plugin-prefer-arrow-functions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prefer-arrow-functions)
- [![Build Status](https://img.shields.io/github/actions/workflow/status/JamieMason/eslint-plugin-prefer-arrow-functions/ci.yaml?branch=main)](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/actions)
