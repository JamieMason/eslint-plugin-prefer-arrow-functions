import { TSESTree, ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';
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
            type: 'boolean',
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

    return {
      'ExportDefaultDeclaration > FunctionDeclaration': (node: TSESTree.FunctionDeclaration) => {
        if (guard.isSafeTransformation(node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writer.writeArrowFunction(node) + ';'),
            messageId: getMessageId(node),
            node,
          });
        }
      },
      ':matches(ClassProperty, MethodDefinition, Property)[key.name][value.type="FunctionExpression"][kind!=/^(get|set|constructor)$/]':
        (node: TSESTree.MethodDefinition | TSESTree.Property) => {
          const fn = node.value;
          if (guard.isSafeTransformation(fn) && (!guard.isWithinClassBody(fn) || options.classPropertiesAllowed)) {
            const name = 'name' in node.key ? node.key.name : '';
            const propName = node.key.type === AST_NODE_TYPES.PrivateIdentifier ? `#${name}` : name;
            const staticModifier = 'static' in node && node.static ? 'static ' : '';
            ctx.report({
              fix: (fixer) =>
                fixer.replaceText(
                  node,
                  guard.isWithinClassBody(node)
                    ? `${staticModifier}${propName} = ${writer.writeArrowFunction(fn)};`
                    : `${staticModifier}${propName}: ${writer.writeArrowFunction(fn)}`,
                ),
              messageId: getMessageId(fn),
              node: fn,
            });
          }
        },
      'ArrowFunctionExpression[body.type!="BlockStatement"]': (node: TSESTree.ArrowFunctionExpression) => {
        if (options.returnStyle === 'explicit' && guard.isSafeTransformation(node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writer.writeArrowFunction(node)),
            messageId: 'USE_EXPLICIT',
            node,
          });
        }
      },
      'ArrowFunctionExpression[body.body.length=1][body.body.0.type="ReturnStatement"]': (
        node: TSESTree.ArrowFunctionExpression,
      ) => {
        if (options.returnStyle === 'implicit' && guard.isSafeTransformation(node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writer.writeArrowFunction(node)),
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
            fix: (fixer) => {
              return fixer.replaceText(node, writer.writeArrowFunction(node));
            },
            messageId: getMessageId(node),
            node,
          });
        }
      },
      'FunctionDeclaration[parent.type!="ExportDefaultDeclaration"]': (node: TSESTree.FunctionDeclaration) => {
        if (guard.isSafeTransformation(node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writer.writeArrowConstant(node) + ';'),
            messageId: getMessageId(node),
            node,
          });
        }
      },
    };
  },
});
