const {
  DEFAULT_OPTIONS,
  USE_ARROW_WHEN_SINGLE_RETURN,
  USE_ARROW_WHEN_FUNCTION,
  USE_EXPLICIT,
  USE_IMPLICIT
} = require('./config');

module.exports = {
  meta: {
    docs: {
      description: 'prefer arrow functions',
      category: 'emcascript6',
      recommended: false
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          disallowPrototype: {
            type: 'boolean'
          },
          singleReturnOnly: {
            type: 'boolean'
          },
          classPropertiesAllowed: {
            type: 'boolean'
          },
          returnStyle: {
            type: 'string',
            default: DEFAULT_OPTIONS.returnStyle,
            pattern: '^(explicit|implicit|unchanged)$'
          }
        },
        additionalProperties: false
      }
    ]
  },
  create: context => {
    const options = context.options[0] || {};
    const getOption = name =>
      typeof options[name] !== 'undefined'
        ? options[name]
        : DEFAULT_OPTIONS[name];
    const singleReturnOnly = getOption('singleReturnOnly');
    const classPropertiesAllowed = getOption('classPropertiesAllowed');
    const disallowPrototype = getOption('disallowPrototype');
    const returnStyle = getOption('returnStyle');
    const sourceCode = context.getSourceCode();

    const isBlockStatementWithSingleReturn = node => {
      return (
        node.body.body &&
        node.body.body.length === 1 &&
        node.body.body[0].type === 'ReturnStatement'
      );
    };

    const isImplicitReturn = node => {
      return node.body && !node.body.body;
    };

    const returnsImmediately = node => {
      return isBlockStatementWithSingleReturn(node) || isImplicitReturn(node);
    };

    const getBodySource = node => {
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

    const getParamsSource = params =>
      params.map(param => sourceCode.getText(param));
    const getFunctionName = node =>
      node && node.id && node.id.name ? node.id.name : '';
    const isAsyncFunction = node => node.async === true;
    const isGeneratorFunction = node => node.generator === true;

    const containsToken = (type, value, node) => {
      return sourceCode
        .getTokens(node)
        .some(token => token.type === type && token.value === value);
    };

    const containsSuper = node => {
      return containsToken('Keyword', 'super', node);
    };

    const containsThis = node => {
      return containsToken('Keyword', 'this', node);
    };

    const containsArguments = node => {
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

    const containsNewDotTarget = node => {
      return containsTokenSequence(
        [['Keyword', 'new'], ['Punctuator', '.'], ['Identifier', 'target']],
        node
      );
    };

    const writeArrowFunction = node => {
      const { body, isAsync, params } = getFunctionDescriptor(node);
      return 'ASYNC(PARAMS) => BODY'
        .replace('ASYNC', isAsync ? 'async ' : '')
        .replace('BODY', body)
        .replace('PARAMS', params.join(', '));
    };

    const writeArrowConstant = node => {
      const { name } = getFunctionDescriptor(node);
      return 'const NAME = ARROW_FUNCTION'
        .replace('NAME', name)
        .replace('ARROW_FUNCTION', writeArrowFunction(node));
    };

    const getFunctionDescriptor = node => {
      return {
        body: getBodySource(node),
        name: getFunctionName(node),
        isAsync: isAsyncFunction(node),
        isGenerator: isGeneratorFunction(node),
        params: getParamsSource(node.params)
      };
    };

    const isPrototypeAssignment = node => {
      return context
        .getAncestors()
        .reverse()
        .some(ancestor => {
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

    const isWithinClassBody = node => {
      return context
        .getAncestors()
        .reverse()
        .some(ancestor => {
          return ancestor.type === 'ClassBody';
        });
    };

    const isNamedDefaultExport = node =>
      node.id &&
      node.id.name &&
      node.parent.type === 'ExportDefaultDeclaration';

    const isSafeTransformation = node => {
      return (
        !isGeneratorFunction(node) &&
        !containsThis(node) &&
        !containsSuper(node) &&
        !containsArguments(node) &&
        !containsNewDotTarget(node) &&
        (!isPrototypeAssignment(node) || disallowPrototype) &&
        (!singleReturnOnly ||
          (returnsImmediately(node) && !isNamedDefaultExport(node)))
      );
    };

    const getMessage = node => {
      return singleReturnOnly && returnsImmediately(node)
        ? USE_ARROW_WHEN_SINGLE_RETURN
        : USE_ARROW_WHEN_FUNCTION;
    };

    return {
      'ExportDefaultDeclaration > FunctionDeclaration': node => {
        if (isSafeTransformation(node)) {
          context.report({
            message: getMessage(node),
            node,
            fix: fixer =>
              fixer.replaceText(node, writeArrowFunction(node) + ';')
          });
        }
      },
      ':matches(ClassProperty, MethodDefinition, Property)[key.name][value.type="FunctionExpression"][kind!=/^(get|set)$/]': node => {
        const propName = node.key.name;
        const functionNode = node.value;
        if (
          isSafeTransformation(functionNode) &&
          (!isWithinClassBody(functionNode) || classPropertiesAllowed)
        ) {
          context.report({
            message: getMessage(functionNode),
            node: functionNode,
            fix: fixer =>
              fixer.replaceText(
                node,
                isWithinClassBody(node)
                  ? `${propName} = ${writeArrowFunction(functionNode)};`
                  : `${propName}: ${writeArrowFunction(functionNode)}`
              )
          });
        }
      },
      'ArrowFunctionExpression[body.type!="BlockStatement"]': node => {
        if (returnStyle === 'explicit' && isSafeTransformation(node)) {
          context.report({
            message: USE_EXPLICIT,
            node,
            fix: fixer => fixer.replaceText(node, writeArrowFunction(node))
          });
        }
      },
      'ArrowFunctionExpression[body.body.length=1][body.body.0.type="ReturnStatement"]': node => {
        if (returnStyle === 'implicit' && isSafeTransformation(node)) {
          context.report({
            message: USE_IMPLICIT,
            node,
            fix: fixer => fixer.replaceText(node, writeArrowFunction(node))
          });
        }
      },
      'FunctionExpression[parent.type!=/^(ClassProperty|MethodDefinition|Property)$/]': node => {
        if (isSafeTransformation(node)) {
          context.report({
            message: getMessage(node),
            node,
            fix: fixer => fixer.replaceText(node, writeArrowFunction(node))
          });
        }
      },
      'FunctionDeclaration[parent.type!="ExportDefaultDeclaration"]': node => {
        if (isSafeTransformation(node)) {
          context.report({
            message: getMessage(node),
            node,
            fix: fixer =>
              fixer.replaceText(node, writeArrowConstant(node) + ';')
          });
        }
      }
    };
  }
};
