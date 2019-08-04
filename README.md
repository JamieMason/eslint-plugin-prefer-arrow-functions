# eslint-plugin-prefer-arrow-functions

> An ESLint Plugin to Lint and auto-fix plain Functions into Arrow Functions, in
> all cases where conversion would result in the same behaviour (Arrow Functions
> do not support `this`, `arguments`, or `new.target` for example).

[![NPM version](http://img.shields.io/npm/v/eslint-plugin-prefer-arrow-functions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prefer-arrow-functions)
[![NPM downloads](http://img.shields.io/npm/dm/eslint-plugin-prefer-arrow-functions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prefer-arrow-functions)
[![Build Status](http://img.shields.io/travis/JamieMason/eslint-plugin-prefer-arrow-functions/master.svg?style=flat-square)](https://travis-ci.org/JamieMason/eslint-plugin-prefer-arrow-functions)
[![Maintainability](https://api.codeclimate.com/v1/badges/795faa0b446ff7dddcdb/maintainability)](https://codeclimate.com/github/JamieMason/eslint-plugin-prefer-arrow-functions/maintainability)
[![Follow JamieMason on GitHub](https://img.shields.io/github/followers/JamieMason.svg?style=social&label=Follow)](https://github.com/JamieMason)
[![Follow fold_left on Twitter](https://img.shields.io/twitter/follow/fold_left.svg?style=social&label=Follow)](https://twitter.com/fold_left)

## ☁️ Installation

```
npm install --save-dev eslint eslint-plugin-prefer-arrow-functions
```

## 🏓 Playground

Try it yourself at
[ASTExplorer.net](https://astexplorer.net/#/gist/7c36fe8c604945df27df210cf79dcc3c/12f01bed4dcf08f32a85f72db0851440b7e45cdd)
by pasting code snippets in the top left panel, the results will appear in the
bottom right panel.

## ⚖️ Configuration

Add the plugin to the `plugins` section and the rule to the `rules` section in
your .eslintrc. The default values for options are listed in this example.

```json
{
  "plugins": ["prefer-arrow-functions"],
  "rules": {
    "prefer-arrow-functions/prefer-arrow-functions": [
      "warn",
      {
        "classPropertiesAllowed": false,
        "disallowPrototype": false,
        "returnStyle": "unchanged",
        "singleReturnOnly": false
      }
    ]
  }
}
```

## 🤔 Options

### `classPropertiesAllowed`

When `true`, functions defined as
[class instance fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Field_declarations)
will be converted to arrow functions when doing so would not alter or break
their behaviour.

### `disallowPrototype`

When `true`, functions assigned to a `prototype` will be converted to arrow
functions when doing so would not alter or break their behaviour.

### `returnStyle`

- When `"implicit"`, arrow functions such as `x => { return x; }` will be
  converted to `x => x`.
- When `"explicit"`, arrow functions such as `x => x` will be converted to
  `x => { return x; }`.
- When `"unchanged"` or not set, arrow functions will be left as they were.

### `singleReturnOnly`

When `true`, only `function` declarations which _only_ contain a return
statement will be converted. Functions containing block statements will be
ignored.

> This option works well in conjunction with ESLint's built-in
> [arrow-body-style](http://eslint.org/docs/rules/arrow-body-style) set to
> `as-needed`.

## 👏🏻 Credits

This project is a fork of https://github.com/TristonJ/eslint-plugin-prefer-arrow
by [Triston Jones](https://github.com/TristonJ).

## 🙋🏾‍♀️ Getting Help

- Get help with issues by creating a
  [Bug Report](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/issues/new?template=bug_report.md).
- Discuss ideas by opening a
  [Feature Request](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/issues/new?template=feature_request.md).
