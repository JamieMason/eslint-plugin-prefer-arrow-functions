import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';
import { SourceCode } from '@typescript-eslint/utils/ts-eslint';
import {
  ActualOptions,
  AnyFunction,
  AnyFunctionBody,
  GeneratorFunction,
  NamedFunction,
  WithTypeParameters,
} from './config';

export const isAnyFunction = (value: TSESTree.Node): value is AnyFunction => {
  return [
    AST_NODE_TYPES.FunctionDeclaration,
    AST_NODE_TYPES.FunctionExpression,
    AST_NODE_TYPES.ArrowFunctionExpression,
  ].includes(value.type);
};

export const isReturnStatement = (value: unknown): value is TSESTree.ReturnStatement => {
  return (value as TSESTree.Node)?.type === AST_NODE_TYPES.ReturnStatement;
};

export const isBlockStatementWithSingleReturn = (
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

export const hasImplicitReturn = (
  body: AnyFunctionBody,
): body is Exclude<AnyFunctionBody, AST_NODE_TYPES.BlockStatement> => {
  return body.type !== AST_NODE_TYPES.BlockStatement;
};

export const returnsImmediately = (fn: AnyFunction): boolean => {
  return isBlockStatementWithSingleReturn(fn.body) || hasImplicitReturn(fn.body);
};

export const isExportedAsNamedExport = (node: AnyFunction): boolean =>
  node.parent.type === AST_NODE_TYPES.ExportNamedDeclaration;

const getPreviousNode = (sourceCode: SourceCode, fn: AnyFunction): TSESTree.Node | null => {
  const node = isExportedAsNamedExport(fn) ? fn.parent : fn;
  const tokenBefore = sourceCode.getTokenBefore(node);
  if (!tokenBefore) return null;
  return sourceCode.getNodeByRangeIndex(tokenBefore.range[0]);
};

export const isOverloadedFunction = (sourceCode: SourceCode, fn: AnyFunction): boolean => {
  const previousNode = getPreviousNode(sourceCode, fn);
  return (
    previousNode?.type === AST_NODE_TYPES.TSDeclareFunction ||
    (previousNode?.type === AST_NODE_TYPES.ExportNamedDeclaration &&
      previousNode.declaration?.type === AST_NODE_TYPES.TSDeclareFunction)
  );
};

export const hasTypeParameters = <T extends AnyFunction>(fn: T): fn is WithTypeParameters<T> => {
  return Boolean(fn.typeParameters);
};

export const isAsyncFunction = (node: AnyFunction): boolean => node.async === true;

export const isGeneratorFunction = (fn: AnyFunction): fn is GeneratorFunction => {
  return fn.generator === true;
};

export const isAssertionFunction = <T extends AnyFunction>(
  fn: T,
): fn is T & { returnType: TSESTree.TSTypeAnnotation } => {
  return fn.returnType?.typeAnnotation.type === AST_NODE_TYPES.TSTypePredicate && fn.returnType?.typeAnnotation.asserts;
};

export const containsToken = (sourceCode: SourceCode, type: string, value: string, node: TSESTree.Node): boolean => {
  return sourceCode.getTokens(node).some((token) => token.type === type && token.value === value);
};

export const containsSuper = (sourceCode: SourceCode, node: TSESTree.Node): boolean => {
  return containsToken(sourceCode, 'Keyword', 'super', node);
};

export const containsThis = (sourceCode: SourceCode, node: TSESTree.Node): boolean => {
  return containsToken(sourceCode, 'Keyword', 'this', node);
};

export const containsArguments = (sourceCode: SourceCode, node: TSESTree.Node): boolean => {
  return containsToken(sourceCode, 'Identifier', 'arguments', node);
};

export const containsTokenSequence = (
  sourceCode: SourceCode,
  sequence: [string, string][],
  node: TSESTree.Node,
): boolean => {
  return sourceCode.getTokens(node).some((_, tokenIndex, tokens) => {
    return sequence.every(([expectedType, expectedValue], i) => {
      const actual = tokens[tokenIndex + i];
      return actual && actual.type === expectedType && actual.value === expectedValue;
    });
  });
};

export const containsNewDotTarget = (sourceCode: SourceCode, node: TSESTree.Node): boolean => {
  return containsTokenSequence(
    sourceCode,
    [
      ['Keyword', 'new'],
      ['Punctuator', '.'],
      ['Identifier', 'target'],
    ],
    node,
  );
};

export const isPrototypeAssignment = (sourceCode: SourceCode, node: AnyFunction): boolean => {
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

export const isWithinClassBody = (sourceCode: SourceCode, node: TSESTree.Node): boolean => {
  return sourceCode
    .getAncestors(node)
    .reverse()
    .some((ancestor) => {
      return ancestor.type === AST_NODE_TYPES.ClassBody;
    });
};

export const isNamedFunction = (fn: AnyFunction): fn is NamedFunction => fn.id !== null && fn.id.name !== null;

export const hasNameAndIsExportedAsDefaultExport = (fn: AnyFunction): fn is NamedFunction =>
  isNamedFunction(fn) && fn.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration;

export const isSafeTransformation = (
  options: ActualOptions,
  sourceCode: SourceCode,
  fn: TSESTree.Node,
): fn is AnyFunction => {
  const isSafe =
    isAnyFunction(fn) &&
    !isGeneratorFunction(fn) &&
    !isAssertionFunction(fn) &&
    !isOverloadedFunction(sourceCode, fn) &&
    !containsThis(sourceCode, fn) &&
    !containsSuper(sourceCode, fn) &&
    !containsArguments(sourceCode, fn) &&
    !containsNewDotTarget(sourceCode, fn);
  if (!isSafe) return false;
  if (options.allowNamedFunctions && isNamedFunction(fn)) return false;
  if (!options.disallowPrototype && isPrototypeAssignment(sourceCode, fn)) return false;
  if (options.singleReturnOnly && !returnsImmediately(fn)) return false;
  if (hasNameAndIsExportedAsDefaultExport(fn)) return false;
  return true;
};
