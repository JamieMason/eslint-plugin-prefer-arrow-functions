export const validWhenSingleReturnOnly = [
  {
    code: 'var foo = (bar) => {return bar();}',
  },
  {
    code: 'var foo = async (bar) => {return bar();}',
  },
  {
    code: 'function foo(bar) {bar()}',
  },
  {
    code: 'async function foo(bar) {bar()}',
  },
  {
    code: 'var x = function foo(bar) {bar()}',
  },
  {
    code: 'var x = async function foo(bar) {bar()}',
  },
  {
    code: 'var x = function(bar) {bar()}',
  },
  {
    code: 'var x = async function(bar) {bar()}',
  },
  {
    code: 'function foo(bar) {/* yo */ bar()}',
  },
  {
    code: 'async function foo(bar) {/* yo */ bar()}',
  },
  {
    code: 'function foo() {}',
  },
  {
    code: 'async function foo() {}',
  },
  {
    code: 'function foo(bar) {bar(); return bar()}',
  },
  {
    code: 'async function foo(bar) {bar(); return bar()}',
  },
  {
    code: 'class MyClass { foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'class MyClass { async foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'class MyClass { static foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'class MyClass { static async foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'class MyClass {constructor(foo){this.foo = foo;}}; MyClass.prototype.func = function() {this.foo = "bar";};',
  },
  {
    code: 'var MyClass = { foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'var MyClass = { async foo(bar) {bar(); return bar()} }',
  },
  {
    code: 'export default function xyz() { return 3; }',
  },
  {
    code: 'export default async function xyz() { return 3; }',
  },
  {
    code: 'class MyClass { render(a, b) { return 3; } }',
  },
  {
    code: 'class MyClass { async render(a, b) { return 3; } }',
  },
];

export const invalidAndHasSingleReturn = [
  // ES6 classes & functions declared in object literals
  {
    code: 'class MyClass { render(a, b) { return 3; } }',
    output: 'class MyClass { render = (a, b) => 3; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'class MyClass { render(a: number, b: number): number { return 3; } }',
    output: 'class MyClass { render = (a: number, b: number): number => 3; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'var MyClass = { render(a, b) { return 3; }, b: false }',
    output: 'var MyClass = { render: (a, b) => 3, b: false }',
  },

  // named function declarations
  {
    code: 'function foo() { return 3; }',
    output: 'const foo = () => 3;',
  },
  {
    code: 'function foo(): number { return 3; }',
    output: 'const foo = (): number => 3;',
  },
  {
    code: 'async function foo() { return 3; }',
    output: 'const foo = async () => 3;',
  },
  {
    code: 'function foo(a) { return 3 }',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) { return 3 }',
    output: 'const foo = async (a) => 3;',
  },
  {
    code: 'function foo(a) { return 3; }',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) { return 3; }',
    output: 'const foo = async (a) => 3;',
  },
  {
    code: 'function identity<T>(t: T): T { return t; }',
    output: 'const identity = <T>(t: T): T => t;',
  },
  {
    code: 'function identity<T>(t: T) { return t; }',
    output: 'const identity = <T>(t: T) => t;',
  },

  // Eslint treats export default as a special form of function declaration
  {
    code: 'export default function() { return 3; }',
    output: 'export default () => 3;',
  },
  {
    code: 'export default function(): number { return 3; }',
    output: 'export default (): number => 3;',
  },
  {
    code: 'export default async function() { return 3; }',
    output: 'export default async () => 3;',
  },

  // Sanity check complex logic
  {
    code: 'function foo(a) { return a && (3 + a()) ? true : 99; }',
    output: 'const foo = (a) => a && (3 + a()) ? true : 99;',
  },
  {
    code: 'async function foo(a) { return a && (3 + a()) ? true : 99; }',
    output: 'const foo = async (a) => a && (3 + a()) ? true : 99;',
  },

  // function expressions
  {
    code: 'var foo = function(bar) { return bar(); }',
    output: 'var foo = (bar) => bar()',
  },
  {
    code: 'var foo = function() { return "World"; }',
    output: 'var foo = () => "World"',
  },
  {
    code: 'var foo = async function() { return "World"; }',
    output: 'var foo = async () => "World"',
  },
  {
    code: 'var foo = function() { return "World"; };',
    output: 'var foo = () => "World";',
  },
  {
    code: 'var foo = async function() { return "World"; };',
    output: 'var foo = async () => "World";',
  },
  {
    code: 'var foo = function x() { return "World"; };',
    output: 'var foo = () => "World";',
  },
  {
    code: 'var foo = async function x() { return "World"; };',
    output: 'var foo = async () => "World";',
  },

  // wrap object literal returns in parens
  {
    code: 'var foo = function() { return {a: false} }',
    output: 'var foo = () => ({a: false})',
  },
  {
    code: 'var foo = async function() { return {a: false} }',
    output: 'var foo = async () => ({a: false})',
  },
  {
    code: 'var foo = function() { return {a: false}; }',
    output: 'var foo = () => ({a: false})',
  },
  {
    code: 'var foo = async function() { return {a: false}; }',
    output: 'var foo = async () => ({a: false})',
  },
  {
    code: 'function foo(a) { return {a: false}; }',
    output: 'const foo = (a) => ({a: false});',
  },
  {
    code: 'async function foo(a) { return {a: false}; }',
    output: 'const foo = async (a) => ({a: false});',
  },
  {
    code: 'function foo(a) { return {a: false} }',
    output: 'const foo = (a) => ({a: false});',
  },
  {
    code: 'async function foo(a) { return {a: false} }',
    output: 'const foo = async (a) => ({a: false});',
  },

  // treat inner functions properly
  {
    code: '["Hello", "World"].reduce(function(a, b) { return a + " " + b; })',
    output: '["Hello", "World"].reduce((a, b) => a + " " + b)',
  },
  {
    code: 'var foo = function () { return () => false }',
    output: 'var foo = () => () => false',
  },
  {
    code: 'var foo = async function () { return async () => false }',
    output: 'var foo = async () => async () => false',
  },

  // don't obliterate whitespace and only remove newlines when appropriate
  {
    code: 'var foo = function() {\n  return "World";\n}',
    output: 'var foo = () => "World"',
  },
  {
    code: 'var foo = async function() {\n  return "World";\n}',
    output: 'var foo = async () => "World"',
  },
  {
    code: 'var foo = function() {\n  return "World"\n}',
    output: 'var foo = () => "World"',
  },
  {
    code: 'var foo = async function() {\n  return "World"\n}',
    output: 'var foo = async () => "World"',
  },
  {
    code: 'function foo(a) {\n  return 3;\n}',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) {\n  return 3;\n}',
    output: 'const foo = async (a) => 3;',
  },
  {
    code: 'function foo(a) {\n  return 3\n}',
    output: 'const foo = (a) => 3;',
  },
  {
    code: 'async function foo(a) {\n  return 3\n}',
    output: 'const foo = async (a) => 3;',
  },

  // don't mess up inner generator functions
  {
    code: 'function foo() { return function * gen() { return yield 1; }; }',
    output: 'const foo = () => function * gen() { return yield 1; };',
  },
  {
    code: 'async function foo() { return function * gen() { return yield 1; }; }',
    output: 'const foo = async () => function * gen() { return yield 1; };',
  },

  // don't mess with the semicolon in for statements
  {
    code: 'function withLoop() { return () => { for (i = 0; i < 5; i++) {}}}',
    output: 'const withLoop = () => () => { for (i = 0; i < 5; i++) {}};',
  },
  {
    code: 'async function withLoop() { return async () => { for (i = 0; i < 5; i++) {}}}',
    output: 'const withLoop = async () => async () => { for (i = 0; i < 5; i++) {}};',
  },
  {
    code: 'var withLoop = function() { return () => { for (i = 0; i < 5; i++) {}}}',
    output: 'var withLoop = () => () => { for (i = 0; i < 5; i++) {}}',
  },
  {
    code: 'var withLoop = async function() { return async () => { for (i = 0; i < 5; i++) {}}}',
    output: 'var withLoop = async () => async () => { for (i = 0; i < 5; i++) {}}',
  },

  // function overloading - don't mislabel as overload
  //   export { x }; has node.declaration === null - regression test for this case
  {
    code: 'export { foo }; export async function bar() { return false; }',
    output: 'export { foo }; export const bar = async () => false;',
  },
];

export const invalidAndHasSingleReturnWithMultipleMatches = [
  {
    code: 'var foo = function () { return function(a) { a() } }',
    output: 'var foo = () => function(a) { a() }',
  },
  {
    code: 'var foo = async function () { return async function(a) { a() } }',
    output: 'var foo = async () => async function(a) { a() }',
  },
];

export const invalidAndHasBlockStatement = [
  // ES6 classes & functions declared in object literals
  {
    code: 'class MyClass { render(a, b) { console.log(3); } }',
    output: 'class MyClass { render = (a, b) => { console.log(3); }; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'class MyClass { #render(a, b) { console.log(3); } }',
    output: 'class MyClass { #render = (a, b) => { console.log(3); }; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'class MyClass { static #render(a, b) { console.log(3); } }',
    output: 'class MyClass { static #render = (a, b) => { console.log(3); }; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'class MyClass { static render(a, b) { console.log(3); } }',
    output: 'class MyClass { static render = (a, b) => { console.log(3); }; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'class MyClass { static async render(a, b) { console.log(3); } }',
    output: 'class MyClass { static render = async (a, b) => { console.log(3); }; }',
    options: [{ classPropertiesAllowed: true }],
  },
  {
    code: 'var MyClass = { render(a, b) { console.log(3); }, b: false }',
    output: 'var MyClass = { render: (a, b) => { console.log(3); }, b: false }',
  },

  // named function declarations
  {
    code: 'function foo() { console.log(3); }',
    output: 'const foo = () => { console.log(3); };',
  },
  {
    code: 'async function foo() { console.log(3); }',
    output: 'const foo = async () => { console.log(3); };',
  },
  {
    code: 'function foo(a) { console.log(3); }',
    output: 'const foo = (a) => { console.log(3); };',
  },
  {
    code: 'async function foo(a) { console.log(3); }',
    output: 'const foo = async (a) => { console.log(3); };',
  },

  // https://github.com/JamieMason/eslint-plugin-prefer-arrow-functions/issues/28
  {
    code: `export function foo() { const bar = '$'; return bar; }`,
    output: `export const foo = () => { const bar = '$'; return bar; };`,
  },

  // Eslint treats export default as a special form of function declaration
  {
    code: 'export default function() { console.log(3); }',
    output: 'export default () => { console.log(3); };',
  },
  {
    code: 'export default async function() { console.log(3); }',
    output: 'export default async () => { console.log(3); };',
  },

  // Sanity check complex logic
  {
    code: 'function foo(a) { console.log(a && (3 + a()) ? true : 99); }',
    output: 'const foo = (a) => { console.log(a && (3 + a()) ? true : 99); };',
  },
  {
    code: 'function foo(a): boolean | number { console.log(a && (3 + a()) ? true : 99); }',
    output: 'const foo = (a): boolean | number => { console.log(a && (3 + a()) ? true : 99); };',
  },
  {
    code: 'async function foo(a) { console.log(a && (3 + a()) ? true : 99); }',
    output: 'const foo = async (a) => { console.log(a && (3 + a()) ? true : 99); };',
  },

  // function expressions
  {
    code: 'var foo = function() { console.log("World"); }',
    output: 'var foo = () => { console.log("World"); }',
  },
  {
    code: 'var foo = function(): void { console.log("World"); }',
    output: 'var foo = (): void => { console.log("World"); }',
  },
  {
    code: 'var foo = async function() { console.log("World"); }',
    output: 'var foo = async () => { console.log("World"); }',
  },
  {
    code: 'var foo = function() { console.log("World"); };',
    output: 'var foo = () => { console.log("World"); };',
  },
  {
    code: 'var foo = async function() { console.log("World"); };',
    output: 'var foo = async () => { console.log("World"); };',
  },
  {
    code: 'var foo = function x() { console.log("World"); };',
    output: 'var foo = () => { console.log("World"); };',
  },
  {
    code: 'var foo = async function x() { console.log("World"); };',
    output: 'var foo = async () => { console.log("World"); };',
  },

  // wrap object literal console.log(in parens
  {
    code: 'var foo = function() { console.log({a: false}); }',
    output: 'var foo = () => { console.log({a: false}); }',
  },
  {
    code: 'var foo = function(): void { console.log({a: false}); }',
    output: 'var foo = (): void => { console.log({a: false}); }',
  },
  {
    code: 'var foo = async function() { console.log({a: false}); }',
    output: 'var foo = async () => { console.log({a: false}); }',
  },
  {
    code: 'function foo(a) { console.log({a: false}); }',
    output: 'const foo = (a) => { console.log({a: false}); };',
  },
  {
    code: 'async function foo(a) { console.log({a: false}); }',
    output: 'const foo = async (a) => { console.log({a: false}); };',
  },

  // don't obliterate whitespace and only remove newlines when appropriate
  {
    code: 'var foo = function() {\n  console.log("World");\n}',
    output: 'var foo = () => {\n  console.log("World");\n}',
  },
  {
    code: 'var foo = function(): void {\n  console.log("World");\n}',
    output: 'var foo = (): void => {\n  console.log("World");\n}',
  },
  {
    code: 'var foo = async function() {\n  console.log("World");\n}',
    output: 'var foo = async () => {\n  console.log("World");\n}',
  },
  {
    code: 'function foo(a) {\n  console.log(3);\n}',
    output: 'const foo = (a) => {\n  console.log(3);\n};',
  },
  {
    code: 'async function foo(a) {\n  console.log(3);\n}',
    output: 'const foo = async (a) => {\n  console.log(3);\n};',
  },

  // don't mess with the semicolon in for statements
  {
    code: 'function withLoop() { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
    output: 'const withLoop = () => { console.log(() => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'function withLoop(): void { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
    output: 'const withLoop = (): void => { console.log(() => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'async function withLoop() { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
    output: 'const withLoop = async () => { console.log(async () => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'var withLoop = function() { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
    output: 'var withLoop = () => { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
  },
  {
    code: 'var withLoop = async function() { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
    output: 'var withLoop = async () => { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
  },
];

export const invalidAndHasBlockStatementWithMultipleMatches = [
  // treat inner functions properly
  {
    code: '["Hello", "World"].forEach(function(a, b) { console.log(a + " " + b); })',
    output: '["Hello", "World"].forEach((a, b) => { console.log(a + " " + b); })',
  },
  {
    code: '["Hello", "World"].forEach(function(a: number, b: number): void { console.log(a + " " + b); })',
    output: '["Hello", "World"].forEach((a: number, b: number): void => { console.log(a + " " + b); })',
  },
  {
    code: 'var foo = function () { console.log(() => false); }',
    output: 'var foo = () => { console.log(() => false); }',
  },
  {
    code: 'var foo = async function () { console.log(async () => false) }',
    output: 'var foo = async () => { console.log(async () => false) }',
  },

  // don't mess up inner generator functions
  {
    code: 'function foo() { console.log(function * gen() { yield 1; }); }',
    output: 'const foo = () => { console.log(function * gen() { yield 1; }); };',
  },
  {
    code: 'function foo() { console.log(function * gen(): number { yield 1; }); }',
    output: 'const foo = () => { console.log(function * gen(): number { yield 1; }); };',
  },
  {
    code: 'async function foo() { console.log(function * gen() { yield 1; }); }',
    output: 'const foo = async () => { console.log(function * gen() { yield 1; }); };',
  },
];
