import * as vitest from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { preferArrowFunctions as rule } from '../src/rule';
import * as scenarios from './scenarios';
import { ActualOptions, MessageId, Options } from '../src/config';

type Runner = typeof ruleTester.run<MessageId, Options>;
type ValidTestCase = Exclude<Parameters<Runner>[2]['valid'][0], string>;
type InvalidTestCase = Exclude<Parameters<Runner>[2]['invalid'][0], string>;
type TestCase = ValidTestCase | InvalidTestCase;

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const { describe } = vitest;
const ruleTester = new RuleTester();

const withOptions = (extraOptions: Partial<ActualOptions>) => (object) => ({
  ...object,
  options: [
    {
      ...(object.options ? object.options[0] : {}),
      ...(extraOptions as ActualOptions),
    },
  ],
});

const withErrors = (errors: MessageId[]) => (object) => ({
  ...object,
  errors: errors.map((messageId) => ({ messageId })),
});

const withTsx =
  () =>
  <T extends TestCase>(object: T): T => ({
    ...object,
    filename: '/some/path/Component.tsx',
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  });

describe('when function is already an arrow function, or cannot be converted to an arrow function', () => {
  describe('it considers the function valid', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [
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
          code: 'class obj {constructor(private readonly foo: number){}};',
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
        // assertion functions are unavailable in arrow functions
        {
          code: 'function foo(val: any): asserts val is string {}',
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
        // export { x }; has node.declaration === null - regression test for this case
        {
          code: 'export { foo }; export function bar(val: number): void; export function bar(val: string | number): void {}',
        },
      ],
      invalid: [],
    });
  });
});

describe('when classPropertiesAllowed is true', () => {
  describe('when property cannot be converted to an arrow function', () => {
    describe('it considers the function valid', () => {
      ruleTester.run('prefer-arrow-functions', rule, {
        valid: [
          {
            code: 'class obj {constructor(private readonly foo: number){}};',
          },
        ].map(withOptions({ classPropertiesAllowed: true })),
        invalid: [],
      });
    });
  });
});

describe('issue #35', () => {
  ruleTester.run('prefer-arrow-functions', rule, {
    valid: [
      {
        code: 'export default async function fetchFoo() { return await fetch("/foo"); }',
      },
    ],
    invalid: [],
  });
});

describe('allowObjectProperties', () => {
  describe('when property can be converted to an arrow function', () => {
    describe('leaves the method as is when allowObjectProperties is true', () => {
      ruleTester.run('prefer-arrow-functions', rule, {
        valid: [
          {
            code: 'const foo = { render(a, b) { console.log(3); } }',
          },
          {
            code: 'export default { data(){ return 4 } }',
          },
        ].map(withOptions({ allowObjectProperties: true })),
        invalid: [
          {
            code: 'const foo = { render(a, b) { return a + b; } }',
            output: 'const foo = { render: (a, b) => a + b }',
          },
          {
            code: 'export default { data(){ return 4 } }',
            output: 'export default { data: () => 4 }',
          },
        ]
          .map(withOptions({ allowObjectProperties: false }))
          .map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
      });
    });
  });
});

describe('when singleReturnOnly is true', () => {
  describe('when function should be an arrow function', () => {
    describe('when function does not contain only a return statement', () => {
      describe('it considers the function valid', () => {
        ruleTester.run('prefer-arrow-functions', rule, {
          valid: [
            ...scenarios.invalidAndHasBlockStatement,
            ...scenarios.invalidAndHasBlockStatementWithMultipleMatches,
            ...scenarios.validWhenSingleReturnOnly,
          ].map(withOptions({ singleReturnOnly: true })),
          invalid: [],
        });
      });
    });
    describe('when function contains only a return statement', () => {
      describe('it fixes the function', () => {
        ruleTester.run('prefer-arrow-functions', rule, {
          valid: [],
          invalid: scenarios.invalidAndHasSingleReturn
            .map(withOptions({ singleReturnOnly: true }))
            .map(withErrors(['USE_ARROW_WHEN_SINGLE_RETURN'])),
        });
      });
    });
  });
  describe('when two functions are featured: one returns immediately and the other has a block statement', () => {
    describe('it fixes the function which returns and considers the other valid', () => {
      ruleTester.run('prefer-arrow-functions', rule, {
        valid: [],
        invalid: scenarios.invalidAndHasSingleReturnWithMultipleMatches
          .map(withOptions({ singleReturnOnly: true }))
          .map(withErrors(['USE_ARROW_WHEN_SINGLE_RETURN'])),
      });
    });
  });
});

describe('when singleReturnOnly is false', () => {
  describe('when function should be an arrow function', () => {
    describe('it fixes the function', () => {
      ruleTester.run('prefer-arrow-functions', rule, {
        valid: [],
        invalid: [
          ...scenarios.invalidAndHasSingleReturn,
          ...scenarios.invalidAndHasBlockStatement,
          ...scenarios.invalidAndHasBlockStatementWithMultipleMatches,
        ]
          .map(withOptions({ singleReturnOnly: false }))
          .map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
      });
    });
    describe('when function has a block statement', () => {
      describe('when returnStyle is "explicit"', () => {
        ruleTester.run('prefer-arrow-functions', rule, {
          valid: [],
          invalid: scenarios.invalidAndHasBlockStatement
            .map(withOptions({ returnStyle: 'explicit', singleReturnOnly: false }))
            .map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
        });
      });
      describe('when returnStyle is "implicit"', () => {
        ruleTester.run('prefer-arrow-functions', rule, {
          valid: [],
          invalid: scenarios.invalidAndHasBlockStatement
            .map(withOptions({ returnStyle: 'implicit', singleReturnOnly: false }))
            .map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
        });
      });
      describe('when returnStyle is "unchanged" or not set', () => {
        ruleTester.run('prefer-arrow-functions', rule, {
          valid: [],
          invalid: scenarios.invalidAndHasBlockStatement
            .map(
              withOptions({
                returnStyle: 'unchanged',
                singleReturnOnly: false,
              }),
            )
            .map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
        });
      });
    });
    // I think this is actually correct but the test runner is now only
    // returning the source for the outer function, before it has processed the
    // inner one
    describe.skip('when two functions are featured: one returns immediately and the other has a block statement', () => {
      describe('it fixes both functions', () => {
        ruleTester.run('prefer-arrow-functions', rule, {
          valid: [],
          invalid: scenarios.invalidAndHasSingleReturnWithMultipleMatches
            .map(withOptions({ singleReturnOnly: false }))
            .map(withErrors(['USE_ARROW_WHEN_FUNCTION', 'USE_ARROW_WHEN_FUNCTION'])),
        });
      });
    });
  });
});

describe('when disallowPrototype is true', () => {
  describe('when function should be an arrow function', () => {
    describe('when function is assigned to a prototype', () => {
      describe('it fixes the function', () => {
        ruleTester.run('prefer-arrow-functions', rule, {
          valid: [
            {
              code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = (): void => {};',
            },
          ].map(withOptions({ disallowPrototype: true })),
          invalid: [
            {
              code: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = function(): void {};',
              output: 'class obj {constructor(foo){this.foo = foo;}}; obj.prototype.func = (): void => {};',
              errors: [{ messageId: 'USE_ARROW_WHEN_FUNCTION' }],
            },
          ].map(withOptions({ disallowPrototype: true })),
        });
      });
    });
  });
});

describe('when returnStyle is "implicit"', () => {
  describe('when function is an arrow function with a block statement containing an immediate return', () => {
    describe('it fixes the function to have an implicit return', () => {
      ruleTester.run('prefer-arrow-functions', rule, {
        valid: [],
        invalid: [
          {
            code: 'var foo = bar => { return bar(); }',
            output: 'var foo = (bar) => bar()',
          },
          {
            code: 'var foo: (fn: () => number) => number = (bar: () => number): number => { return bar() }',
            output: 'var foo: (fn: () => number) => number = (bar: () => number): number => bar()',
          },
          {
            code: 'var foo = async bar => { return bar(); }',
            output: 'var foo = async (bar) => bar()',
          },
        ]
          .map(withOptions({ returnStyle: 'implicit' }))
          .map(withErrors(['USE_IMPLICIT'])),
      });
    });
  });
});

describe('when returnStyle is "explicit"', () => {
  describe('when function is an arrow function with an implicit return', () => {
    describe('it fixes the function to have a block statement containing an immediate return', () => {
      ruleTester.run('prefer-arrow-functions', rule, {
        valid: [],
        invalid: [
          {
            code: 'var foo = (bar) => bar()',
            output: 'var foo = (bar) => { return bar() }',
          },
          {
            code: 'var foo: (fn: () => number) => number = (bar: () => number): number => bar()',
            output: 'var foo: (fn: () => number) => number = (bar: () => number): number => { return bar() }',
          },
          {
            code: 'var foo = async (bar) => bar()',
            output: 'var foo = async (bar) => { return bar() }',
          },
        ]
          .map(withOptions({ returnStyle: 'explicit' }))
          .map(withErrors(['USE_EXPLICIT'])),
      });
    });
  });
});

describe('when allowNamedFunctions is true', () => {
  describe("it doesn't report named functions", () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [
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
        },
      ].map(withOptions({ allowNamedFunctions: true })),
      invalid: [
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
        },
      ]
        .map(withOptions({ allowNamedFunctions: true }))
        .map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
    });
  });
});

describe('when file is TSX', () => {
  describe('it properly fixes generic type arguments', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [
        {
          code: 'const Component = <T,>() => <div>test</div>;',
        },
        {
          code: 'const Component = <T,U>() => <div>test</div>;',
        },
      ].map(withTsx()),
      invalid: [
        {
          code: 'function Component<T>() { return <div>test</div> }',
          output: 'const Component = <T,>() => <div>test</div>;',
        },
        {
          code: 'function Component<T,>() { return <div>test</div> }',
          output: 'const Component = <T,>() => <div>test</div>;',
        },
        {
          code: 'function Component<T,U>() { return <div>test</div> }',
          output: 'const Component = <T,U>() => <div>test</div>;',
        },
      ]
        .map(withTsx())
        .map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
    });
  });
});
