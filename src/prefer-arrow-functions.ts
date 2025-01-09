import { TSESTree, ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';
import { Options, MessageId, MESSAGES_BY_ID, DEFAULT_OPTIONS, AnyFunction } from './config';
import * as guard from './guard';

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
          allowNamedFunctions: {
            default: DEFAULT_OPTIONS.allowNamedFunctions,
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
    const { sourceCode } = ctx;
    const filename = ctx.physicalFilename;
    const isTSX = filename?.endsWith('.tsx');

    const getBodySource = ({ body }: AnyFunction): string => {
      if (options.returnStyle !== 'explicit' && guard.isBlockStatementWithSingleReturn(body)) {
        const returnValue = body.body[0].argument;
        const source = sourceCode.getText(returnValue);
        return returnValue.type === AST_NODE_TYPES.ObjectExpression ? `(${source})` : source;
      }
      if (guard.hasImplicitReturn(body) && options.returnStyle !== 'implicit') {
        return `{ return ${sourceCode.getText(body)} }`;
      }
      return sourceCode.getText(body);
    };

    const getParamsSource = (params: TSESTree.Parameter[]): string[] =>
      params.map((param) => sourceCode.getText(param));

    const getFunctionName = (node: AnyFunction): string => (node.id && node.id.name ? node.id.name : '');

    const getGenericSource = (fn: AnyFunction): string => {
      if (!guard.hasTypeParameters(fn)) return '';
      const genericSource = sourceCode.getText(fn.typeParameters);
      if (!isTSX) return genericSource;
      const params = fn.typeParameters.params;
      if (params.length === 1) return `<${params[0].name.name},>`;
      return genericSource;
    };

    const getReturnType = (node: AnyFunction): string | undefined =>
      node.returnType && node.returnType.range && sourceCode.getText().substring(...node.returnType.range);

    const writeArrowFunction = (node: AnyFunction): string => {
      const fn = getFunctionDescriptor(node);
      const ASYNC = fn.isAsync ? 'async ' : '';
      const GENERIC = fn.isGeneric ? fn.generic : '';
      const BODY = fn.body;
      const RETURN_TYPE = fn.returnType ? fn.returnType : '';
      const PARAMS = fn.params.join(', ');
      return `${ASYNC}${GENERIC}(${PARAMS})${RETURN_TYPE} => ${BODY}`;
    };

    const writeArrowConstant = (node: TSESTree.FunctionDeclaration): string => {
      const fn = getFunctionDescriptor(node);
      return `const ${fn.name} = ${writeArrowFunction(node)}`;
    };

    const getFunctionDescriptor = (node: AnyFunction) => {
      return {
        body: getBodySource(node),
        isAsync: guard.isAsyncFunction(node),
        isGenerator: guard.isGeneratorFunction(node),
        isGeneric: guard.hasTypeParameters(node),
        name: getFunctionName(node),
        generic: getGenericSource(node),
        params: getParamsSource(node.params),
        returnType: getReturnType(node),
      };
    };

    const getMessageId = (node: AnyFunction): MessageId => {
      return options.singleReturnOnly && guard.returnsImmediately(node)
        ? 'USE_ARROW_WHEN_SINGLE_RETURN'
        : 'USE_ARROW_WHEN_FUNCTION';
    };

    return {
      'ExportDefaultDeclaration > FunctionDeclaration': (node: TSESTree.FunctionDeclaration) => {
        if (guard.isSafeTransformation(options, sourceCode, node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node) + ';'),
            messageId: getMessageId(node),
            node,
          });
        }
      },
      ':matches(ClassProperty, MethodDefinition, Property)[key.name][value.type="FunctionExpression"][kind!=/^(get|set|constructor)$/]':
        (node: TSESTree.MethodDefinition | TSESTree.Property) => {
          const fn = node.value;
          if (
            guard.isSafeTransformation(options, sourceCode, fn) &&
            (!guard.isWithinClassBody(sourceCode, fn) || options.classPropertiesAllowed)
          ) {
            const name = 'name' in node.key ? node.key.name : '';
            const propName = node.key.type === AST_NODE_TYPES.PrivateIdentifier ? `#${name}` : name;
            const staticModifier = 'static' in node && node.static ? 'static ' : '';
            ctx.report({
              fix: (fixer) =>
                fixer.replaceText(
                  node,
                  guard.isWithinClassBody(sourceCode, node)
                    ? `${staticModifier}${propName} = ${writeArrowFunction(fn)};`
                    : `${staticModifier}${propName}: ${writeArrowFunction(fn)}`,
                ),
              messageId: getMessageId(fn),
              node: fn,
            });
          }
        },
      'ArrowFunctionExpression[body.type!="BlockStatement"]': (node: TSESTree.ArrowFunctionExpression) => {
        if (options.returnStyle === 'explicit' && guard.isSafeTransformation(options, sourceCode, node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
            messageId: 'USE_EXPLICIT',
            node,
          });
        }
      },
      'ArrowFunctionExpression[body.body.length=1][body.body.0.type="ReturnStatement"]': (
        node: TSESTree.ArrowFunctionExpression,
      ) => {
        if (options.returnStyle === 'implicit' && guard.isSafeTransformation(options, sourceCode, node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
            messageId: 'USE_IMPLICIT',
            node,
          });
        }
      },
      'FunctionExpression[parent.type!=/^(ClassProperty|MethodDefinition|Property)$/]': (
        node: TSESTree.FunctionExpression,
      ) => {
        if (guard.isSafeTransformation(options, sourceCode, node)) {
          ctx.report({
            fix: (fixer) => {
              return fixer.replaceText(node, writeArrowFunction(node));
            },
            messageId: getMessageId(node),
            node,
          });
        }
      },
      'FunctionDeclaration[parent.type!="ExportDefaultDeclaration"]': (node: TSESTree.FunctionDeclaration) => {
        if (guard.isSafeTransformation(options, sourceCode, node)) {
          ctx.report({
            fix: (fixer) => fixer.replaceText(node, writeArrowConstant(node) + ';'),
            messageId: getMessageId(node),
            node,
          });
        }
      },
    };
  },
});
