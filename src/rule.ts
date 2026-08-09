import { TSESTree, TSESLint, ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';
import { Options, MessageId, MESSAGES_BY_ID, DEFAULT_OPTIONS, AnyFunction, Scope } from './config';
import { Guard } from './guard';
import { Writer } from './writer';

const createRule = ESLintUtils.RuleCreator((name) => `https://github.com/JamieMason/${name}`);

export const preferArrowFunctions = createRule<Options, MessageId>({
  name: 'prefer-arrow-functions',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Auto-fix plain Functions into Arrow Functions, in all cases where conversion would result in the same behaviour',
    },
    fixable: 'code',
    messages: MESSAGES_BY_ID,
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowedNames: {
            default: DEFAULT_OPTIONS.allowedNames,
            items: {
              type: 'string',
            },
            type: 'array',
          },
          allowNamedFunctions: {
            default: DEFAULT_OPTIONS.allowNamedFunctions,
            oneOf: [{ type: 'boolean' }, { type: 'string', enum: ['only-expressions'] }],
          },
          allowObjectProperties: {
            default: DEFAULT_OPTIONS.allowObjectProperties,
            type: 'boolean',
          },
          classPropertiesAllowed: {
            default: DEFAULT_OPTIONS.classPropertiesAllowed,
            type: 'boolean',
          },
          disallowPrototype: {
            default: DEFAULT_OPTIONS.disallowPrototype,
            type: 'boolean',
          },
          returnStyle: {
            default: DEFAULT_OPTIONS.returnStyle,
            pattern: '^(explicit|implicit|unchanged)$',
            type: 'string',
          },
          singleReturnOnly: {
            default: DEFAULT_OPTIONS.singleReturnOnly,
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
  },
  defaultOptions: [DEFAULT_OPTIONS],
  create: (ctx, [options]) => {
    const isTsx = ctx.physicalFilename?.endsWith('.tsx');
    const sourceCode = ctx.sourceCode;
    const scope: Scope = {
      isTsx,
      options,
      sourceCode,
    };

    const guard = new Guard(scope);
    const writer = new Writer(scope, guard);

    const getMessageId = (node: AnyFunction): MessageId => {
      return options.singleReturnOnly && guard.returnsImmediately(node)
        ? 'USE_ARROW_WHEN_SINGLE_RETURN'
        : 'USE_ARROW_WHEN_FUNCTION';
    };

    /** Replace container with new source, unless the rewrite would delete comments, break syntax, or change nothing */
    const fixUnlessUnsafe = (
      fn: AnyFunction,
      getText: () => string,
      container: TSESTree.Node = fn,
      alsoEmitted: (TSESTree.Node | null)[] = [],
    ): TSESLint.ReportFixFunction | undefined => {
      if (writer.cannotFixSafely(fn, container, alsoEmitted)) return undefined;
      const replacement = getText();
      if (replacement === sourceCode.getText(container)) return undefined;
      return (fixer) => fixer.replaceText(container, replacement);
    };

    return {
      'ExportDefaultDeclaration > FunctionDeclaration': (node: TSESTree.FunctionDeclaration) => {
        if (guard.isSafeTransformation(node)) {
          ctx.report({
            fix: fixUnlessUnsafe(node, () => writer.writeArrowFunction(node) + ';'),
            messageId: getMessageId(node),
            node,
          });
        }
      },
      ':matches(ClassProperty, MethodDefinition, Property)[value.type="FunctionExpression"][kind!=/^(get|set|constructor)$/]':
        (node: TSESTree.MethodDefinition | TSESTree.Property) => {
          const fn = node.value;
          // rewriting a decorated method as a class property would delete the decorator or change its kind
          if ('decorators' in node && node.decorators.length > 0) return;
          if (guard.isProtoShorthandMethod(node)) return;
          if (guard.isUnsafeAsClassProperty(node)) return;
          if (guard.isSafeTransformation(fn) && (!guard.isClassMember(fn) || options.classPropertiesAllowed)) {
            // parameter decorators are only legal on a method or constructor, never on an arrow
            if (fn.params.some((param) => 'decorators' in param && param.decorators.length > 0)) return;
            let propName: string;

            if (node.key.type === AST_NODE_TYPES.PrivateIdentifier) {
              const name = 'name' in node.key ? node.key.name : '';
              propName = `#${name}`;
            } else if (node.computed) {
              // For computed properties like [foo], [Symbol.iterator], etc.
              propName = `[${sourceCode.getText(node.key)}]`;
            } else if ('name' in node.key) {
              // For simple property names
              propName = node.key.name;
            } else {
              // Fallback to source text for other cases
              propName = sourceCode.getText(node.key);
            }

            const accessibility = 'accessibility' in node && node.accessibility ? `${node.accessibility} ` : '';
            const staticModifier = 'static' in node && node.static ? 'static ' : '';
            const overrideModifier = 'override' in node && node.override ? 'override ' : '';
            const optional = 'optional' in node && node.optional ? '?' : '';
            const modifiers = `${accessibility}${staticModifier}${overrideModifier}`;
            ctx.report({
              fix: fixUnlessUnsafe(
                fn,
                () =>
                  guard.isClassMember(node)
                    ? `${modifiers}${propName}${optional} = ${writer.writeArrowFunction(fn)};`
                    : `${modifiers}${propName}${optional}: ${writer.writeArrowFunction(fn)}`,
                node,
                [node.key],
              ),
              messageId: getMessageId(fn),
              node: fn,
            });
          }
        },
      'ArrowFunctionExpression[body.type!="BlockStatement"]': (node: TSESTree.ArrowFunctionExpression) => {
        if (options.returnStyle === 'explicit' && guard.isSafeTransformation(node)) {
          ctx.report({
            fix: fixUnlessUnsafe(node, () => writer.writeArrowFunction(node)),
            messageId: 'USE_EXPLICIT',
            node,
          });
        }
      },
      'ArrowFunctionExpression[body.body.length=1][body.body.0.type="ReturnStatement"]': (
        node: TSESTree.ArrowFunctionExpression,
      ) => {
        // a bare `return;` has no value which could become an implicit return
        if (!guard.isBlockStatementWithSingleReturn(node.body)) return;
        if (options.returnStyle === 'implicit' && guard.isSafeTransformation(node)) {
          ctx.report({
            fix: fixUnlessUnsafe(node, () => writer.writeArrowFunction(node)),
            messageId: 'USE_IMPLICIT',
            node,
          });
        }
      },
      'FunctionExpression[parent.type!=/^(ClassProperty|MethodDefinition|Property)$/]': (
        node: TSESTree.FunctionExpression,
      ) => {
        if (guard.isSafeTransformation(node)) {
          ctx.report({
            fix: fixUnlessUnsafe(node, () => writer.writeArrowFunction(node)),
            messageId: getMessageId(node),
            node,
          });
        }
      },
      'FunctionDeclaration[parent.type!="ExportDefaultDeclaration"]': (node: TSESTree.FunctionDeclaration) => {
        if (guard.isSafeTransformation(node)) {
          ctx.report({
            fix: fixUnlessUnsafe(node, () => writer.writeArrowConstant(node) + ';'),
            messageId: getMessageId(node),
            node,
          });
        }
      },
    };
  },
});
