import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { AnyFunction, Scope } from './config';
import { Guard } from './guard';

export class Writer {
  guard: Guard;
  isTsx: Scope['isTsx'];
  options: Scope['options'];
  sourceCode: Scope['sourceCode'];

  constructor(scope: Scope, guard: Guard) {
    this.guard = guard;
    this.isTsx = scope.isTsx;
    this.options = scope.options;
    this.sourceCode = scope.sourceCode;
  }

  getBodySource({ body }: AnyFunction): string {
    if (this.options.returnStyle !== 'explicit' && this.guard.isBlockStatementWithSingleReturn(body)) {
      const returnValue = body.body[0].argument;
      const source = this.sourceCode.getText(returnValue);
      const needsWrapping =
        // an implicit return of an object literal would parse as a block statement
        returnValue.type === AST_NODE_TYPES.ObjectExpression ||
        // an unwrapped comma sequence would continue the enclosing statement
        returnValue.type === AST_NODE_TYPES.SequenceExpression ||
        // eg `return {a} = b` where parens around the source are not part of the node
        source.startsWith('{');
      return needsWrapping ? `(${source})` : source;
    }
    if (this.guard.hasImplicitReturn(body) && this.options.returnStyle !== 'implicit') {
      return `{ return ${this.sourceCode.getText(body)} }`;
    }
    return this.sourceCode.getText(body);
  }

  getParamsSource(params: TSESTree.Parameter[]): string[] {
    return params.map((param) => this.sourceCode.getText(param));
  }

  getFunctionName(node: AnyFunction): string {
    return node.id && node.id.name ? node.id.name : '';
  }

  getGenericSource(fn: AnyFunction): string {
    if (!this.guard.hasTypeParameters(fn)) return '';
    const genericSource = this.sourceCode.getText(fn.typeParameters);
    if (!this.isTsx || fn.typeParameters.params.length > 1) return genericSource;
    // a single type param in TSX needs a trailing comma so the arrow's generic can't parse as a JSX element
    const inner = genericSource.slice(1, -1).trimEnd();
    return `<${inner}${inner.endsWith(',') ? '' : ','}>`;
  }

  getReturnType(node: AnyFunction): string | undefined {
    return node.returnType && node.returnType.range && this.sourceCode.getText().substring(...node.returnType.range);
  }

  writeArrowFunction(node: AnyFunction): string {
    const fn = this.getFunctionDescriptor(node);
    const ASYNC = fn.isAsync ? 'async ' : '';
    const GENERIC = fn.isGeneric ? fn.generic : '';
    const BODY = fn.body;
    const RETURN_TYPE = fn.returnType ? fn.returnType : '';
    const PARAMS = fn.params.join(', ');
    const arrowFunction = `${ASYNC}${GENERIC}(${PARAMS})${RETURN_TYPE} => ${BODY}`;

    // Check if parentheses are needed due to operator precedence
    if (this.needsParentheses(node) && !this.guard.isParenthesized(node)) {
      return `(${arrowFunction})`;
    }

    return arrowFunction;
  }

  writeArrowConstant(node: TSESTree.FunctionDeclaration): string {
    const fn = this.getFunctionDescriptor(node);
    return `const ${fn.name} = ${this.writeArrowFunction(node)}`;
  }

  /** An arrow function is not valid in every expression position a plain function is: wrap it where needed */
  needsParentheses(node: AnyFunction): boolean {
    const parent = node.parent;

    if (!parent) return false;

    switch (parent.type) {
      // Either operand of a binary or logical expression
      case AST_NODE_TYPES.BinaryExpression:
      case AST_NODE_TYPES.LogicalExpression:
        return parent.left === node || parent.right === node;
      // The test of a ternary; its consequent and alternate are fine unwrapped (issue #37)
      case AST_NODE_TYPES.ConditionalExpression:
        return parent.test === node;
      // The function being called, e.g. an IIFE without wrapping parens
      case AST_NODE_TYPES.CallExpression:
        return parent.callee === node;
      // Property access on the function, e.g. function() {}.call(null)
      case AST_NODE_TYPES.MemberExpression:
        return parent.object === node;
      // The tag of a tagged template, e.g. function() {}`template`
      case AST_NODE_TYPES.TaggedTemplateExpression:
        return parent.tag === node;
      // The operand of typeof, void, !, delete, await, etc.
      case AST_NODE_TYPES.UnaryExpression:
      case AST_NODE_TYPES.AwaitExpression:
        return true;
      default:
        return false;
    }
  }

  /** Whether fixing would silently delete comments, because they lie outside the regions the rewrite copies verbatim */
  willDropComments(fn: AnyFunction, container: TSESTree.Node = fn, alsoEmitted: (TSESTree.Node | null)[] = []): boolean {
    const emittedBody =
      this.options.returnStyle !== 'explicit' && this.guard.isBlockStatementWithSingleReturn(fn.body)
        ? fn.body.body[0].argument
        : fn.body;
    const emitted: (TSESTree.Node | null | undefined)[] = [
      ...alsoEmitted,
      fn.typeParameters,
      ...fn.params,
      fn.returnType,
      emittedBody,
    ];
    const keptCount = emitted.reduce((sum, node) => (node ? sum + this.countCommentsInside(node) : sum), 0);
    return this.countCommentsInside(container) > keptCount;
  }

  private countCommentsInside(node: TSESTree.Node): number {
    return this.sourceCode.getCommentsInside(node).length;
  }

  getFunctionDescriptor(node: AnyFunction) {
    return {
      body: this.getBodySource(node),
      isAsync: this.guard.isAsyncFunction(node),
      isGeneric: this.guard.hasTypeParameters(node),
      name: this.getFunctionName(node),
      generic: this.getGenericSource(node),
      params: this.getParamsSource(node.params),
      returnType: this.getReturnType(node),
    };
  }
}
