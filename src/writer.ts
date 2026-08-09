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

  getBodySource(fn: AnyFunction): string {
    const returnValue = this.getEmittedBodyNode(fn);
    if (returnValue !== fn.body) {
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
    if (this.guard.hasImplicitReturn(fn.body) && this.options.returnStyle !== 'implicit') {
      return `{ return ${this.sourceCode.getText(fn.body)} }`;
    }
    return this.sourceCode.getText(fn.body);
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

  /**
   * The source region copied verbatim into the arrow as its parameter list and return type: from
   * after the function's name (or keyword) through the params and any return annotation, up to
   * where => will go. Copying it as-is preserves comments, eg Flow types (issue #24). Null when the
   * function has no parenthesized parameter list of its own (a bare single-param arrow).
   */
  private getSignatureBounds(fn: AnyFunction): { start: number; closeParen: TSESTree.Token; end: number } | null {
    const isArrow = fn.type === AST_NODE_TYPES.ArrowFunctionExpression;
    const arrowToken = isArrow
      ? this.sourceCode.getTokenBefore(fn.body, { filter: (t) => t.type === 'Punctuator' && t.value === '=>' })
      : null;
    if (isArrow && !arrowToken) return null;
    const end = arrowToken ? arrowToken.range[0] : fn.body.range[0];
    const closeParen = fn.returnType
      ? this.sourceCode.getTokenBefore(fn.returnType)
      : this.sourceCode.getTokenBefore(arrowToken ?? fn.body);
    if (!closeParen || closeParen.type !== 'Punctuator' || closeParen.value !== ')') return null;
    const openParen =
      fn.params.length > 0 ? this.sourceCode.getTokenBefore(fn.params[0]) : this.sourceCode.getTokenBefore(closeParen);
    if (!openParen || openParen.type !== 'Punctuator' || openParen.value !== '(') return null;
    // include comments between the name/keyword and the opening paren, eg Flow's `function /*:: <T> */(t)`
    const tokenBefore = this.sourceCode.getTokenBefore(openParen);
    const start = Math.max(fn.range[0], tokenBefore ? tokenBefore.range[1] : openParen.range[0]);
    return { start, closeParen, end };
  }

  getSignatureSource(fn: AnyFunction): string | null {
    const bounds = this.getSignatureBounds(fn);
    if (!bounds) return null;
    return this.sourceCode.getText().slice(bounds.start, bounds.end).trim();
  }

  /** No line break may appear between arrow params and =>: multiline return annotations or comments there are unfixable */
  signatureBreaksArrowRestriction(fn: AnyFunction): boolean {
    const bounds = this.getSignatureBounds(fn);
    if (!bounds) return false;
    const afterParams = this.sourceCode.getText().slice(bounds.closeParen.range[1], bounds.end).trimEnd();
    return /[\r\n\u2028\u2029]/.test(afterParams);
  }

  writeArrowFunction(node: AnyFunction): string {
    const fn = this.getFunctionDescriptor(node);
    const ASYNC = fn.isAsync ? 'async ' : '';
    const GENERIC = fn.isGeneric ? fn.generic : '';
    const BODY = fn.body;
    const RETURN_TYPE = fn.returnType ? fn.returnType : '';
    const SIGNATURE = this.getSignatureSource(node) ?? `(${fn.params.join(', ')})${RETURN_TYPE}`;
    const arrowFunction = `${ASYNC}${GENERIC}${SIGNATURE} => ${BODY}`;

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
      // The operand of a type assertion, eg `() => {} as T` would parse `as T` as part of the body
      case AST_NODE_TYPES.TSAsExpression:
      case AST_NODE_TYPES.TSSatisfiesExpression:
      case AST_NODE_TYPES.TSNonNullExpression:
        return parent.expression === node;
      default:
        return false;
    }
  }

  /** The node whose source becomes the arrow's body: the returned expression when collapsing, else the body */
  private getEmittedBodyNode(fn: AnyFunction): TSESTree.Node {
    if (this.options.returnStyle !== 'explicit' && this.guard.isBlockStatementWithSingleReturn(fn.body)) {
      const argument = fn.body.body[0].argument;
      // keep the block instead of collapsing when comments live outside the returned expression
      const commentsOutsideArgument = this.sourceCode
        .getCommentsInside(fn.body)
        .some((comment) => comment.range[0] < argument.range[0] || comment.range[1] > argument.range[1]);
      if (!commentsOutsideArgument) return argument;
    }
    return fn.body;
  }

  /** Whether fixing would silently delete comments, because they lie outside the regions the rewrite copies verbatim */
  willDropComments(
    fn: AnyFunction,
    container: TSESTree.Node = fn,
    alsoEmitted: (TSESTree.Node | null)[] = [],
  ): boolean {
    const copiedRanges: TSESTree.Range[] = [];
    for (const node of alsoEmitted) if (node) copiedRanges.push(node.range);
    if (fn.typeParameters) copiedRanges.push(fn.typeParameters.range);
    const signature = this.getSignatureBounds(fn);
    if (signature) {
      copiedRanges.push([signature.start, signature.end]);
    } else {
      for (const param of fn.params) copiedRanges.push(param.range);
      if (fn.returnType) copiedRanges.push(fn.returnType.range);
    }
    copiedRanges.push(this.getEmittedBodyNode(fn).range);
    return this.sourceCode
      .getCommentsInside(container)
      .some((comment) => !copiedRanges.some(([start, end]) => comment.range[0] >= start && comment.range[1] <= end));
  }

  /** A fix must neither delete comments nor put a line break between the arrow's params and => */
  cannotFixSafely(fn: AnyFunction, container: TSESTree.Node = fn, alsoEmitted: (TSESTree.Node | null)[] = []): boolean {
    return this.signatureBreaksArrowRestriction(fn) || this.willDropComments(fn, container, alsoEmitted);
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
