import { TSESTree } from '@typescript-eslint/types';

export type AnyFunctionBody = TSESTree.BlockStatement | TSESTree.Expression;
export type AnyFunction = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
export type NameableFunction = TSESTree.FunctionDeclaration | TSESTree.FunctionExpression;
export type NamedFunction = NameableFunction & { id: TSESTree.Identifier };
export type GeneratorFunction = NameableFunction & { generator: true };
export type WithTypeParameters<T extends AnyFunction> = T & { typeParameters: TSESTree.TSTypeParameterDeclaration };
export type MessageId = keyof typeof MESSAGES_BY_ID;
export type Options = [ActualOptions];

export interface ActualOptions {
  allowNamedFunctions: boolean;
  classPropertiesAllowed: boolean;
  disallowPrototype: boolean;
  returnStyle: 'explicit' | 'implicit' | 'unchanged';
  singleReturnOnly: boolean;
}

export const DEFAULT_OPTIONS: ActualOptions = {
  allowNamedFunctions: false,
  classPropertiesAllowed: false,
  disallowPrototype: false,
  returnStyle: 'unchanged',
  singleReturnOnly: false,
};

export const MESSAGES_BY_ID = {
  USE_ARROW_WHEN_FUNCTION: 'Prefer using arrow functions over plain functions',
  USE_ARROW_WHEN_SINGLE_RETURN: 'Prefer using arrow functions when the function contains only a return',
  USE_EXPLICIT: 'Prefer using explicit returns when the arrow function contain only a return',
  USE_IMPLICIT: 'Prefer using implicit returns when the arrow function contain only a return',
} as const;
