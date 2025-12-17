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
      const firstStatementInFunction = body.body[0];
      const firstStatementValue = firstStatementInFunction.argument;

      // Get a comment after an opening brace and before a first statement in a function
      const commentBeforeFirstStatement = this.sourceCode.getCommentsBefore(firstStatementInFunction)[0];

      const bodySource = this.sourceCode.getText(firstStatementValue);
      const wrappedBodySource =
        firstStatementValue.type === AST_NODE_TYPES.ObjectExpression ? `(${bodySource})` : bodySource;

      // Get a text of a comment after an opening brace in a function if this comment exists
      if (!commentBeforeFirstStatement) {
        return wrappedBodySource;
      }
      const commentBeforeFirstStatementText = this.sourceCode.getText(commentBeforeFirstStatement);

      /* Return a function body with a comment before it.

      This method adds line breaks before and after a comment. Reasons:

      1. If a comment is single-line, a new line after this comment is required, because
      a comment in the same line as a first statement of a function is incorrect syntax.

      2. A new line before a comment added, because otherwise JavaScript beautifiers
      may prettify a comment not in the best way. */
      return `\n${commentBeforeFirstStatementText}\n${wrappedBodySource}`;
    }
    if (this.guard.hasImplicitReturn(body) && this.options.returnStyle !== 'implicit') {
      return `{ return ${this.sourceCode.getText(body)} }`;
    }
    return this.sourceCode.getText(body);
  }

  getParamsSource(params: TSESTree.Parameter[]): string[] {
    return params.map((param) => {
      // Get a parameter value
      const parameterText = this.sourceCode.getText(param);

      // Get a comment before a parameter if exists
      const commentBeforeParameter = this.sourceCode.getCommentsBefore(param)[0];
      const commentBeforeParameterText = commentBeforeParameter ? this.sourceCode.getText(commentBeforeParameter) : '';

      // Get a comment after a parameter if exists
      const commentAfterParameter = this.sourceCode.getCommentsAfter(param)[0];
      const commentAfterParameterText = commentAfterParameter ? this.sourceCode.getText(commentAfterParameter) : '';

      // Return a parameter with comments before and after it
      return `${commentBeforeParameterText}${parameterText}${commentAfterParameterText}`;
    });
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

    /* Get all comments of a function:

    1. Comments after parameters
    2. Comments between parameters and a function body
    3. Comments inside a function body */
    const allFunctionComments = this.sourceCode.getCommentsInside(node);

    let preservedCommentText = '';

    // Checking if comments exists instead of using the “find()” method everywhere for improving performance
    if (allFunctionComments[0]) {
      /* Find a comment between parameters and a function body.

      It’s possible to get the value of the “commentBetweenParametersAndFunctionBodyText”
      use more simple way, but if a JavaScript function contain not solely a comment
      between parameters and a function body, eslint-plugin-prefer-arrow-functions may work incorrectly.
      Therefore, I use the method “getCommentsInside(node)”. */
      const commentBetweenParametersAndFunctionBody = allFunctionComments.find((candidateComment) => {
        // Get the start position of a candidate comment
        const candidateCommentStartPosition = candidateComment.range[0];

        // Get the position of the closing parenthesis after parameters if parameters exist or no
        const parametersClosingParenthesisPosition = node.params[0]
          ? /* Use the old “length()” property instead of the modern method “at()”,
          because in TypeScript “at()” usage isn’t simple:
          https://github.com/microsoft/TypeScript/issues/57224 */
            node.params[node.params.length - 1].range[1] + 1
          : node.range[0] + 1;

        // Get the position of the opening brace of a function body
        const functionBodyOpeningBracePosition = node.body.range[0];

        // Keep a comment between parameters and a function body if exists
        return (
          candidateCommentStartPosition > parametersClosingParenthesisPosition &&
          candidateCommentStartPosition < functionBodyOpeningBracePosition
        );
      });

      /* If a comment between parameters and a function body exists,
      get its text and convert it to a single-line comment if it’s a multiline */
      if (commentBetweenParametersAndFunctionBody) {
        let commentBetweenParametersAndFunctionBodyText = this.sourceCode.getText(
          commentBetweenParametersAndFunctionBody,
        );

        // Check if a comment is multiline
        if (commentBetweenParametersAndFunctionBodyText.includes('\n')) {
          /* Convert a multiline comment with line breaks to a single-line (replace line breaks with spaces),
          because JavaScript doesn’t support a multiline comment before a fat arrow. */
          commentBetweenParametersAndFunctionBodyText = commentBetweenParametersAndFunctionBodyText
            .split(/\r?\n/)
            .map((commentLine) => commentLine.trim())
            .join(' ');
        }

        preservedCommentText = commentBetweenParametersAndFunctionBodyText;
      }
    }

    const arrowFunction = `${ASYNC}${GENERIC}(${PARAMS})${preservedCommentText}${RETURN_TYPE} => ${BODY}`;

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
