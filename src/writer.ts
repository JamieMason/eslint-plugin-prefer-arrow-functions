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
    return `${ASYNC}${GENERIC}(${PARAMS})${RETURN_TYPE} => ${BODY}`;
  }

  writeArrowConstant(node: TSESTree.FunctionDeclaration): string {
    const fn = this.getFunctionDescriptor(node);
    return `const ${fn.name} = ${this.writeArrowFunction(node)}`;
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
