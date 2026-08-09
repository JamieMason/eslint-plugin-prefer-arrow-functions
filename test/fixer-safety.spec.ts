import * as vitest from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferArrowFunctions as rule } from '../src/rule';
import { MessageId } from '../src/config';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const { describe } = vitest;
const ruleTester = new RuleTester();

const errors = (...messageIds: MessageId[]) => messageIds.map((messageId) => ({ messageId }));

const asTsx = {
  filename: '/some/path/Component.tsx' as const,
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
};

describe('functions in callee or unary operand positions are parenthesized when fixed', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      // IIFE without wrapping parens: fixed arrow callee must gain parens
      {
        code: 'var x = function() { return 1; }();',
        output: 'var x = (() => 1)();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: '!function() { console.log(1); }();',
        output: '!(() => { console.log(1); })();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'void function() { console.log(1); }();',
        output: 'void (() => { console.log(1); })();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // unary operand without a call
      {
        code: 'var t = typeof function() { return 1; };',
        output: 'var t = typeof (() => 1);',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'const main = async () => { await function() { return p; }(); };',
        output: 'const main = async () => { await (() => p)(); };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // already-parenthesized IIFE keeps working and gains no extra parens
      {
        code: 'var x = (function() { return 1; })();',
        output: 'var x = (() => 1)();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('functions in member access or template tag positions are parenthesized when fixed', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      {
        code: 'var y = function() { return 1; }.call(null);',
        output: 'var y = (() => 1).call(null);',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'var n = function() { return 1; }.name;',
        output: 'var n = (() => 1).name;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'var t = function() { return 1; }`tag`;',
        output: 'var t = (() => 1)`tag`;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('TSX generic type parameters keep their constraints and defaults', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      {
        code: 'function Component<T extends object>(t: T) { return <div>{t}</div> }',
        output: 'const Component = <T extends object,>(t: T) => <div>{t}</div>;',
        ...asTsx,
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function Component<T = string>(t: T) { return <div>{t}</div> }',
        output: 'const Component = <T = string,>(t: T) => <div>{t}</div>;',
        ...asTsx,
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // a bare single param still gains the disambiguating comma, exactly once
      {
        code: 'function Component<T>(t: T) { return <div>{t}</div> }',
        output: 'const Component = <T,>(t: T) => <div>{t}</div>;',
        ...asTsx,
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function Component<T,>(t: T) { return <div>{t}</div> }',
        output: 'const Component = <T,>(t: T) => <div>{t}</div>;',
        ...asTsx,
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('sequence expressions in implicit returns are parenthesized', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      // without parens the second operand becomes a new variable declarator
      {
        code: 'var f = function() { return a, b; };',
        output: 'var f = () => (a, b);',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'var f = () => { return doThing(), undefined; };',
        output: 'var f = () => (doThing(), undefined);',
        options: [{ returnStyle: 'implicit' }],
        errors: errors('USE_IMPLICIT'),
      },
    ],
  });
});

describe('block-level function declarations used outside their block are never converted', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // sloppy-mode scripts leak a binding outside the block (Annex B) which const would not
      {
        code: 'if (x) { function foo() { return 1; } }\nfoo();',
        languageOptions: { sourceType: 'script' },
      },
    ],
    invalid: [
      // used only within its own block: safe to convert
      {
        code: 'if (x) { function foo() { return 1; } foo(); }',
        output: 'if (x) { const foo = () => 1; foo(); }',
        languageOptions: { sourceType: 'script' },
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('named function expressions which reference their own name are never converted', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // the inner name binding would be deleted by conversion
      { code: 'var foo = function bar(n) { return n <= 1 ? 1 : n * bar(n - 1); };' },
      { code: 'setTimeout(function poll() { if (!ready()) setTimeout(poll, 100); });' },
    ],
    invalid: [
      // a named function expression whose name is unused still converts
      {
        code: 'var foo = function bar() { return 1; };',
        output: 'var foo = () => 1;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // an outer name shadowed by params is not a self-reference
      {
        code: 'var foo = function bar(bar) { return bar(); };',
        output: 'var foo = (bar) => bar();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('function declarations which rely on hoisting are never converted', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // a const arrow would not be initialized yet when eagerly called above its declaration
      { code: 'foo(); function foo() { console.log(1); }' },
      { code: 'var x = foo(); function foo() { return 1; }' },
      { code: 'class C { static x = foo(); } function foo() { return 1; }' },
    ],
    invalid: [
      // recursion resolves after initialization: still safe to convert
      {
        code: 'function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }',
        output: 'const fact = (n) => n <= 1 ? 1 : n * fact(n - 1);',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // references after the declaration are safe
      {
        code: 'function foo() { console.log(1); }\nfoo();',
        output: 'const foo = () => { console.log(1); };\nfoo();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // forward references from inside other function bodies are deferred: safe to convert
      {
        code: 'function bar() { return foo(); }\nfunction foo() { return 1; }',
        output: 'const bar = () => foo();\nconst foo = () => 1;',
        errors: errors('USE_ARROW_WHEN_FUNCTION', 'USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('returnStyle restyling of arrow functions is allowed to keep this and arguments', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      // restyling an arrow cannot change what this refers to
      {
        code: 'class A { m() { var f = () => { return this.x; }; } }',
        output: 'class A { m() { var f = () => this.x; } }',
        options: [{ returnStyle: 'implicit' }],
        errors: errors('USE_IMPLICIT'),
      },
      {
        code: 'var f = () => this.x;',
        output: 'var f = () => { return this.x };',
        options: [{ returnStyle: 'explicit' }],
        errors: errors('USE_EXPLICIT'),
      },
      // the enclosing function stays protected but the arrow inside it restyles
      {
        code: 'function outer() { var f = () => { return arguments[0]; }; return f; }',
        output: 'function outer() { var f = () => arguments[0]; return f; }',
        options: [{ returnStyle: 'implicit' }],
        errors: errors('USE_IMPLICIT'),
      },
      // restyling a parenthesized arrow does not double the parens
      {
        code: 'var x = (() => { return 1; })();',
        output: 'var x = (() => 1)();',
        options: [{ returnStyle: 'implicit' }],
        errors: errors('USE_IMPLICIT'),
      },
    ],
  });
});

describe('this, arguments, super and new.target belong to the nearest non-arrow function', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // a nested arrow shares the candidate function's this/arguments/new.target: conversion would rebind them
      { code: 'obj.method = function() { return () => this.x; };' },
      { code: 'obj.method = function() { return () => arguments[0]; };' },
      { code: 'function Foo() { setTimeout(() => { if (new.target) {} }); }' },
      // a computed member key inside a nested class evaluates with the candidate's this
      { code: 'var f = function() { class C { [this.k]() {} } };' },
    ],
    invalid: [
      // a nested plain function owns its this/arguments/super/new.target: the outer function is safe
      {
        code: 'function outer() { return function inner() { return arguments[0]; }; }',
        output: 'const outer = () => function inner() { return arguments[0]; };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function outer() { return function inner() { return new.target; }; }',
        output: 'const outer = () => function inner() { return new.target; };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function outer() { return { m() { return super.toString(); } }; }',
        output: 'const outer = () => ({ m() { return super.toString(); } });',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // this in a nested class field initializer is the instance, not the candidate's this
      {
        code: 'function outer() { class C { x = this; } return C; }',
        output: 'const outer = () => { class C { x = this; } return C; };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // arguments as a property name is not the arguments object
      {
        code: 'var f = function() { return win.arguments; };',
        output: 'var f = () => win.arguments;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('issue #24 / PR #68 - Flow comment types are preserved by the fix', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      // param and return types in comments are copied verbatim
      {
        code: 'var loadData = function(filePath /*: string */) /*: Object */ { return readJson(filePath); };',
        output: 'var loadData = (filePath /*: string */) /*: Object */ => readJson(filePath);',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function getAge() /*: number */ { return 42; }',
        output: 'const getAge = () /*: number */ => 42;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // flow generic annotations between the function keyword and the params
      {
        code: 'var identity = function /*:: <T> */(t) { return t; };',
        output: 'var identity = /*:: <T> */(t) => t;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // a newline is not allowed between arrow params and =>, so a multiline
      // comment there cannot be preserved: report without fixing
      {
        code: 'var f = function(a) /*:\n  SomeLongType\n*/ { return a; };',
        output: null,
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // same restriction applies to multiline TS return type annotations
      {
        code: 'function foo(a): {\n  x: number\n} { return { x: a }; }',
        output: null,
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('fixes which would delete comments are not applied', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      // comments around a single return: keep the block body rather than collapse
      {
        code: 'function foo() { /* license */ return 1; }',
        output: 'const foo = () => { /* license */ return 1; };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function foo() { /* c */ return 1; }',
        output: 'const foo = () => { /* c */ return 1; };',
        options: [{ singleReturnOnly: true }],
        errors: errors('USE_ARROW_WHEN_SINGLE_RETURN'),
      },
      // an arrow which cannot collapse without losing comments is reported but not fixed
      {
        code: 'var f = () => { /* c */ return 1; };',
        output: null,
        options: [{ returnStyle: 'implicit' }],
        errors: errors('USE_IMPLICIT'),
      },
      {
        code: 'var foo = function() /* keep */ { return 1; };',
        output: 'var foo = () /* keep */ => 1;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function foo() { return 1; /* after */ }',
        output: 'const foo = () => { return 1; /* after */ };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'var foo = function(a /* param */, b) { return a; };',
        output: 'var foo = (a /* param */, b) => a;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // comments in regions the fix copies verbatim are kept, so these still fix
      {
        code: 'function foo() { /* kept */ console.log(1); }',
        output: 'const foo = () => { /* kept */ console.log(1); };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'function foo() { return { /* kept */ a: 1 }; }',
        output: 'const foo = () => ({ /* kept */ a: 1 });',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('overloaded class methods are never converted to properties', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // a class property cannot implement the remaining overload signatures
      {
        code: 'class C { foo(a: string): void; foo(a: number): void; foo(a: unknown): void {} }',
        options: [{ classPropertiesAllowed: true }],
      },
    ],
    invalid: [
      // methods without overload signatures in the same class still convert
      {
        code: 'class C { foo(a: string): void; foo(a: unknown): void {} bar() { return 1; } }',
        output: 'class C { foo(a: string): void; foo(a: unknown): void {} bar = () => 1; }',
        options: [{ classPropertiesAllowed: true }],
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('decorated class methods are never converted to properties', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // rewriting as a class property would delete the decorator or change its kind
      {
        code: 'class C { @dec render() { return 1; } }',
        options: [{ classPropertiesAllowed: true }],
      },
      {
        code: 'class C { @dec(config) render() { return 1; } }',
        options: [{ classPropertiesAllowed: true }],
      },
    ],
    invalid: [
      // undecorated methods in the same class still convert
      {
        code: 'class C { @dec render() { return 1; } other() { return 2; } }',
        output: 'class C { @dec render() { return 1; } other = () => 2; }',
        options: [{ classPropertiesAllowed: true }],
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('arrow functions containing a bare `return;` are not reported under returnStyle implicit', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // there is no value to become an implicit return
      { code: 'var f = () => { return; };', options: [{ returnStyle: 'implicit' }] },
    ],
    invalid: [],
  });
});

describe('functions used as constructors are never converted', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // arrow functions cannot be called with new
      { code: 'var x = new function() { console.log(1); }();' },
      { code: 'var x = new function() { console.log(1); };' },
      // arrow functions cannot be a superclass
      { code: 'class X extends function() {} {}' },
      { code: 'var X = class extends function() {} {}' },
      // declarations constructed by name elsewhere in the file
      { code: 'function Foo() {}\nvar i = new Foo();' },
    ],
    invalid: [
      // calling (not constructing) the name is safe
      {
        code: 'function foo() {}\nvar x = foo();',
        output: 'const foo = () => {};\nvar x = foo();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // only the constructed declaration is protected, not its callers
      {
        code: 'function Foo() {}\nfunction make() { return new Foo(); }',
        output: 'function Foo() {}\nconst make = () => new Foo();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('function declarations whose name is written to are never converted', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // assigning to a const throws
      { code: 'function foo() { return 1; }\nfoo = null;' },
      // redeclaring a const is a SyntaxError
      { code: 'function foo() { return 1; }\nfunction foo() { return 2; }' },
    ],
    invalid: [
      // reads are safe
      {
        code: 'function foo() { return 1; }\nvar x = foo;',
        output: 'const foo = () => 1;\nvar x = foo;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // only the reassigned declaration is protected, not the function doing the writing
      {
        code: 'function foo() { return 1; }\nfunction reset() { foo = null; }',
        output: 'function foo() { return 1; }\nconst reset = () => { foo = null; };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('functions asserted with as, satisfies or ! are parenthesized when fixed', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [],
    invalid: [
      // `() => {} as T` parses the assertion as part of the arrow body, so the arrow needs parens
      {
        code: 'const x = function () { console.log(1); } as any;',
        output: 'const x = (() => { console.log(1); }) as any;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // an implicit return would otherwise re-associate the assertion onto the returned value
      {
        code: 'const x = function () { return 1; } as unknown as string;',
        output: 'const x = (() => 1) as unknown as string;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'const x = function () { return 1; } satisfies () => number;',
        output: 'const x = (() => 1) satisfies () => number;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'const x = function () { return 1; }!;',
        output: 'const x = (() => 1)!;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // parens already in the source are not doubled
      {
        code: 'const x = (function () { return 1; }) as any;',
        output: 'const x = (() => 1) as any;',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('shorthand methods named __proto__ are never converted', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // `__proto__: value` sets the prototype (Annex B.3.1) where the method form defines a property
      { code: 'const o = { __proto__() { return 1; } };' },
      { code: `const o = { '__proto__'() { return 1; } };` },
      { code: 'const o = { async __proto__() { return 1; } };' },
    ],
    invalid: [
      // a computed key is exempt from the proto setter form, before and after the fix
      {
        code: `const o = { ['__proto__']() { return 1; } };`,
        output: `const o = { ['__proto__']: () => 1 };`,
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // an existing `__proto__: value` already sets the prototype, so the fix changes nothing
      {
        code: 'const o = { __proto__: function () { return 1; } };',
        output: 'const o = { __proto__: () => 1 };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // other shorthand methods in the same object still convert
      {
        code: 'const o = { __proto__() { return 1; }, other() { return 2; } };',
        output: 'const o = { __proto__() { return 1; }, other: () => 2 };',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('functions whose binding is constructed, extended or has its prototype read are never converted', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // arrow functions have no [[Construct]]
      { code: 'var Foo = function () {};\nnew Foo();' },
      { code: 'let Foo;\nFoo = function () {};\nnew Foo();' },
      { code: 'const m = {};\nm.Foo = function () {};\nnew m.Foo();' },
      { code: 'var Foo = function () {};\nclass Bar extends Foo {}' },
      // arrow functions have no "prototype" property
      { code: 'function Foo() {}\nFoo.prototype.bar = 1;' },
      { code: 'var Foo = function () {};\nFoo.prototype.bar = 1;' },
      { code: 'const m = {};\nm.Foo = function () {};\nm.Foo.prototype.bar = 1;' },
      { code: 'function Foo() {}\nconsole.log(Foo.prototype);' },
      // instanceof reads the constructor's prototype
      { code: 'function Foo() {}\nconst is = x instanceof Foo;' },
      { code: 'var Foo = function () {};\nconst is = x instanceof Foo;' },
    ],
    invalid: [
      // a binding which is only called is safe
      {
        code: 'var foo = function () { return 1; };\nfoo();',
        output: 'var foo = () => 1;\nfoo();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // unrelated constructor usage elsewhere in the file does not block the fix
      {
        code: 'var foo = function () { return 1; };\nnew Bar();',
        output: 'var foo = () => 1;\nnew Bar();',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      // assigning onto an existing prototype is about the target, not the function being assigned
      {
        code: 'const m = {};\nm.prototype.foo = function () { return 1; };',
        output: 'const m = {};\nm.prototype.foo = () => 1;',
        options: [{ disallowPrototype: true }],
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});

describe('function declarations outside a statement list are never converted', () => {
  const asScript = { languageOptions: { parserOptions: { sourceType: 'script' as const } } };
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      // sloppy code allows a declaration in these clauses (Annex B.3.3, B.3.4), a const is a SyntaxError
      { code: 'if (x) function f() {}', ...asScript },
      { code: 'if (x) {} else function f() {}', ...asScript },
      { code: 'lbl: function f() {}', ...asScript },
    ],
    invalid: [
      // a declaration inside a block, switch case or namespace has a statement list to live in
      {
        code: 'if (x) { function f() { return 1; } }',
        output: 'if (x) { const f = () => 1; }',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'switch (x) { case 1: function f() { return 1; } }',
        output: 'switch (x) { case 1: const f = () => 1; }',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
      {
        code: 'namespace N { function f() { return 1; } }',
        output: 'namespace N { const f = () => 1; }',
        errors: errors('USE_ARROW_WHEN_FUNCTION'),
      },
    ],
  });
});
