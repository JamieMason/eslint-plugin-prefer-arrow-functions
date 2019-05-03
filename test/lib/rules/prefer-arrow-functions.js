/**
 * @fileoverview Tests for prefer-arrow-functions rule.
 * @author Triston Jones
 */

'use strict';

const singleReturnOnly = (code, extraRuleOptions) => ({
  code,
  options: [Object.assign({singleReturnOnly: true}, extraRuleOptions)],
  parserOptions: {sourceType: 'module'}
});

var rule = require('../../../lib/rules/prefer-arrow-functions'),
    RuleTester = require('eslint').RuleTester;

var tester = new RuleTester({parserOptions: {ecmaVersion: 8}});
tester.run('lib/rules/prefer-arrow-functions', rule, {
  parserOptions: {ecmaVersion: 6},
  valid: [
    'var foo = (bar) => bar;',
    'var foo = async (bar) => bar;',
    'var foo = bar => bar;',
    'var foo = async bar => bar;',
    'var foo = bar => { return bar; }',
    'var foo = async bar => { return bar; }',
    'var foo = () => 1;',
    'var foo = async () => 1;',
    'var foo = (bar, fuzz) => bar + fuzz',
    'var foo = async (bar, fuzz) => bar + fuzz',
    '["Hello", "World"].reduce((p, a) => p + " " + a);',
    '["Hello", "World"].reduce(async (p, a) => p + " " + a);',
    'var foo = (...args) => args',
    'var foo = async (...args) => args',
    'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function() {};',
    'class obj {constructor(foo){this.foo = foo;}}; obj.prototype = {func: function() {}};',
    'var foo = function() { return this.bar; };',
    'function * testGenerator() { return yield 1; }',
    'const foo = { get bar() { return "test"; } }',
    'const foo = { set bar(xyz) {} }',
    'class foo { get bar() { return "test"; } }',
    'class foo { set bar(xyz) { } }',
    // arguments is unavailable in arrow functions
    'function bar () {return arguments}',
    'var foo = function () {return arguments}',
    'function bar () {console.log(arguments);}',
    'var foo = function () {console.log(arguments);}',
    // super() is unavailable in arrow functions
    'class foo extends bar { constructor() {return super()} }',
    'class foo extends bar { constructor() {console.log(super())} }',
    // new.target is unavailable in arrow functions
    'function Foo() {if (!new.target) throw "Foo() must be called with new";}',
    ...[
      'var foo = (bar) => {return bar();}',
      'var foo = async (bar) => {return bar();}',
      'function foo(bar) {bar()}',
      'async function foo(bar) {bar()}',
      'var x = function foo(bar) {bar()}',
      'var x = async function foo(bar) {bar()}',
      'var x = function(bar) {bar()}',
      'var x = async function(bar) {bar()}',
      'function foo(bar) {/* yo */ bar()}',
      'async function foo(bar) {/* yo */ bar()}',
      'function foo() {}',
      'async function foo() {}',
      'function foo(bar) {bar(); return bar()}',
      'async function foo(bar) {bar(); return bar()}',
      'class MyClass { foo(bar) {bar(); return bar()} }',
      'class MyClass { async foo(bar) {bar(); return bar()} }',
      'var MyClass = { foo(bar) {bar(); return bar()} }',
      'var MyClass = { async foo(bar) {bar(); return bar()} }',
      'export default function xyz() { return 3; }',
      'export default async function xyz() { return 3; }',
      'class MyClass { render(a, b) { return 3; } }',
      'class MyClass { async render(a, b) { return 3; } }'
    ].map(singleReturnOnly)
  ],
  invalid: [
    {code: 'var foo = function() { return "World"; }', errors: ['Prefer using arrow functions over plain functions']},
    {code: '["Hello", "World"].reduce(function(a, b) { return a + " " + b; })', errors: ['Prefer using arrow functions over plain functions']},
    {code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function() {};', errors: ['Prefer using arrow functions over plain functions'], options: [{disallowPrototype:true}]},
    ...[
      // Make sure it works with ES6 classes & functions declared in object literals
      ['class MyClass { render(a, b) { return 3; } }', 'class MyClass { render = (a, b) => 3; }', {classPropertiesAllowed: true}],
      ['var MyClass = { render(a, b) { return 3; }, b: false }', 'var MyClass = { render: (a, b) => 3, b: false }'],

      // Make sure named function declarations work
      ['function foo() { return 3; }', 'const foo = () => 3;'],
      ['async function foo() { return 3; }', 'const foo = async () => 3;'],
      ['function foo(a) { return 3 }', 'const foo = (a) => 3;'],
      ['async function foo(a) { return 3 }', 'const foo = async (a) => 3;'],
      ['function foo(a) { return 3; }', 'const foo = (a) => 3;'],
      ['async function foo(a) { return 3; }', 'const foo = async (a) => 3;'],

      // Eslint treats export default as a special form of function declaration
      ['export default function() { return 3; }', 'export default () => 3;'],
      ['export default async function() { return 3; }', 'export default async () => 3;'],

      // Sanity check - make sure complex logic works
      ['function foo(a) { return a && (3 + a()) ? true : 99; }', 'const foo = (a) => a && (3 + a()) ? true : 99;'],
      ['async function foo(a) { return a && (3 + a()) ? true : 99; }', 'const foo = async (a) => a && (3 + a()) ? true : 99;'],

      // Make sure function expressions work
      ['var foo = function() { return "World"; }', 'var foo = () => "World"'],
      ['var foo = async function() { return "World"; }', 'var foo = async () => "World"'],
      ['var foo = function() { return "World"; };', 'var foo = () => "World";'],
      ['var foo = async function() { return "World"; };', 'var foo = async () => "World";'],
      ['var foo = function x() { return "World"; };', 'var foo = () => "World";'],
      ['var foo = async function x() { return "World"; };', 'var foo = async () => "World";'],

      // Make sure we wrap object literal returns in parens
      ['var foo = function() { return {a: false} }', 'var foo = () => ({a: false})'],
      ['var foo = async function() { return {a: false} }', 'var foo = async () => ({a: false})'],
      ['var foo = function() { return {a: false}; }', 'var foo = () => ({a: false})'],
      ['var foo = async function() { return {a: false}; }', 'var foo = async () => ({a: false})'],
      ['function foo(a) { return {a: false}; }', 'const foo = (a) => ({a: false});'],
      ['async function foo(a) { return {a: false}; }', 'const foo = async (a) => ({a: false});'],
      ['function foo(a) { return {a: false} }', 'const foo = (a) => ({a: false});'],
      ['async function foo(a) { return {a: false} }', 'const foo = async (a) => ({a: false});'],

      // Make sure we treat inner functions properly
      ['var foo = function () { return function(a) { a() } }', 'var foo = () => function(a) { a() }'],
      ['var foo = async function () { return async function(a) { a() } }', 'var foo = async () => async function(a) { a() }'],
      ['var foo = function () { return () => false }', 'var foo = () => () => false'],
      ['var foo = async function () { return async () => false }', 'var foo = async () => async () => false'],

      // Make sure we don't obliterate whitespace and only remove newlines when appropriate
      ['var foo = function() {\n  return "World";\n}', 'var foo = () => "World"'],
      ['var foo = async function() {\n  return "World";\n}', 'var foo = async () => "World"'],
      ['var foo = function() {\n  return "World"\n}', 'var foo = () => "World"'],
      ['var foo = async function() {\n  return "World"\n}', 'var foo = async () => "World"'],
      ['function foo(a) {\n  return 3;\n}', 'const foo = (a) => 3;'],
      ['async function foo(a) {\n  return 3;\n}', 'const foo = async (a) => 3;'],
      ['function foo(a) {\n  return 3\n}', 'const foo = (a) => 3;'],
      ['async function foo(a) {\n  return 3\n}', 'const foo = async (a) => 3;'],

      // Make sure we don't mess up inner generator functions
      [
        'function foo() { return function * gen() { return yield 1; }; }',
        'const foo = () => function * gen() { return yield 1; };'
      ],
      [
        'async function foo() { return function * gen() { return yield 1; }; }',
        'const foo = async () => function * gen() { return yield 1; };'
      ],

      // Make sure we don't mess with the semicolon in for statements
      [
        'function withLoop() { return () => { for (i = 0; i < 5; i++) {}}}',
        'const withLoop = () => () => { for (i = 0; i < 5; i++) {}};'
      ],
      [
        'async function withLoop() { return async () => { for (i = 0; i < 5; i++) {}}}',
        'const withLoop = async () => async () => { for (i = 0; i < 5; i++) {}};'
      ],
      [
        'var withLoop = function() { return () => { for (i = 0; i < 5; i++) {}}}',
        'var withLoop = () => () => { for (i = 0; i < 5; i++) {}}'
      ],
      [
        'var withLoop = async function() { return async () => { for (i = 0; i < 5; i++) {}}}',
        'var withLoop = async () => async () => { for (i = 0; i < 5; i++) {}}'
      ],
    ].map(inputOutput => Object.assign(
      {
        errors: ['Prefer using arrow functions when the function contains only a return'],
        output: inputOutput[1]
      },
      singleReturnOnly(inputOutput[0], inputOutput[2])
    ))
  ]
});
