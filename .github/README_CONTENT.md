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
