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
      return returnValue.type === AST_NODE_TYPES.ObjectExpression ? `(${source})` : source;
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
    if (!this.isTsx) return genericSource;
    const params = fn.typeParameters.params;
    if (params.length === 1) return `<${params[0].name.name},>`;
    return genericSource;
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
    if (this.needsParentheses(node)) {
      return `(${arrowFunction})`;
    }

    return arrowFunction;
  }

  writeArrowConstant(node: TSESTree.FunctionDeclaration): string {
    const fn = this.getFunctionDescriptor(node);
    return `const ${fn.name} = ${this.writeArrowFunction(node)}`;
  }

  needsParentheses(node: AnyFunction): boolean {
    const parent = node.parent;

    if (!parent) return false;

    // If the function is the right operand of a binary expression or logical expression
    if (
      (parent.type === AST_NODE_TYPES.BinaryExpression || parent.type === AST_NODE_TYPES.LogicalExpression) &&
      parent.right === node
    ) {
      return true;
    }

    // If the function is the left operand of most binary expressions (except assignment-like)
    if (
      (parent.type === AST_NODE_TYPES.BinaryExpression || parent.type === AST_NODE_TYPES.LogicalExpression) &&
      parent.left === node
    ) {
      // Don't add parentheses for assignment-like operators
      if (parent.operator === 'in' || parent.operator === 'instanceof') {
        return true;
      }
      // For other operators, we typically need parentheses on the left side too
      return ![AST_NODE_TYPES.AssignmentExpression].includes(parent.type);
    }

    // If the function is the test of a conditional expression (ternary ? part)
    if (parent.type === AST_NODE_TYPES.ConditionalExpression && parent.test === node) {
      return true;
    }

    // If the function is the consequent of a conditional expression (ternary middle part)
    // This doesn't need parentheses according to issue #37
    if (parent.type === AST_NODE_TYPES.ConditionalExpression && parent.consequent === node) {
      return false;
    }

    // Don't add parentheses for these contexts (as mentioned in issue #37):
    // - Right side of assignment =, +=, -=, etc.
    // - Right side of arrow function =>
    // - Right side of ternary :
    // - yield, yield*
    // - spread ...
    // - comma operator
    if (
      parent.type === AST_NODE_TYPES.AssignmentExpression ||
      parent.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      parent.type === AST_NODE_TYPES.YieldExpression ||
      parent.type === AST_NODE_TYPES.SpreadElement ||
      parent.type === AST_NODE_TYPES.SequenceExpression
    ) {
      return false;
    }

    // Right side of ternary doesn't need parentheses
    if (parent.type === AST_NODE_TYPES.ConditionalExpression && parent.alternate === node) {
      return false;
    }

    return false;
  }

  getFunctionDescriptor(node: AnyFunction) {
    return {
      body: this.getBodySource(node),
      isAsync: this.guard.isAsyncFunction(node),
      isGenerator: this.guard.isGeneratorFunction(node),
      isGeneric: this.guard.hasTypeParameters(node),
      name: this.getFunctionName(node),
      generic: this.getGenericSource(node),
      params: this.getParamsSource(node.params),
      returnType: this.getReturnType(node),
    };
  }
}
