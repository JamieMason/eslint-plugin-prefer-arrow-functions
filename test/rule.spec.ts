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
        {
          code: 'function withThis(this: HTMLElement, event: Event) { return event.type; }',
        },
        {
          code: 'const withThis = function(this: void, value: number) { return value; };',
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

describe('when allowNamedFunctions is "only-expressions"', () => {
  describe('it allows named function expressions but transforms named declarations and anonymous expressions', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [
        // Named function expressions should be preserved
        { code: 'useThisFunction(function doSomething() { return "bar"; })' },
        { code: 'useThisFunction(function namedFunc() { console.log("test"); })' },
        { code: 'callback(function myCallback() { return 42; })' },
        { code: 'React.forwardRef(function MyComponent(props, ref) { return props.children; })' },
        { code: 'addEventListener("click", function handleClick(event) { console.log(event); })' },
        { code: 'arr.map(function mapFn(item) { return item * 2; })' },
        { code: 'setTimeout(function delayedFn() { console.log("delayed"); }, 1000)' },

        // Named function expressions with async should be preserved
        { code: 'useAsyncFunction(async function asyncNamed() { return await getData(); })' },

        // Named function expressions with generators should be preserved
        { code: 'useGenerator(function* generatorNamed() { yield 1; })' },

        // Named function expressions that preserve this behavior
        { code: 'obj.method(function namedWithThis() { return this.value; })' },
        { code: 'context.bind(function boundNamed() { this.prop = "value"; })' },

        // Named function expressions with complex parameters
        { code: 'processor(function processData(data, { options = {} } = {}) { return data.process(options); })' },

        // Nested named function expressions
        { code: 'outer(function outerNamed() { return inner(function innerNamed() { return "nested"; }); })' },

        // Arrow functions should remain valid (no change from existing behavior)
        { code: 'const arrow = () => "arrow"' },
        { code: 'useArrowFunction(() => "test")' },
      ].map(withOptions({ allowNamedFunctions: 'only-expressions' })),
      invalid: [
        // Named function declarations should be transformed
        {
          code: 'function doSomething() { return "bar"; }',
          output: 'const doSomething = () => "bar";',
        },
        {
          code: 'function namedDeclaration() { console.log("test"); }',
          output: 'const namedDeclaration = () => { console.log("test"); };',
        },
        {
          code: 'async function asyncDeclaration() { return await getData(); }',
          output: 'const asyncDeclaration = async () => await getData();',
        },

        // Anonymous function expressions should be transformed
        {
          code: 'useThisFunction(function() { return "bar"; })',
          output: 'useThisFunction(() => "bar")',
        },
        {
          code: 'callback(function() { console.log("test"); })',
          output: 'callback(() => { console.log("test"); })',
        },
        {
          code: 'addEventListener("click", function(event) { console.log(event); })',
          output: 'addEventListener("click", (event) => { console.log(event); })',
        },
        {
          code: 'arr.map(function(item) { return item * 2; })',
          output: 'arr.map((item) => item * 2)',
        },
        {
          code: 'setTimeout(function() { console.log("delayed"); }, 1000)',
          output: 'setTimeout(() => { console.log("delayed"); }, 1000)',
        },

        // Anonymous async function expressions should be transformed
        {
          code: 'useAsyncFunction(async function() { return await getData(); })',
          output: 'useAsyncFunction(async () => await getData())',
        },

        // Variable assignments with anonymous functions should be transformed
        {
          code: 'var foo = function() { return "bar"; };',
          output: 'var foo = () => "bar";',
        },
        {
          code: 'const handler = function() { console.log("click"); };',
          output: 'const handler = () => { console.log("click"); };',
        },

        // Object methods with anonymous functions should be transformed
        {
          code: 'var obj = { method: function() { return "test"; } }',
          output: 'var obj = { method: () => "test" }',
        },

        // Nested cases: outer anonymous should transform, inner named expression should not
        {
          code: 'var outer = function() { return inner(function namedInner() { return "nested"; }); };',
          output: 'var outer = () => inner(function namedInner() { return "nested"; });',
        },

        // Export default declarations should be transformed
        {
          code: 'export default function() { return "exported"; }',
          output: 'export default () => "exported";',
        },
      ]
        .map(withOptions({ allowNamedFunctions: 'only-expressions' }))
        .map(withErrors(['USE_ARROW_WHEN_FUNCTION']))
        .concat([
          // Multiple function scenarios - both should be transformed (handled separately)
          {
            code: 'function declaration() { return "decl"; } var expr = function() { return "expr"; };',
            output: 'const declaration = () => "decl"; var expr = () => "expr";',
            options: [{ allowNamedFunctions: 'only-expressions' }],
            errors: [{ messageId: 'USE_ARROW_WHEN_FUNCTION' }, { messageId: 'USE_ARROW_WHEN_FUNCTION' }],
          },
        ]),
    });
  });

  describe('it preserves this behavior with only-expressions option', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [
        // Named function expressions that use this should be preserved
        { code: 'obj.addEventListener("click", function handleClick() { this.style.color = "red"; })' },
        { code: 'elements.forEach(function processElement() { this.process(); })' },
        { code: 'jQuery(selector).each(function namedEach() { $(this).addClass("active"); })' },

        // Functions that don't use this but are named expressions should be preserved
        { code: 'callback(function namedCallback() { return "no this used"; })' },

        // Anonymous functions that use this should be preserved (existing behavior)
        { code: 'obj.addEventListener("click", function() { this.style.color = "red"; })' },
        { code: 'elements.forEach(function() { this.process(); })' },

        // Arrow functions should remain valid (no change)
        { code: 'obj.addEventListener("click", () => { console.log("arrow with no this"); })' },
      ].map(withOptions({ allowNamedFunctions: 'only-expressions' })),
      invalid: [
        // Named function declarations that don't use this should still be transformed
        {
          code: 'function noThisUsed() { return "safe to transform"; }',
          output: 'const noThisUsed = () => "safe to transform";',
        },

        // Anonymous function expressions that don't use this should be transformed
        {
          code: 'callback(function() { return "no this, should transform"; })',
          output: 'callback(() => "no this, should transform")',
        },

        // Variable assignments with anonymous functions that don't use this
        {
          code: 'var handler = function() { console.log("no this"); };',
          output: 'var handler = () => { console.log("no this"); };',
        },
      ]
        .map(withOptions({ allowNamedFunctions: 'only-expressions' }))
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

describe('issue #60 - computed property keys should be preserved', () => {
  describe('when computed property methods should NOT be transformed', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [
        {
          code: `const obj = {
  [Symbol.iterator]() {
    return this;
  },
};`,
        },
        {
          code: `const dynamicKey = 'method';
const obj = {
  [dynamicKey]() {
    console.log(this.value);
  },
};`,
        },
        {
          code: `const obj = {
  ['computed-key']() {
    return arguments[0];
  },
};`,
        },
        {
          code: `const prefix = 'handle';
const suffix = 'Click';
const obj = {
  [prefix + suffix]() {
    super.onClick();
  },
};`,
        },
      ],
      invalid: [],
    });
  });

  describe('when computed property methods can be safely transformed', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [],
      invalid: [
        {
          code: `const foo = 'bar';
export default {
  [foo]() {
    console.log('output');
  },
};`,
          output: `const foo = 'bar';
export default {
  [foo]: () => {
    console.log('output');
  },
};`,
        },
        {
          code: `const methodName = 'getData';
const obj = {
  [methodName]() {
    return 42;
  },
};`,
          output: `const methodName = 'getData';
const obj = {
  [methodName]: () => 42,
};`,
        },
        {
          code: `const obj = {
  ['computed-key']() {
    return 'value';
  },
};`,
          output: `const obj = {
  ['computed-key']: () => 'value',
};`,
        },
        {
          code: `const obj = {
  [Symbol.iterator]() {
    return 'iterator';
  },
};`,
          output: `const obj = {
  [Symbol.iterator]: () => 'iterator',
};`,
        },
        {
          code: `const prefix = 'handle';
const suffix = 'Click';
const obj = {
  [prefix + suffix]() {
    console.log('clicked');
  },
};`,
          output: `const prefix = 'handle';
const suffix = 'Click';
const obj = {
  [prefix + suffix]: () => {
    console.log('clicked');
  },
};`,
        },
      ].map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
    });
  });
});

describe('issue #37 - arrow function precedence in operator expressions', () => {
  describe('when function expressions need parentheses due to operator precedence', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [],
      invalid: [
        // Cases that should be transformed but need parentheses for correct precedence
        {
          code: `const result = f || function() { return 'default'; };`,
          output: `const result = f || (() => 'default');`,
        },
        {
          code: `const result = f && function() { return 'value'; };`,
          output: `const result = f && (() => 'value');`,
        },
        {
          code: `const result = f + function() { return 1; };`,
          output: `const result = f + (() => 1);`,
        },
        {
          code: `const result = f - function() { return 1; };`,
          output: `const result = f - (() => 1);`,
        },
        {
          code: `const result = f * function() { return 2; };`,
          output: `const result = f * (() => 2);`,
        },
        {
          code: `const result = f / function() { return 2; };`,
          output: `const result = f / (() => 2);`,
        },
        {
          code: `const result = f % function() { return 3; };`,
          output: `const result = f % (() => 3);`,
        },
        {
          code: `const result = f ** function() { return 2; };`,
          output: `const result = f ** (() => 2);`,
        },
        {
          code: `const result = f | function() { return 1; };`,
          output: `const result = f | (() => 1);`,
        },
        {
          code: `const result = f & function() { return 1; };`,
          output: `const result = f & (() => 1);`,
        },
        {
          code: `const result = f ^ function() { return 1; };`,
          output: `const result = f ^ (() => 1);`,
        },
        {
          code: `const result = f << function() { return 1; };`,
          output: `const result = f << (() => 1);`,
        },
        {
          code: `const result = f >> function() { return 1; };`,
          output: `const result = f >> (() => 1);`,
        },
        {
          code: `const result = f >>> function() { return 1; };`,
          output: `const result = f >>> (() => 1);`,
        },
        {
          code: `const result = f < function() { return 1; };`,
          output: `const result = f < (() => 1);`,
        },
        {
          code: `const result = f > function() { return 1; };`,
          output: `const result = f > (() => 1);`,
        },
        {
          code: `const result = f <= function() { return 1; };`,
          output: `const result = f <= (() => 1);`,
        },
        {
          code: `const result = f >= function() { return 1; };`,
          output: `const result = f >= (() => 1);`,
        },
        {
          code: `const result = f == function() { return 1; };`,
          output: `const result = f == (() => 1);`,
        },
        {
          code: `const result = f != function() { return 1; };`,
          output: `const result = f != (() => 1);`,
        },
        {
          code: `const result = f === function() { return 1; };`,
          output: `const result = f === (() => 1);`,
        },
        {
          code: `const result = f !== function() { return 1; };`,
          output: `const result = f !== (() => 1);`,
        },
        {
          code: `const result = f instanceof function() { return Object; };`,
          output: `const result = f instanceof (() => Object);`,
        },
        {
          code: `const result = f in function() { return {}; };`,
          output: `const result = f in (() => ({}));`,
        },
      ].map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
    });
  });

  describe('when function expressions can be safely transformed without parentheses', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [],
      invalid: [
        // Assignment operators - don't need parentheses
        {
          code: `let result = function() { return 'value'; };`,
          output: `let result = () => 'value';`,
        },
        {
          code: `result += function() { return 1; };`,
          output: `result += () => 1;`,
        },
        {
          code: `result -= function() { return 1; };`,
          output: `result -= () => 1;`,
        },
        {
          code: `result *= function() { return 2; };`,
          output: `result *= () => 2;`,
        },
        {
          code: `result /= function() { return 2; };`,
          output: `result /= () => 2;`,
        },
        // Arrow function as right operand of arrow function
        {
          code: `const fn = () => function() { return 'nested'; };`,
          output: `const fn = () => () => 'nested';`,
        },
        // Ternary operators - right side doesn't need parentheses
        {
          code: `const result = condition ? 'yes' : function() { return 'no'; };`,
          output: `const result = condition ? 'yes' : () => 'no';`,
        },
        {
          code: `const result = condition ? function() { return 'yes'; } : 'no';`,
          output: `const result = condition ? () => 'yes' : 'no';`,
        },
        // Comma operator - doesn't need parentheses
        {
          code: `const result = (doSomething(), function() { return 'value'; });`,
          output: `const result = (doSomething(), () => 'value');`,
        },
        {
          code: `const result = (function() { return 'first'; }, doSomething());`,
          output: `const result = (() => 'first', doSomething());`,
        },
        {
          code: `const result = (doSomething(), function() { return 'second'; });`,
          output: `const result = (doSomething(), () => 'second');`,
        },
        // Spread operator - doesn't need parentheses
        {
          code: `const result = [...items, function() { return 'last'; }];`,
          output: `const result = [...items, () => 'last'];`,
        },
        // Yield - doesn't need parentheses
        {
          code: `function* gen() { yield function() { return 'value'; }; }`,
          output: `function* gen() { yield () => 'value'; }`,
        },
        {
          code: `function* gen() { yield* function() { return [1, 2, 3]; }; }`,
          output: `function* gen() { yield* () => [1, 2, 3]; }`,
        },
      ].map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
    });
  });
});

describe('issue #39 - outer functions should be transformed even if inner functions use this', () => {
  describe('when outer functions should NOT be transformed (they themselves use this)', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [
        {
          code: `function outer() {
  console.log(this);
  function inner() {
    return this;
  }
  return inner;
}`,
        },
        {
          code: `function outer() {
  const self = this;
  function inner() {
    return this;
  }
  return self;
}`,
        },
        {
          code: `const obj = {
  method: function() {
    console.log(this);
    function helper() {
      return this;
    }
    return helper();
  }
}`,
        },
      ],
      invalid: [],
    });
  });

  describe('when outer functions can be safely transformed (inner functions use this but outer does not)', () => {
    ruleTester.run('prefer-arrow-functions', rule, {
      valid: [],
      invalid: [
        {
          code: `function outer() {
  function inner() {
    return this;
  }
  return inner;
}`,
          output: `const outer = () => {
  function inner() {
    return this;
  }
  return inner;
};`,
        },
        {
          code: `function outer() {
  console.log('outer function');
  function inner() {
    return this;
  }
  return inner();
}`,
          output: `const outer = () => {
  console.log('outer function');
  function inner() {
    return this;
  }
  return inner();
};`,
        },
        {
          code: `function outer(param) {
  let result;
  function inner() {
    console.log(this);
    return param;
  }
  result = inner();
  return result;
}`,
          output: `const outer = (param) => {
  let result;
  function inner() {
    console.log(this);
    return param;
  }
  result = inner();
  return result;
};`,
        },
        {
          code: `function outer() {
  const helper = function() {
    return this;
  };
  return helper;
}`,
          output: `const outer = () => {
  const helper = function() {
    return this;
  };
  return helper;
};`,
        },
        {
          code: `function outer() {
  return function() {
    return this;
  };
}`,
          output: `const outer = () => function() {
    return this;
  };`,
        },
        {
          code: `function outer() {
  function innerA() {
    return this;
  }
  function innerB() {
    console.log(this);
  }
  return [innerA, innerB];
}`,
          output: `const outer = () => {
  function innerA() {
    return this;
  }
  function innerB() {
    console.log(this);
  }
  return [innerA, innerB];
};`,
        },
        {
          code: `const obj = {
  method: function() {
    function helper() {
      return this;
    }
    return helper();
  }
}`,
          output: `const obj = {
  method: () => {
    function helper() {
      return this;
    }
    return helper();
  }
}`,
        },
        {
          code: `export default function() {
  function inner() {
    return this;
  }
  return inner;
}`,
          output: `export default () => {
  function inner() {
    return this;
  }
  return inner;
};`,
        },
      ].map(withErrors(['USE_ARROW_WHEN_FUNCTION'])),
    });
  });
});
