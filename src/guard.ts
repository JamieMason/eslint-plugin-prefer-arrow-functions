import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AnyFunction, AnyFunctionBody, GeneratorFunction, NamedFunction, Scope, WithTypeParameters } from './config';

export class Guard {
  isTsx: Scope['isTsx'];
  options: Scope['options'];
  sourceCode: Scope['sourceCode'];
  private constructorUsages: Set<string> | null = null;

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
        previousNode.declaration?.type === AST_NODE_TYPES.TSDeclareFunction) ||
      this.isOverloadedClassMethod(fn)
    );
  }

  /** A class method with separate overload signatures cannot be rewritten as a class property */
  private isOverloadedClassMethod(fn: AnyFunction): boolean {
    const method = fn.parent;
    if (method.type !== AST_NODE_TYPES.MethodDefinition) return false;
    const classBody = method.parent;
    if (classBody.type !== AST_NODE_TYPES.ClassBody) return false;
    const name = this.getStaticKeyName(method.key, method.computed);
    if (name === null) return false;
    return classBody.body.some(
      (member) =>
        member !== method &&
        member.type === AST_NODE_TYPES.MethodDefinition &&
        member.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression &&
        member.static === method.static &&
        this.getStaticKeyName(member.key, member.computed) === name,
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

  /**
   * Whether any node in fn's own function scope matches. Nested plain functions, class field
   * initializers and static blocks own their own this/arguments/super/new.target so they are not
   * searched; arrow functions inherit them from fn so they are. Computed keys and decorators of
   * nested class members evaluate in the enclosing scope and are searched.
   */
  private containsInOwnScope(fn: AnyFunction, isMatch: (node: TSESTree.Node) => boolean): boolean {
    const isNode = (value: unknown): value is TSESTree.Node =>
      Boolean(value && typeof value === 'object' && 'type' in value);
    const visit = (node: TSESTree.Node): boolean => {
      if (isMatch(node)) return true;
      if (
        node !== fn &&
        (node.type === AST_NODE_TYPES.FunctionDeclaration || node.type === AST_NODE_TYPES.FunctionExpression)
      ) {
        return false;
      }
      if (node.type === AST_NODE_TYPES.StaticBlock) return false;
      if (node.type === AST_NODE_TYPES.PropertyDefinition || node.type === AST_NODE_TYPES.AccessorProperty) {
        return [...node.decorators, node.computed ? node.key : null].some((child) => child !== null && visit(child));
      }
      for (const key in node) {
        if (key === 'parent' || key === 'range' || key === 'loc') continue;
        const child = node[key as keyof TSESTree.Node];
        if (Array.isArray(child)) {
          for (const item of child) {
            if (isNode(item) && visit(item)) return true;
          }
        } else if (isNode(child) && visit(child)) {
          return true;
        }
      }
      return false;
    };
    return visit(fn);
  }

  containsOwnThis(fn: AnyFunction): boolean {
    return this.containsInOwnScope(fn, (node) => node.type === AST_NODE_TYPES.ThisExpression);
  }

  containsOwnSuper(fn: AnyFunction): boolean {
    return this.containsInOwnScope(fn, (node) => node.type === AST_NODE_TYPES.Super);
  }

  containsOwnNewDotTarget(fn: AnyFunction): boolean {
    return this.containsInOwnScope(
      fn,
      (node) =>
        node.type === AST_NODE_TYPES.MetaProperty && node.meta.name === 'new' && node.property.name === 'target',
    );
  }

  containsOwnArguments(fn: AnyFunction): boolean {
    return this.containsInOwnScope(fn, (node) => {
      if (node.type !== AST_NODE_TYPES.Identifier || node.name !== 'arguments') return false;
      const { parent } = node;
      // a non-computed key or member property named arguments is not the arguments object
      if (parent.type === AST_NODE_TYPES.MemberExpression && parent.property === node && !parent.computed) {
        return false;
      }
      if (
        (parent.type === AST_NODE_TYPES.Property ||
          parent.type === AST_NODE_TYPES.PropertyDefinition ||
          parent.type === AST_NODE_TYPES.AccessorProperty ||
          parent.type === AST_NODE_TYPES.MethodDefinition) &&
        parent.key === node &&
        !parent.computed
      ) {
        return false;
      }
      // labels are not variable references
      if (
        (parent.type === AST_NODE_TYPES.LabeledStatement ||
          parent.type === AST_NODE_TYPES.BreakStatement ||
          parent.type === AST_NODE_TYPES.ContinueStatement) &&
        parent.label === node
      ) {
        return false;
      }
      return true;
    });
  }

  hasThisParameter(fn: AnyFunction): boolean {
    if (fn.params.length === 0) {
      return false;
    }

    const [firstParam] = fn.params;

    if (firstParam.type === AST_NODE_TYPES.Identifier) {
      return firstParam.name === 'this';
    }

    if (
      firstParam.type === AST_NODE_TYPES.TSParameterProperty &&
      firstParam.parameter.type === AST_NODE_TYPES.Identifier
    ) {
      return firstParam.parameter.name === 'this';
    }

    return false;
  }

  /** A named function expression whose body references its own name needs that binding, which conversion deletes */
  isSelfReferencingFunctionExpression(fn: AnyFunction): boolean {
    if (!this.isNamedFunctionExpression(fn)) return false;
    const nameVariable = this.sourceCode
      .getDeclaredVariables(fn)
      .find((variable) => variable.defs.some((def) => def.type === 'FunctionName' && def.node === fn));
    return Boolean(nameVariable && nameVariable.references.length > 0);
  }

  /** The variable created by a named function declaration */
  private getDeclarationVariable(fn: NamedFunction): TSESLint.Scope.Variable | null {
    return this.sourceCode.getDeclaredVariables(fn).find((variable) => variable.name === fn.id.name) ?? null;
  }

  /** Whether a reference runs during initial evaluation of its module/script, rather than inside a deferred function body */
  private isEagerReference(reference: TSESLint.Scope.Reference): boolean {
    let node: TSESTree.Node | undefined = reference.identifier.parent;
    while (node) {
      if (this.isAnyFunction(node)) return false;
      node = node.parent;
    }
    return true;
  }

  /** An `if`/`else` body or LabelledItem may hold a declaration in sloppy code (Annex B.3.3, B.3.4), but not a const */
  private hasNoStatementList(fn: NamedFunction): boolean {
    switch (fn.parent.type) {
      case AST_NODE_TYPES.Program:
      case AST_NODE_TYPES.BlockStatement:
      case AST_NODE_TYPES.StaticBlock:
      case AST_NODE_TYPES.SwitchCase:
      case AST_NODE_TYPES.TSModuleBlock:
      case AST_NODE_TYPES.ExportNamedDeclaration:
      case AST_NODE_TYPES.ExportDefaultDeclaration:
        return false;
      default:
        return true;
    }
  }

  /** Converting `function foo() {}` to `const foo = () => {}` changes how the name binds: reject uses const cannot satisfy */
  declarationBindingWouldBreak(fn: AnyFunction): boolean {
    if (!this.isNamedFunctionDeclaration(fn)) return false;
    if (this.hasNoStatementList(fn)) return true;
    const variable = this.getDeclarationVariable(fn);
    if (!variable) return false;
    return (
      this.isUsedBeforeDefined(fn, variable) ||
      this.isIncompatibleWithConst(variable) ||
      this.isBlockLeakUsedOutside(fn, variable)
    );
  }

  /** const removes hoisting: code above the declaration which eagerly uses the name would hit the TDZ */
  private isUsedBeforeDefined(fn: NamedFunction, variable: TSESLint.Scope.Variable): boolean {
    return variable.references.some(
      (reference) => reference.identifier.range[0] < fn.range[0] && this.isEagerReference(reference),
    );
  }

  /** redeclaring a const is a SyntaxError, assigning to one a TypeError, and an arrow cannot be called with new */
  private isIncompatibleWithConst(variable: TSESLint.Scope.Variable): boolean {
    if (variable.defs.length > 1) return true;
    return variable.references.some((reference) => {
      const { parent } = reference.identifier;
      if (parent?.type === AST_NODE_TYPES.NewExpression && parent.callee === reference.identifier) return true;
      return reference.isWrite();
    });
  }

  /** In sloppy scripts a function declared in a block leaks a binding outside it (Annex B), which const would not */
  private isBlockLeakUsedOutside(fn: NamedFunction, variable: TSESLint.Scope.Variable): boolean {
    const scopeType: string = variable.scope.type;
    if (scopeType === 'global' || scopeType === 'module' || scopeType === 'function') return false;
    // any unresolved use of the same name elsewhere in the file may reach this declaration via the leaked binding
    let scope: TSESLint.Scope.Scope | null = variable.scope.upper;
    while (scope) {
      if (scope.through.some((reference) => reference.identifier.name === fn.id.name)) return true;
      scope = scope.upper;
    }
    return false;
  }

  /** Arrow functions cannot be constructed: reject functions in positions which require a constructor */
  isConstructedValue(fn: AnyFunction): boolean {
    const { parent } = fn;
    return (
      (parent.type === AST_NODE_TYPES.NewExpression && parent.callee === fn) ||
      ((parent.type === AST_NODE_TYPES.ClassDeclaration || parent.type === AST_NODE_TYPES.ClassExpression) &&
        parent.superClass === fn)
    );
  }

  private eachNode(root: TSESTree.Node, visit: (node: TSESTree.Node) => void): void {
    const isNode = (value: unknown): value is TSESTree.Node =>
      Boolean(value && typeof value === 'object' && 'type' in value);
    const stack: TSESTree.Node[] = [root];
    while (stack.length > 0) {
      const node = stack.pop() as TSESTree.Node;
      visit(node);
      for (const key in node) {
        if (key === 'parent' || key === 'range' || key === 'loc' || key === 'tokens' || key === 'comments') continue;
        const child = node[key as keyof TSESTree.Node];
        if (Array.isArray(child)) {
          for (const item of child) if (isNode(item)) stack.push(item);
        } else if (isNode(child)) {
          stack.push(child);
        }
      }
    }
  }

  /** Source text without whitespace, so that `m.Foo` and `m . Foo` compare equal */
  private normalizeText(node: TSESTree.Node): string {
    return this.sourceCode.getText(node).replace(/\s+/g, '');
  }

  /** Every expression in the file which is constructed, extended, or has its prototype read */
  private getConstructorUsages(): Set<string> {
    if (this.constructorUsages) return this.constructorUsages;
    const usages = new Set<string>();
    this.eachNode(this.sourceCode.ast, (node) => {
      if (node.type === AST_NODE_TYPES.NewExpression) {
        usages.add(this.normalizeText(node.callee));
      } else if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === 'instanceof') {
        usages.add(this.normalizeText(node.right));
      } else if (
        (node.type === AST_NODE_TYPES.ClassDeclaration || node.type === AST_NODE_TYPES.ClassExpression) &&
        node.superClass
      ) {
        usages.add(this.normalizeText(node.superClass));
      } else if (
        node.type === AST_NODE_TYPES.MemberExpression &&
        !node.computed &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        node.property.name === 'prototype'
      ) {
        usages.add(this.normalizeText(node.object));
      }
    });
    this.constructorUsages = usages;
    return usages;
  }

  /** The source text a function will be reachable by once converted, when statically known */
  private getBindingText(fn: AnyFunction): string | null {
    if (this.isNamedFunctionDeclaration(fn)) return fn.id.name;
    const { parent } = fn;
    if (parent.type === AST_NODE_TYPES.VariableDeclarator && parent.init === fn) {
      return parent.id.type === AST_NODE_TYPES.Identifier ? parent.id.name : null;
    }
    if (
      parent.type === AST_NODE_TYPES.AssignmentExpression &&
      parent.right === fn &&
      (parent.left.type === AST_NODE_TYPES.Identifier || parent.left.type === AST_NODE_TYPES.MemberExpression)
    ) {
      return this.normalizeText(parent.left);
    }
    return null;
  }

  /** Arrows have no [[Construct]] and no "prototype": reject bindings which need either */
  isUsedAsConstructor(fn: AnyFunction): boolean {
    const bindingText = this.getBindingText(fn);
    if (bindingText === null) return false;
    return this.getConstructorUsages().has(bindingText);
  }

  /** Whether the function already has wrapping parentheses of its own in the source */
  isParenthesized(node: TSESTree.Node): boolean {
    const before = this.sourceCode.getTokenBefore(node);
    const after = this.sourceCode.getTokenAfter(node);
    return (
      before !== null &&
      after !== null &&
      before.type === 'Punctuator' &&
      before.value === '(' &&
      after.type === 'Punctuator' &&
      after.value === ')'
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

  /** Whether a function, or the member owning it, is a member of a class body: nesting inside one is not enough (issue #72) */
  isClassMember(node: TSESTree.Node): boolean {
    const member = this.isAnyFunction(node) ? node.parent : node;
    return member?.parent?.type === AST_NODE_TYPES.ClassBody;
  }

  isNamedFunction(fn: AnyFunction): fn is NamedFunction {
    return fn.id !== null && fn.id.name !== null;
  }

  isNamedFunctionExpression(fn: AnyFunction): fn is NamedFunction & TSESTree.FunctionExpression {
    return fn.type === AST_NODE_TYPES.FunctionExpression && this.isNamedFunction(fn);
  }

  isNamedFunctionDeclaration(fn: AnyFunction): fn is NamedFunction & TSESTree.FunctionDeclaration {
    return fn.type === AST_NODE_TYPES.FunctionDeclaration && this.isNamedFunction(fn);
  }

  hasNameAndIsExportedAsDefaultExport(fn: AnyFunction): fn is NamedFunction {
    return this.isNamedFunction(fn) && fn.parent.type === AST_NODE_TYPES.ExportDefaultDeclaration;
  }

  /** Resolve a member key or member expression property to a name, when statically known */
  private getStaticKeyName(key: TSESTree.Expression | TSESTree.PrivateIdentifier, computed: boolean): string | null {
    if (key.type === AST_NODE_TYPES.PrivateIdentifier) return `#${key.name}`;
    if (!computed && key.type === AST_NODE_TYPES.Identifier) return key.name;
    if (key.type === AST_NODE_TYPES.Literal) return String(key.value);
    if (key.type === AST_NODE_TYPES.TemplateLiteral && key.expressions.length === 0) {
      return key.quasis[0].value.cooked;
    }
    return null;
  }

  /** `{ __proto__() {} }` defines an own property, where `{ __proto__: value }` sets the prototype (Annex B.3.1) */
  isProtoShorthandMethod(node: TSESTree.Node): boolean {
    const member = this.isAnyFunction(node) ? node.parent : node;
    return (
      member?.type === AST_NODE_TYPES.Property &&
      member.method &&
      !member.computed &&
      this.getStaticKeyName(member.key, member.computed) === '__proto__'
    );
  }

  /** The name an anonymous function expression is bound to in its enclosing context, when statically known */
  private getContextualName(fn: TSESTree.FunctionExpression): string | null {
    const { parent } = fn;
    switch (parent.type) {
      case AST_NODE_TYPES.MethodDefinition:
      case AST_NODE_TYPES.PropertyDefinition:
      case AST_NODE_TYPES.AccessorProperty:
        return this.getStaticKeyName(parent.key, parent.computed);
      case AST_NODE_TYPES.Property:
        return parent.value === fn ? this.getStaticKeyName(parent.key, parent.computed) : null;
      case AST_NODE_TYPES.VariableDeclarator:
        return parent.id.type === AST_NODE_TYPES.Identifier ? parent.id.name : null;
      case AST_NODE_TYPES.AssignmentExpression:
        if (parent.right !== fn) return null;
        if (parent.left.type === AST_NODE_TYPES.Identifier) return parent.left.name;
        if (parent.left.type === AST_NODE_TYPES.MemberExpression) {
          return this.getStaticKeyName(parent.left.property, parent.left.computed);
        }
        return null;
      default:
        return null;
    }
  }

  isIgnored(fn: AnyFunction): boolean {
    const names = [
      this.isNamedFunction(fn) ? fn.id.name : null,
      fn.type === AST_NODE_TYPES.FunctionExpression ? this.getContextualName(fn) : null,
    ];
    return names.some((name) => name !== null && this.options.allowedNames.includes(name));
  }

  isObjectProperty(fn: AnyFunction): boolean {
    return this.sourceCode
      .getAncestors(fn)
      .reverse()
      .some((ancestor) => {
        return ancestor.type === AST_NODE_TYPES.Property;
      });
  }

  /** this, arguments, super or new.target would refer to something else after conversion to an arrow */
  private ownBindingsWouldChange(fn: AnyFunction): boolean {
    // restyling an arrow function cannot change what any of them refer to
    if (fn.type === AST_NODE_TYPES.ArrowFunctionExpression) return false;
    return (
      this.containsOwnThis(fn) ||
      this.containsOwnSuper(fn) ||
      this.containsOwnArguments(fn) ||
      this.containsOwnNewDotTarget(fn) ||
      this.hasThisParameter(fn)
    );
  }

  isSafeTransformation(fn: TSESTree.Node): fn is AnyFunction {
    if (!this.isAnyFunction(fn)) return false;
    if (this.isGeneratorFunction(fn)) return false;
    if (this.isAssertionFunction(fn)) return false;
    if (this.isOverloadedFunction(fn)) return false;
    if (this.ownBindingsWouldChange(fn)) return false;
    if (this.isConstructedValue(fn)) return false;
    if (this.isUsedAsConstructor(fn)) return false;
    if (this.isSelfReferencingFunctionExpression(fn)) return false;
    if (this.declarationBindingWouldBreak(fn)) return false;
    if (this.isIgnored(fn)) return false;
    if (this.options.allowNamedFunctions === true && this.isNamedFunction(fn)) return false;
    if (this.options.allowNamedFunctions === 'only-expressions' && this.isNamedFunctionExpression(fn)) return false;
    if (!this.options.disallowPrototype && this.isPrototypeAssignment(fn)) return false;
    if (this.options.singleReturnOnly && !this.returnsImmediately(fn)) return false;
    if (this.isObjectProperty(fn) && this.options.allowObjectProperties) return false;
    if (this.hasNameAndIsExportedAsDefaultExport(fn)) return false;
    return true;
  }
}
