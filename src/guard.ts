import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils';
import { AnyFunction, AnyFunctionBody, Scope, GeneratorFunction, NamedFunction, WithTypeParameters } from './config';

export class Guard {
  isTsx: Scope['isTsx'];
  options: Scope['options'];
  sourceCode: Scope['sourceCode'];

  constructor(scope: Scope) {
    this.isTsx = scope.isTsx;
    this.options = scope.options;
    this.sourceCode = scope.sourceCode;
  }

  isAnyFunction(value: TSESTree.Node): value is AnyFunction {
    return [
      AST_NODE_TYPES.FunctionDeclaration,
      AST_NODE_TYPES.FunctionExpression,
      AST_NODE_TYPES.ArrowFunctionExpression,
    ].includes(value.type);
  }

  isReturnStatement(value: unknown): value is TSESTree.ReturnStatement {
    return (value as TSESTree.Node)?.type === AST_NODE_TYPES.ReturnStatement;
  }

  isBlockStatementWithSingleReturn(body: AnyFunctionBody): body is TSESTree.BlockStatement & {
    body: [TSESTree.ReturnStatement & { argument: TSESTree.Expression }];
  } {
    return (
      body.type === AST_NODE_TYPES.BlockStatement &&
      body.body.length === 1 &&
      this.isReturnStatement(body.body[0]) &&
      body.body[0].argument !== null
    );
  }

  hasImplicitReturn(body: AnyFunctionBody): body is Exclude<AnyFunctionBody, AST_NODE_TYPES.BlockStatement> {
    return body.type !== AST_NODE_TYPES.BlockStatement;
  }

  returnsImmediately(fn: AnyFunction): boolean {
    return this.isBlockStatementWithSingleReturn(fn.body) || this.hasImplicitReturn(fn.body);
  }

  isExportedAsNamedExport(node: AnyFunction): boolean {
    return node.parent.type === AST_NODE_TYPES.ExportNamedDeclaration;
  }

  getPreviousNode(fn: AnyFunction): TSESTree.Node | null {
    const node = this.isExportedAsNamedExport(fn) ? fn.parent : fn;
    const tokenBefore = this.sourceCode.getTokenBefore(node);
    if (!tokenBefore) return null;
    return this.sourceCode.getNodeByRangeIndex(tokenBefore.range[0]);
  }

  isOverloadedFunction(fn: AnyFunction): boolean {
    const previousNode = this.getPreviousNode(fn);
    return (
      previousNode?.type === AST_NODE_TYPES.TSDeclareFunction ||
      (previousNode?.type === AST_NODE_TYPES.ExportNamedDeclaration &&
        previousNode.declaration?.type === AST_NODE_TYPES.TSDeclareFunction)
    );
  }

  hasTypeParameters<T extends AnyFunction>(fn: T): fn is WithTypeParameters<T> {
    return Boolean(fn.typeParameters);
  }

  isAsyncFunction(node: AnyFunction): boolean {
    return node.async === true;
  }

  isGeneratorFunction(fn: AnyFunction): fn is GeneratorFunction {
    return fn.generator === true;
  }

  isAssertionFunction<T extends AnyFunction>(fn: T): fn is T & { returnType: TSESTree.TSTypeAnnotation } {
    return (
      fn.returnType?.typeAnnotation.type === AST_NODE_TYPES.TSTypePredicate && fn.returnType?.typeAnnotation.asserts
    );
  }

  containsToken(type: string, value: string, node: TSESTree.Node): boolean {
    return this.sourceCode.getTokens(node).some((token) => token.type === type && token.value === value);
  }

  containsSuper(node: TSESTree.Node): boolean {
    return this.containsToken('Keyword', 'super', node);
  }

  containsThis(node: TSESTree.Node): boolean {
    return this.containsToken('Keyword', 'this', node);
  }

  containsArguments(node: TSESTree.Node): boolean {
    return this.containsToken('Identifier', 'arguments', node);
  }

  containsTokenSequence(sequence: [string, string][], node: TSESTree.Node): boolean {
    return this.sourceCode.getTokens(node).some((_, tokenIndex, tokens) => {
      return sequence.every(([expectedType, expectedValue], i) => {
        const actual = tokens[tokenIndex + i];
        return actual && actual.type === expectedType && actual.value === expectedValue;
      });
    });
  }

  containsNewDotTarget(node: TSESTree.Node): boolean {
    return this.containsTokenSequence(
      [
        ['Keyword', 'new'],
        ['Punctuator', '.'],
        ['Identifier', 'target'],
      ],
      node,
    );
  }

  isPrototypeAssignment(node: AnyFunction): boolean {
    return this.sourceCode
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
  }

  isWithinClassBody(node: TSESTree.Node): boolean {
    return this.sourceCode
      .getAncestors(node)
      .reverse()
      .some((ancestor) => {
        return ancestor.type === AST_NODE_TYPES.ClassBody;
      });
  }

  isNamedFunction(fn: AnyFunction): fn is NamedFunction {
    return fn.id !== null && fn.id.name !== null;
  }

  hasNameAndIsExportedAsDefaultExport(fn: AnyFunction): fn is NamedFunction {
    return this.isNamedFunction(fn) && fn.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration;
  }

  isIgnored(fn: AnyFunction): boolean {
    return this.isNamedFunction(fn) && this.options.allowedNames.includes(fn.id.name);
  }

  isObjectProperty(fn: AnyFunction): boolean {
    return this.sourceCode
      .getAncestors(fn)
      .reverse()
      .some((ancestor) => {
        return ancestor.type === AST_NODE_TYPES.Property;
      });
  }

  isSafeTransformation(fn: TSESTree.Node): fn is AnyFunction {
    const isSafe =
      this.isAnyFunction(fn) &&
      !this.isGeneratorFunction(fn) &&
      !this.isAssertionFunction(fn) &&
      !this.isOverloadedFunction(fn) &&
      !this.containsThis(fn) &&
      !this.containsSuper(fn) &&
      !this.containsArguments(fn) &&
      !this.containsNewDotTarget(fn);
    if (!isSafe) return false;
    if (this.isIgnored(fn)) return false;
    if (this.options.allowNamedFunctions && this.isNamedFunction(fn)) return false;
    if (!this.options.disallowPrototype && this.isPrototypeAssignment(fn)) return false;
    if (this.options.singleReturnOnly && !this.returnsImmediately(fn)) return false;
    if (this.isObjectProperty(fn) && this.options.allowObjectProperties) return false;
    if (this.hasNameAndIsExportedAsDefaultExport(fn)) return false;
    return true;
  }
}
