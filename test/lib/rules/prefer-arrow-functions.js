/**
 * @fileoverview Tests for prefer-arrow-functions rule.
 * @author Triston Jones
 */

'use strict';

const singleReturnOnly = code => ({code, options: [{singleReturnOnly: true}]});

var rule = require('../../../lib/rules/prefer-arrow-functions'),
    RuleTester = require('eslint').RuleTester;

var tester = new RuleTester({parserOptions: {ecmaVersion: 6}});
tester.run('lib/rules/prefer-arrow-functions', rule, {
  parserOptions: {ecmaVersion: 6},
  valid: [
    'var foo = (bar) => bar;',
    'var foo = bar => bar;',
    'var foo = bar => { return bar; }',
    'var foo = () => 1;',
    'var foo = (bar, fuzz) => bar + fuzz',
    '["Hello", "World"].reduce((p, a) => p + " " + a);',
    'var foo = (...args) => args',
    'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function() {};',
    'class obj {constructor(foo){this.foo = foo;}}; obj.prototype = {func: function() {}};',
    ...[
        'var foo = (bar) => {return bar();}',
        'function foo(bar) {bar()}',
        'var x = function foo(bar) {bar()}',
        'var x = function(bar) {bar()}',
        'function foo(bar) {/* yo */ bar()}',
        'function foo() {}',
        'function foo(bar) {bar(); return bar()}',
    ].map(singleReturnOnly)
  ],
  invalid: [
    {code: 'function foo() { return "Hello!"; }', errors: ['Use const or class constructors instead of named functions']},
    {code: 'function foo() { return arguments; }', errors: ['Use const or class constructors instead of named functions']},
    {code: 'var foo = function() { return "World"; }', errors: ['Prefer using arrow functions over plain functions']},
    {code: '["Hello", "World"].reduce(function(a, b) { return a + " " + b; })', errors: ['Prefer using arrow functions over plain functions']},
    {code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function() {};', errors: ['Prefer using arrow functions over plain functions'], options: [{disallowPrototype:true}]},
    ...[
        ['function foo() { return 3; }', 'const foo = () => 3;'],
        ['function foo(a) { return 3 }', 'const foo = (a) => 3;'],
        ['function foo(a) { return 3; }', 'const foo = (a) => 3;'],
        ['var foo = function() { return "World"; }', 'var foo = () => "World"'],
        ['var foo = function() { return "World"; };', 'var foo = () => "World";'],
        ['var foo = function x() { return "World"; };', 'var foo = /*x*/() => "World";'],
        ['var foo = function () { return function(a) { a() } }', 'var foo = () => function(a) { a() }'],
        ['var foo = function () { return () => false }', 'var foo = () => () => false'],
        [
          '/*1*/var/*2*/ /*3*/foo/*4*/ /*5*/=/*6*/ /*7*/function/*8*/ /*9*/x/*10*/(/*11*/a/*12*/, /*13*/b/*14*/)/*15*/ /*16*/{/*17*/ /*18*/return/*19*/ /*20*/false/*21*/;/*22*/ /*23*/}/*24*/;/*25*/',
          '/*1*/var/*2*/ /*3*/foo/*4*/ /*5*/=/*6*/ /*7*//*8*/ /*9*//*x*//*10*/(/*11*/a/*12*/, /*13*/b/*14*/)/*15*/ /*16*/=>/*17*/ /*18*//*19*/ /*20*/false/*21*//*22*/ /*23*//*24*/;/*25*/',
        ],
        //TODO: nested function
        [
          '/*1*/function/*2*/ /*3*/foo/*4*/(/*5*/a/*6*/)/*7*/ /*8*/\{/*9*/ /*10*/return/*11*/ /*12*/false/*13*/;/*14*/ /*15*/}/*16*/',
          '/*1*/const/*2*/ /*3*/foo/*4*/ = (/*5*/a/*6*/)/*7*/ /*8*/=>/*9*/ /*10*//*11*/ /*12*/false/*13*//*14*/ /*15*/;/*16*/'
        ],
        ['function foo(a) { return a && (3 + a()) ? true : 99; }', 'const foo = (a) => a && (3 + a()) ? true : 99;'],
    ].map(io => Object.assign(
      {
        errors: ['Prefer using arrow functions over plain functions which only return a value'],
        output: io[1]
      },
      singleReturnOnly(io[0])
    ))
  ]
});
