/**
 * Utility functions to perform ast transforms
 */
import * as ast from "./ast";

export class TransformError extends Error {}

export function declareToAssign(
  declareStatement: ast.DeclareStatement
): ast.Assign {
  if (declareStatement.value == null) {
    throw new TransformError(
      "Cannot transform declare statement with no value to assign"
    );
  }
  return {
    type: "Assign",
    left: {
      type: "Identifier",
      name: declareStatement.name,
    },
    right: declareStatement.value,
  };
}

export function closure(...statements: ast.Statement[]): ast.Func {
  return {
    type: "Func",
    params: [],
    body: {
      type: "BlockStatement",
      body: statements,
    },
  };
}

export function expressionStatement(
  expression: ast.Expression
): ast.ExpressionStatement {
  return {
    type: "ExpressionStatement",
    value: expression,
  };
}

export function expression(
  expressionStatement: ast.ExpressionStatement
): ast.Expression {
  return expressionStatement.value;
}

export function declare(
  name: ast.Name,
  expression: ast.Expression
): ast.DeclareStatement {
  return {
    type: "DeclareStatement",
    name: name,
    value: expression,
  };
}
