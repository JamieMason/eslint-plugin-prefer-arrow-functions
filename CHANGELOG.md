# 3.0.0 (2019-05-07)

### Features

- add formal support for async functions
  ([45b597b](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/commit/45b597b))
- add option to set a return style of implicit or explicit
  ([378186d](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/commit/378186d))
- skip functions containing this, arguments, super, and new.target
  ([f1cee8c](https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/commit/f1cee8c))

### BREAKING CHANGES

- Drops support for recommending use of class constructors in niche cases.
- Drops support for preserving comments
