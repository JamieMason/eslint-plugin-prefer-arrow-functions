import {
  DEFAULT_OPTIONS,
  USE_ARROW_WHEN_FUNCTION,
  USE_ARROW_WHEN_SINGLE_RETURN,
  USE_EXPLICIT,
  USE_IMPLICIT,
} from './config';

export default {
  meta: {
    docs: {
      category: 'emcascript6',
      description: 'prefer arrow functions',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowNamedFunctions: { type: 'boolean' },
          classPropertiesAllowed: { type: 'boolean' },
          disallowPrototype: { type: 'boolean' },
          returnStyle: {
            default: DEFAULT_OPTIONS.returnStyle,
            pattern: '^(explicit|implicit|unchanged)$',
            type: 'string',
          },
          singleReturnOnly: { type: 'boolean' },
        },
        type: 'object',
      },
    ],
  },
  create: (context) => {
    const options = context.options[0] || {};
    const getOption = (name) =>
      typeof options[name] !== 'undefined'
        ? options[name]
        : DEFAULT_OPTIONS[name];
    const allowNamedFunctions = getOption('allowNamedFunctions');
    const singleReturnOnly = getOption('singleReturnOnly');
    const classPropertiesAllowed = getOption('classPropertiesAllowed');
    const disallowPrototype = getOption('disallowPrototype');
    const returnStyle = getOption('returnStyle');
    const sourceCode = context.getSourceCode();

    const isBlockStatementWithSingleReturn = (node) => {
      return (
        node.body.body &&
        node.body.body.length === 1 &&
        node.body.body[0].type === 'ReturnStatement'
      );
    };

    const isImplicitReturn = (node) => {
      return node.body && !node.body.body;
    };

    const returnsImmediately = (node) => {
      return isBlockStatementWithSingleReturn(node) || isImplicitReturn(node);
    };

    const getBodySource = (node) => {
      if (
        isBlockStatementWithSingleReturn(node) &&
        returnStyle !== 'explicit'
      ) {
        const returnValue = node.body.body[0].argument;
        const source = sourceCode.getText(returnValue);
        return returnValue.type === 'ObjectExpression' ? `(${source})` : source;
      }
      if (isImplicitReturn(node) && returnStyle !== 'implicit') {
        return `{ return ${sourceCode.getText(node.body)} }`;
      }
      return sourceCode.getText(node.body);
    };

    const getParamsSource = (params) =>
      params.map((param) => sourceCode.getText(param));

    const getFunctionName = (node) =>
      node && node.id && node.id.name ? node.id.name : '';

    const getPreviousNode = (node) => {
      if (isNamedExport(node)) {
        node = node.parent;
      }

      if (!Array.isArray(node.parent.body)) return null;

      const nodeIndex = node.parent.body.indexOf(node);
      if (nodeIndex === 0) return null;

      return node.parent.body[nodeIndex - 1];
    };

    const isGenericFunction = (node) => Boolean(node.typeParameters);
    const getGenericSource = (node) => sourceCode.getText(node.typeParameters);
    const isAsyncFunction = (node) => node.async === true;
    const isGeneratorFunction = (node) => node.generator === true;
    const isAssertionFunction = (node) =>
      node.returnType &&
      node.returnType.typeAnnotation &&
      node.returnType.typeAnnotation.asserts;
    const isOverloadedFunction = (node) => {
      const previousNode = getPreviousNode(node);

      if (!previousNode) return false;
      if (previousNode.type === 'TSDeclareFunction') return true;
      if (
        previousNode.type === 'ExportNamedDeclaration' &&
        previousNode.declaration.type === 'TSDeclareFunction'
      )
        return true;

      return false;
    };

    const getReturnType = (node) =>
      node.returnType &&
      node.returnType.range &&
      sourceCode.getText().substring(...node.returnType.range);

    const containsToken = (type, value, node) => {
      return sourceCode
        .getTokens(node)
        .some((token) => token.type === type && token.value === value);
    };

    const containsSuper = (node) => {
      return containsToken('Keyword', 'super', node);
    };

    const containsThis = (node) => {
      return containsToken('Keyword', 'this', node);
    };

    const containsArguments = (node) => {
      return containsToken('Identifier', 'arguments', node);
    };

    const containsTokenSequence = (sequence, node) => {
      return sourceCode.getTokens(node).some((_, tokenIndex, tokens) => {
        return sequence.every(([expectedType, expectedValue], i) => {
          const actual = tokens[tokenIndex + i];
          return (
            actual &&
            actual.type === expectedType &&
            actual.value === expectedValue
          );
        });
      });
    };

    const containsNewDotTarget = (node) => {
      return containsTokenSequence(
        [
          ['Keyword', 'new'],
          ['Punctuator', '.'],
          ['Identifier', 'target'],
        ],
        node,
      );
    };

    const writeArrowFunction = (node) => {
      const { body, isAsync, isGeneric, generic, params, returnType } =
        getFunctionDescriptor(node);
      return 'ASYNC<GENERIC>(PARAMS)RETURN_TYPE => BODY'
        .replace('ASYNC', isAsync ? 'async ' : '')
        .replace('<GENERIC>', isGeneric ? generic : '')
        .replace('BODY', body)
        .replace('RETURN_TYPE', returnType ? returnType : '')
        .replace('PARAMS', params.join(', '));
    };

    const writeArrowConstant = (node) => {
      const { name } = getFunctionDescriptor(node);
      return 'const NAME = ARROW_FUNCTION'
        .replace('NAME', name)
        .replace('ARROW_FUNCTION', writeArrowFunction(node));
    };

    const getFunctionDescriptor = (node) => {
      return {
        body: getBodySource(node),
        isAsync: isAsyncFunction(node),
        isGenerator: isGeneratorFunction(node),
        isGeneric: isGenericFunction(node),
        name: getFunctionName(node),
        generic: getGenericSource(node),
        params: getParamsSource(node.params),
        returnType: getReturnType(node),
      };
    };

    const isPrototypeAssignment = (node) => {
      return context
        .getAncestors()
        .reverse()
        .some((ancestor) => {
          const isPropertyOfReplacementPrototypeObject =
            ancestor.type === 'AssignmentExpression' &&
            ancestor.left &&
            ancestor.left.property &&
            ancestor.left.property.name === 'prototype';
          const isMutationOfExistingPrototypeObject =
            ancestor.type === 'AssignmentExpression' &&
            ancestor.left &&
            ancestor.left.object &&
            ancestor.left.object.property &&
            ancestor.left.object.property.name === 'prototype';
          return (
            isPropertyOfReplacementPrototypeObject ||
            isMutationOfExistingPrototypeObject
          );
        });
    };

    const isWithinClassBody = (node) => {
      return context
        .getAncestors()
        .reverse()
        .some((ancestor) => {
          return ancestor.type === 'ClassBody';
        });
    };

    const isNamed = (node) => node.id && node.id.name;

    const isNamedDefaultExport = (node) =>
      isNamed(node) && node.parent.type === 'ExportDefaultDeclaration';

    const isNamedExport = (node) =>
      node.parent.type === 'ExportNamedDeclaration';

    const isSafeTransformation = (node) => {
      return (
        !isGeneratorFunction(node) &&
        !isAssertionFunction(node) &&
        !isOverloadedFunction(node) &&
        !containsThis(node) &&
        !containsSuper(node) &&
        !containsArguments(node) &&
        !containsNewDotTarget(node) &&
        (!isNamed(node) || !allowNamedFunctions) &&
        (!isPrototypeAssignment(node) || disallowPrototype) &&
        (!singleReturnOnly ||
          (returnsImmediately(node) && !isNamedDefaultExport(node)))
      );
    };

    const getMessage = (node) => {
      return singleReturnOnly && returnsImmediately(node)
        ? USE_ARROW_WHEN_SINGLE_RETURN
        : USE_ARROW_WHEN_FUNCTION;
    };

    return {
      'ExportDefaultDeclaration > FunctionDeclaration': (node) => {
        if (isSafeTransformation(node)) {
          context.report({
            fix: (fixer) =>
              fixer.replaceText(node, writeArrowFunction(node) + ';'),
            message: getMessage(node),
            node,
          });
        }
      },
      ':matches(ClassProperty, MethodDefinition, Property)[key.name][value.type="FunctionExpression"][kind!=/^(get|set)$/]':
        (node) => {
          const propName = node.key.name;
          const functionNode = node.value;
          if (
            isSafeTransformation(functionNode) &&
            (!isWithinClassBody(functionNode) || classPropertiesAllowed)
          ) {
            context.report({
              fix: (fixer) =>
                fixer.replaceText(
                  node,
                  isWithinClassBody(node)
                    ? `${propName} = ${writeArrowFunction(functionNode)};`
                    : `${propName}: ${writeArrowFunction(functionNode)}`,
                ),
              message: getMessage(functionNode),
              node: functionNode,
            });
          }
        },
      'ArrowFunctionExpression[body.type!="BlockStatement"]': (node) => {
        if (returnStyle === 'explicit' && isSafeTransformation(node)) {
          context.report({
            fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
            message: USE_EXPLICIT,
            node,
          });
        }
      },
      'ArrowFunctionExpression[body.body.length=1][body.body.0.type="ReturnStatement"]':
        (node) => {
          if (returnStyle === 'implicit' && isSafeTransformation(node)) {
            context.report({
              fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
              message: USE_IMPLICIT,
              node,
            });
          }
        },
      'FunctionExpression[parent.type!=/^(ClassProperty|MethodDefinition|Property)$/]':
        (node) => {
          if (isSafeTransformation(node)) {
            context.report({
              fix: (fixer) => fixer.replaceText(node, writeArrowFunction(node)),
              message: getMessage(node),
              node,
            });
          }
        },
      'FunctionDeclaration[parent.type!="ExportDefaultDeclaration"]': (
        node,
      ) => {
        if (isSafeTransformation(node)) {
          context.report({
            fix: (fixer) =>
              fixer.replaceText(node, writeArrowConstant(node) + ';'),
            message: getMessage(node),
            node,
          });
        }
      },
    };
  },
};
