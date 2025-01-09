import { TSESTree, ESLintUtils, AST_NODE_TYPES } from '@typescript-eslint/utils';

type AnyFunctionBody = TSESTree.BlockStatement | TSESTree.Expression;
type AnyFunction = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
type NameableFunction = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;
type NamedFunction = NameableFunction & { id: TSESTree.Identifier };
type GeneratorFunction = NameableFunction & { generator: true };

type WithTypeParameters<T extends AnyFunction> = T & { typeParameters: TSESTree.TSTypeParameterDeclaration };

export type MessageId = keyof typeof MESSAGES_BY_ID;
export type Options = [ActualOptions];

export interface ActualOptions {
  allowNamedFunctions: boolean;
  classPropertiesAllowed: boolean;
  disallowPrototype: boolean;
  returnStyle: 'explicit' | 'implicit' | 'unchanged';
  singleReturnOnly: boolean;
}

const DEFAULT_OPTIONS: ActualOptions = {
  allowNamedFunctions: false,
  classPropertiesAllowed: false,
  disallowPrototype: false,
  returnStyle: 'unchanged',
  singleReturnOnly: false,
};

const MESSAGES_BY_ID = {
  USE_ARROW_WHEN_FUNCTION: 'Prefer using arrow functions over plain functions',
  USE_ARROW_WHEN_SINGLE_RETURN: 'Prefer using arrow functions when the function contains only a return',
  USE_EXPLICIT: 'Prefer using explicit returns when the arrow function contain only a return',
  USE_IMPLICIT: 'Prefer using implicit returns when the arrow function contain only a return',
} as const;

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

    const isAnyFunction = (value: TSESTree.Node): value is AnyFunction => {
      return [
        AST_NODE_TYPES.FunctionDeclaration,
        AST_NODE_TYPES.FunctionExpression,
        AST_NODE_TYPES.ArrowFunctionExpression,
      ].includes(value.type);
    };

    const isReturnStatement = (value: unknown): value is TSESTree.ReturnStatement => {
      return (value as TSESTree.Node)?.type === AST_NODE_TYPES.ReturnStatement;
    };

    const isBlockStatementWithSingleReturn = (
      body: AnyFunctionBody,
    ): body is TSESTree.BlockStatement & {
      body: [TSESTree.ReturnStatement & { argument: TSESTree.Expression }];
    } => {
      return (
        body.type === AST_NODE_TYPES.BlockStatement &&
        body.body.length === 1 &&
        isReturnStatement(body.body[0]) &&
        body.body[0].argument !== null
      );
    };

    const hasImplicitReturn = (
      body: AnyFunctionBody,
    ): body is Exclude<AnyFunctionBody, AST_NODE_TYPES.BlockStatement> => {
      return body.type !== AST_NODE_TYPES.BlockStatement;
    };

    const returnsImmediately = (fn: AnyFunction): boolean => {
      return isBlockStatementWithSingleReturn(fn.body) || hasImplicitReturn(fn.body);
    };

    const getBodySource = ({ body }: AnyFunction): string => {
      if (options.returnStyle !== 'explicit' && isBlockStatementWithSingleReturn(body)) {
        const returnValue = body.body[0].argument;
        const source = sourceCode.getText(returnValue);
        return returnValue.type === AST_NODE_TYPES.ObjectExpression ? `(${source})` : source;
      }
      if (hasImplicitReturn(body) && options.returnStyle !== 'implicit') {
        return `{ return ${sourceCode.getText(body)} }`;
      }
      return sourceCode.getText(body);
    };

    const getParamsSource = (params: TSESTree.Parameter[]): string[] =>
      params.map((param) => sourceCode.getText(param));

    const getFunctionName = (node: AnyFunction): string => (node.id && node.id.name ? node.id.name : '');

    const isExportedAsNamedExport = (node: AnyFunction): boolean =>
      node.parent.type === AST_NODE_TYPES.ExportNamedDeclaration;

    const getPreviousNode = (fn: AnyFunction): TSESTree.Node | null => {
      const node = isExportedAsNamedExport(fn) ? fn.parent : fn;
      const tokenBefore = sourceCode.getTokenBefore(node);
      if (!tokenBefore) return null;
      return sourceCode.getNodeByRangeIndex(tokenBefore.range[0]);
    };

    const isOverloadedFunction = (fn: AnyFunction): boolean => {
      const previousNode = getPreviousNode(fn);
      return (
        previousNode?.type === AST_NODE_TYPES.TSDeclareFunction ||
        (previousNode?.type === AST_NODE_TYPES.ExportNamedDeclaration &&
          previousNode.declaration?.type === AST_NODE_TYPES.TSDeclareFunction)
      );
    };

    const hasTypeParameters = <T extends AnyFunction>(fn: T): fn is WithTypeParameters<T> => {
      return Boolean(fn.typeParameters);
    };

    const getGenericSource = (fn: AnyFunction): string => {
      if (!hasTypeParameters(fn)) return '';
      const genericSource = sourceCode.getText(fn.typeParameters);
      if (!isTSX) return genericSource;
      const params = fn.typeParameters.params;
      if (params.length === 1) return `<${params[0].name.name},>`;
      return genericSource;
    };

    const isAsyncFunction = (node: AnyFunction): boolean => node.async === true;

    const isGeneratorFunction = (fn: AnyFunction): fn is GeneratorFunction => {
      return fn.generator === true;
    };

    const isAssertionFunction = <T extends AnyFunction>(fn: T): fn is T & { returnType: TSESTree.TSTypeAnnotation } => {
      return (
        fn.returnType?.typeAnnotation.type === AST_NODE_TYPES.TSTypePredicate && fn.returnType?.typeAnnotation.asserts
      );
    };

    const getReturnType = (node: AnyFunction): string | undefined =>
      node.returnType && node.returnType.range && sourceCode.getText().substring(...node.returnType.range);

    const containsToken = (type: string, value: string, node: TSESTree.Node): boolean => {
      return sourceCode.getTokens(node).some((token) => token.type === type && token.value === value);
    };

    const containsSuper = (node: TSESTree.Node): boolean => {
      return containsToken('Keyword', 'super', node);
    };

    const containsThis = (node: TSESTree.Node): boolean => {
      return containsToken('Keyword', 'this', node);
    };

    const containsArguments = (node: TSESTree.Node): boolean => {
      return containsToken('Identifier', 'arguments', node);
    };

    const containsTokenSequence = (sequence: [string, string][], node: TSESTree.Node): boolean => {
      return sourceCode.getTokens(node).some((_, tokenIndex, tokens) => {
        return sequence.every(([expectedType, expectedValue], i) => {
          const actual = tokens[tokenIndex + i];
          return actual && actual.type === expectedType && actual.value === expectedValue;
        });
      });
    };

    const containsNewDotTarget = (node: TSESTree.Node): boolean => {
      return containsTokenSequence(
        [
          ['Keyword', 'new'],
          ['Punctuator', '.'],
          ['Identifier', 'target'],
        ],
        node,
      );
    };

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
        isAsync: isAsyncFunction(node),
        isGenerator: isGeneratorFunction(node),
        isGeneric: hasTypeParameters(node),
        name: getFunctionName(node),
        generic: getGenericSource(node),
        params: getParamsSource(node.params),
        returnType: getReturnType(node),
      };
    };

    const isPrototypeAssignment = (node: AnyFunction): boolean => {
      return sourceCode
        .getAncestors(node)
        .reverse()
        .some((ancestor) => {
          const isPropertyOfReplacementPrototypeObject =
            ancestor.type === AST_NODE_TYPES.AssignmentExpression &&
            ancestor.left &&
            'property' in ancestor.left &&
            ancestor.left.property &&
            'name' in ancestor.left.property &&
            ancestor.left.property.name === 'prototype';
          const isMutationOfExistingPrototypeObject =
            ancestor.type === AST_NODE_TYPES.AssignmentExpression &&
            ancestor.left &&
            'object' in ancestor.left &&
            ancestor.left.object &&
            'property' in ancestor.left.object &&
            ancestor.left.object.property &&
            'name' in ancestor.left.object.property &&
            ancestor.left.object.property.name === 'prototype';
          return isPropertyOfReplacementPrototypeObject || isMutationOfExistingPrototypeObject;
        });
    };

    const isWithinClassBody = (node: TSESTree.Node): boolean => {
      return sourceCode
        .getAncestors(node)
        .reverse()
        .some((ancestor) => {
          return ancestor.type === AST_NODE_TYPES.ClassBody;
        });
    };

    const isNamedFunction = (fn: AnyFunction): fn is NamedFunction => fn.id !== null && fn.id.name !== null;

    const hasNameAndIsExportedAsDefaultExport = (fn: AnyFunction): fn is NamedFunction =>
      isNamedFunction(fn) && fn.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration;

    const isSafeTransformation = (fn: TSESTree.Node): fn is AnyFunction => {
      const isSafe =
        isAnyFunction(fn) &&
        !isGeneratorFunction(fn) &&
        !isAssertionFunction(fn) &&
        !isOverloadedFunction(fn) &&
        !containsThis(fn) &&
        !containsSuper(fn) &&
        !containsArguments(fn) &&
        !containsNewDotTarget(fn);
      if (!isSafe) return false;
      if (options.allowNamedFunctions && isNamedFunction(fn)) return false;
      if (!options.disallowPrototype && isPrototypeAssignment(fn)) return false;
      if (options.singleReturnOnly && !returnsImmediately(fn)) return false;
      if (hasNameAndIsExportedAsDefaultExport(fn)) return false;
      return true;
    };

    const getMessageId = (node: AnyFunction): MessageId => {
      return options.singleReturnOnly && returnsImmediately(node)
        ? 'USE_ARROW_WHEN_SINGLE_RETURN'
        : 'USE_ARROW_WHEN_FUNCTION';
    };

    return {
      'ExportDefaultDeclaration > FunctionDeclaration': (node: TSESTree.FunctionDeclaration) => {
        if (isSafeTransformation(node)) {
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
          if (isSafeTransformation(fn) && (!isWithinClassBody(fn) || options.classPropertiesAllowed)) {
            const name = 'name' in node.key ? node.key.name : '';
            const propName = node.key.type === AST_NODE_TYPES.PrivateIdentifier ? `#${name}` : name;
            const staticModifier = 'static' in node && node.static ? 'static ' : '';
            ctx.report({
              fix: (fixer) =>
                fixer.replaceText(
                  node,
                  isWithinClassBody(node)
                    ? `${staticModifier}${propName} = ${writeArrowFunction(fn)};`
                    : `${staticModifier}${propName}: ${writeArrowFunction(fn)}`,
                ),
              messageId: getMessageId(fn),
              node: fn,
            });
          }
        },
      'ArrowFunctionExpression[body.type!="BlockStatement"]': (node: TSESTree.ArrowFunctionExpression) => {
        if (options.returnStyle === 'explicit' && isSafeTransformation(node)) {
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
        if (options.returnStyle === 'implicit' && isSafeTransformation(node)) {
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
        if (isSafeTransformation(node)) {
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
        if (isSafeTransformation(node)) {
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
