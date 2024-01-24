import { RuleTester } from 'eslint';

import rule from './prefer-arrow-functions';

import {
  USE_ARROW_WHEN_FUNCTION,
  USE_ARROW_WHEN_SINGLE_RETURN,
  USE_EXPLICIT,
  USE_IMPLICIT,
} from './config';

const alwaysValid = [
  {
    code: 'var foo = (bar) => bar;',
  },
  {
    code: 'var foo = async (bar) => bar;',
  },
  {
    code: 'var foo = bar => bar;',
  },
  {
    code: 'var foo = async bar => bar;',
  },
  {
    code: 'var foo = bar => { return bar; }',
  },
  {
    code: 'var foo = async bar => { return bar; }',
  },
  {
    code: 'var foo = () => 1;',
  },
  {
    code: 'var foo = async () => 1;',
  },
  {
    code: 'var foo = (bar, fuzz) => bar + fuzz',
  },
  {
    code: 'var foo = async (bar, fuzz) => bar + fuzz',
  },
  {
    code: '["Hello", "World"].reduce((p, a) => p + " " + a);',
  },
  {
    code: '["Hello", "World"].reduce(async (p, a) => p + " " + a);',
  },
  {
    code: 'var foo = (...args) => args',
  },
  {
    code: 'var foo = async (...args) => args',
  },
  {
    code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function() {};',
  },
  {
    code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype = {func: function() {}};',
  },
  {
    code: 'var foo = function() { return this.bar; };',
  },
  {
    code: 'function * testGenerator() { return yield 1; }',
  },
  {
    code: 'const foo = { get bar() { return "test"; } }',
  },
  {
    code: 'const foo = { set bar(xyz) {} }',
  },
  {
    code: 'class foo { get bar() { return "test"; } }',
  },
  {
    code: 'class foo { set bar(xyz) { } }',
  },
  // arguments is unavailable in arrow functions
  {
    code: 'function bar () {return arguments}',
  },
  {
    code: 'var foo = function () {return arguments}',
  },
  {
    code: 'function bar () {console.log(arguments);}',
  },
  {
    code: 'var foo = function () {console.log(arguments);}',
  },
  // super() is unavailable in arrow functions
  {
    code: 'class foo extends bar { constructor() {return super()} }',
  },
  {
    code: 'class foo extends bar { constructor() {console.log(super())} }',
  },
  // new.target is unavailable in arrow functions
  {
    code: 'function Foo() {if (!new.target) throw "Foo() must be called with new";}',
  },
  // function overloading is unavailable in arrow functions
  {
    code: 'function foo(): any;',
  },
  {
    code: 'function foo(): any; function foo() {}',
  },
  {
    code: 'function foo(val: string): void; function foo(val: number): void; function foo(val: string | number): void {}',
  },
  {
    code: 'const foo = () => { function bar(val: string): void; function bar(val: number): void; function bar(val: string | number): void {} }',
  },
  {
    code: 'export function foo(): any;',
  },
  {
    code: 'export function foo(): any; export function foo() {}',
  },
  {
    code: 'export function foo(val: string): void; export function foo(val: number): void; export function foo(val: string | number): void {}',
  },
];

const validWhenSingleReturnOnly = [
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

const validWhenDisallowPrototypeEnabled = [
  {
    code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = (): void => {};',
  },
];

const invalidWhenDisallowPrototypeEnabled = [
  {
    code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function(): void {};',
    output:
      'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = (): void => {};',
    errors: [USE_ARROW_WHEN_FUNCTION],
  },
];

const invalidAndHasSingleReturn = [
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
    output:
      'const withLoop = async () => async () => { for (i = 0; i < 5; i++) {}};',
  },
  {
    code: 'var withLoop = function() { return () => { for (i = 0; i < 5; i++) {}}}',
    output: 'var withLoop = () => () => { for (i = 0; i < 5; i++) {}}',
  },
  {
    code: 'var withLoop = async function() { return async () => { for (i = 0; i < 5; i++) {}}}',
    output:
      'var withLoop = async () => async () => { for (i = 0; i < 5; i++) {}}',
  },
];

const invalidAndHasSingleReturnWithMultipleMatches = [
  {
    code: 'var foo = function () { return function(a) { a() } }',
    output: 'var foo = () => function(a) { a() }',
  },
  {
    code: 'var foo = async function () { return async function(a) { a() } }',
    output: 'var foo = async () => async function(a) { a() }',
  },
];

const invalidAndHasBlockStatement = [
  // ES6 classes & functions declared in object literals
  {
    code: 'class MyClass { render(a, b) { console.log(3); } }',
    output: 'class MyClass { render = (a, b) => { console.log(3); }; }',
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
  {
    code: 'function foo(a) { console.log(3); }',
    output: 'const foo = (a) => { console.log(3); };',
  },
  {
    code: 'async function foo(a) { console.log(3); }',
    output: 'const foo = async (a) => { console.log(3); };',
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
    output:
      'const foo = (a): boolean | number => { console.log(a && (3 + a()) ? true : 99); };',
  },
  {
    code: 'async function foo(a) { console.log(a && (3 + a()) ? true : 99); }',
    output:
      'const foo = async (a) => { console.log(a && (3 + a()) ? true : 99); };',
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
    code: 'var foo = function() { console.log({a: false}); }',
    output: 'var foo = () => { console.log({a: false}); }',
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
    code: 'var foo = function() {\n  console.log("World");\n}',
    output: 'var foo = () => {\n  console.log("World");\n}',
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
    output:
      'const withLoop = () => { console.log(() => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'function withLoop(): void { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'const withLoop = (): void => { console.log(() => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'async function withLoop() { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'const withLoop = async () => { console.log(async () => { for (i = 0; i < 5; i++) {}}) };',
  },
  {
    code: 'var withLoop = function() { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'var withLoop = () => { console.log(() => { for (i = 0; i < 5; i++) {}}) }',
  },
  {
    code: 'var withLoop = async function() { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
    output:
      'var withLoop = async () => { console.log(async () => { for (i = 0; i < 5; i++) {}}) }',
  },
];

const invalidAndHasBlockStatementWithMultipleMatches = [
  // treat inner functions properly
  {
    code: '["Hello", "World"].forEach(function(a, b) { console.log(a + " " + b); })',
    output:
      '["Hello", "World"].forEach((a, b) => { console.log(a + " " + b); })',
  },
  {
    code: '["Hello", "World"].forEach(function(a: number, b: number): void { console.log(a + " " + b); })',
    output:
      '["Hello", "World"].forEach((a: number, b: number): void => { console.log(a + " " + b); })',
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
    output:
      'const foo = () => { console.log(function * gen() { yield 1; }); };',
  },
  {
    code: 'function foo() { console.log(function * gen(): number { yield 1; }); }',
    output:
      'const foo = () => { console.log(function * gen(): number { yield 1; }); };',
  },
  {
    code: 'async function foo() { console.log(function * gen() { yield 1; }); }',
    output:
      'const foo = async () => { console.log(function * gen() { yield 1; }); };',
  },
];

const invalidWhenReturnStyleIsImplicit = [
  {
    code: 'var foo = bar => { return bar(); }',
    output: 'var foo = (bar) => bar()',
  },
  {
    code: 'var foo: (fn: () => number) => number = (bar: () => number): number => { return bar() }',
    output:
      'var foo: (fn: () => number) => number = (bar: () => number): number => bar()',
  },
  {
    code: 'var foo = async bar => { return bar(); }',
    output: 'var foo = async (bar) => bar()',
  },
];

const invalidWhenReturnStyleIsExplicit = [
  {
    code: 'var foo = (bar) => bar()',
    output: 'var foo = (bar) => { return bar() }',
  },
  {
    code: 'var foo: (fn: () => number) => number = (bar: () => number): number => bar()',
    output:
      'var foo: (fn: () => number) => number = (bar: () => number): number => { return bar() }',
  },
  {
    code: 'var foo = async (bar) => bar()',
    output: 'var foo = async (bar) => { return bar() }',
  },
];

const validWhenAllowNamedFunctions = [
  { code: '() => { function foo() { return "bar"; } }' },
  { code: '() => { function * fooGen() { return yield "bar"; } }' },
  { code: '() => { async function foo() { return await "bar"; } }' },
  { code: '() => { function foo() { return () => "bar"; } }' },
  { code: 'class FooClass { foo() { return "bar" }}' },
  {
    code: 'export default () => { function foo() { return "bar"; } }',
  },
  {
    // Make sure "allowNamedFunctions" works with typescript
    code: '() => { function foo(a: string): string { return `bar ${a}`;} }',
    parser: require.resolve('@typescript-eslint/parser'),
  },
];

const invalidWhenAllowNamedFunctions = [
  // Invalid tests for "allowNamedFunctions" option
  {
    code: '() => { var foo = function() { return "bar"; }; }',
    output: '() => { var foo = () => "bar"; }',
  },
  {
    code: '() => { var foo = async function() { return await "bar"; }; }',
    output: '() => { var foo = async () => await "bar"; }',
  },
  {
    code: '() => { var foo = function() { return () => "bar"; }; }',
    output: '() => { var foo = () => () => "bar"; }',
  },
  {
    code: '() => { var foo = function() { return "bar"; }; }',
    output: '() => { var foo = () => "bar"; }',
  },
  {
    code: 'module.exports = () => { var foo = function() { return "bar"; }; }',
    output: 'module.exports = () => { var foo = () => "bar"; }',
  },
  {
    code: 'module.exports.foo = () => { var bar = function() { return "baz"; }; }',
    output: 'module.exports.foo = () => { var bar = () => "baz"; }',
  },
  {
    code: '() => { exports.foo = function() { return "bar"; }; }',
    output: '() => { exports.foo = () => "bar"; }',
  },
  {
    code: 'exports = function() { return "bar"; };',
    output: 'exports = () => "bar";',
  },
  {
    code: 'export default () => { var foo = function() { return "bar"; }; }',
    output: 'export default () => { var foo = () => "bar"; }',
  },
  {
    // Using multiple lines to check that it only errors on the inner function
    code: `function top() {
      return function() { return "bar"; };
    }`,
    output: `function top() {
      return () => "bar";
    }`,
  },
  {
    // Make sure "allowNamedFunctions" works with typescript
    code: `function foo(a: string): () => string {
      return function() { return \`bar \${a}\`; };
    }`,
    output: `function foo(a: string): () => string {
      return () => \`bar \${a}\`;
    }`,
    parser: require.resolve('@typescript-eslint/parser'),
  },
];

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaFeatures: { jsx: false },
    ecmaVersion: 8,
    sourceType: 'module',
  },
});

const withOptions = (extraOptions) => (object) => ({
  ...object,
  options: [{ ...(object.options ? object.options[0] : {}), ...extraOptions }],
});

const withErrors = (errors) => (object) => ({
  ...object,
  errors,
});

describe('when function is valid, or cannot be converted to an arrow function', () => {
  describe('it considers the function valid', () => {
    ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
      valid: alwaysValid,
      invalid: [],
    });
  });
});

describe('when singleReturnOnly is true', () => {
  describe('when function should be an arrow function', () => {
    describe('when function does not contain only a return statement', () => {
      describe('it considers the function valid', () => {
        ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
          valid: [
            ...invalidAndHasBlockStatement,
            ...invalidAndHasBlockStatementWithMultipleMatches,
            ...validWhenSingleReturnOnly,
          ].map(withOptions({ singleReturnOnly: true })),
          invalid: [],
        });
      });
    });
    describe('when function contains only a return statement', () => {
      describe('it fixes the function', () => {
        ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
          valid: [],
          invalid: invalidAndHasSingleReturn
            .map(withOptions({ singleReturnOnly: true }))
            .map(withErrors([USE_ARROW_WHEN_SINGLE_RETURN])),
        });
      });
    });
  });
  describe('when two functions are featured: one returns immediately and the other has a block statement', () => {
    describe('it fixes the function which returns and considers the other valid', () => {
      ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
        valid: [],
        invalid: invalidAndHasSingleReturnWithMultipleMatches
          .map(withOptions({ singleReturnOnly: true }))
          .map(withErrors([USE_ARROW_WHEN_SINGLE_RETURN])),
      });
    });
  });
});

describe('when singleReturnOnly is false', () => {
  describe('when function should be an arrow function', () => {
    describe('it fixes the function', () => {
      ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
        valid: [],
        invalid: [
          ...invalidAndHasSingleReturn,
          ...invalidAndHasBlockStatement,
          ...invalidAndHasBlockStatementWithMultipleMatches,
        ]
          .map(withOptions({ singleReturnOnly: false }))
          .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
      });
    });
    describe('when function has a block statement', () => {
      describe('when returnStyle is "explicit"', () => {
        ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
          valid: [],
          invalid: invalidAndHasBlockStatement
            .map(
              withOptions({ returnStyle: 'explicit', singleReturnOnly: false }),
            )
            .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
        });
      });
      describe('when returnStyle is "implicit"', () => {
        ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
          valid: [],
          invalid: invalidAndHasBlockStatement
            .map(
              withOptions({ returnStyle: 'implicit', singleReturnOnly: false }),
            )
            .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
        });
      });
      describe('when returnStyle is "unchanged" or not set', () => {
        ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
          valid: [],
          invalid: invalidAndHasBlockStatement
            .map(
              withOptions({
                returnStyle: 'unchanged',
                singleReturnOnly: false,
              }),
            )
            .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
        });
      });
    });
    describe('when two functions are featured: one returns immediately and the other has a block statement', () => {
      describe('it fixes both functions', () => {
        ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
          valid: [],
          invalid: invalidAndHasSingleReturnWithMultipleMatches
            .map(withOptions({ singleReturnOnly: false }))
            .map(
              withErrors([USE_ARROW_WHEN_FUNCTION, USE_ARROW_WHEN_FUNCTION]),
            ),
        });
      });
    });
  });
});

describe('when disallowPrototype is true', () => {
  describe('when function should be an arrow function', () => {
    describe('when function is assigned to a prototype', () => {
      describe('it fixes the function', () => {
        ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
          valid: validWhenDisallowPrototypeEnabled.map(
            withOptions({ disallowPrototype: true }),
          ),
          invalid: invalidWhenDisallowPrototypeEnabled.map(
            withOptions({ disallowPrototype: true }),
          ),
        });
      });
    });
  });
});

describe('when returnStyle is "implicit"', () => {
  describe('when function is an arrow function with a block statement containing an immediate return', () => {
    describe('it fixes the function to have an implicit return', () => {
      ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
        valid: [],
        invalid: invalidWhenReturnStyleIsImplicit
          .map(withOptions({ returnStyle: 'implicit' }))
          .map(withErrors([USE_IMPLICIT])),
      });
    });
  });
});

describe('when returnStyle is "explicit"', () => {
  describe('when function is an arrow function with an implicit return', () => {
    describe('it fixes the function to have a block statement containing an immediate return', () => {
      ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
        valid: [],
        invalid: invalidWhenReturnStyleIsExplicit
          .map(withOptions({ returnStyle: 'explicit' }))
          .map(withErrors([USE_EXPLICIT])),
      });
    });
  });
});

describe('when allowNamedFunctions is true', () => {
  describe("it doesn't report named functions", () => {
    ruleTester.run('lib/rules/prefer-arrow-functions', rule, {
      valid: validWhenAllowNamedFunctions.map(
        withOptions({ allowNamedFunctions: true }),
      ),
      invalid: invalidWhenAllowNamedFunctions
        .map(withOptions({ allowNamedFunctions: true }))
        .map(withErrors([USE_ARROW_WHEN_FUNCTION])),
    });
  });
});
