/**
 * Run optimizations on the Poly AST
 */

import { BlockStatement, Statement, Expression, Literal } from "./ast";

export class Context {}

export function constantAdd(left: Literal, right: Literal): Expression {
  if (
    left.value.type == "NumberLiteral" &&
    right.value.type == "NumberLiteral"
  ) {
    return {
      type: "Literal",
      value: {
        type: "NumberLiteral",
        value: left.value.value + right.value.value,
      },
    };
  }

  if (
    left.value.type == "StringLiteral" &&
    right.value.type == "StringLiteral"
  ) {
    return {
      type: "Literal",
      value: {
        type: "StringLiteral",
        value: left.value.value + right.value.value,
      },
    };
  }

  throw new Error(`Cannot add ${left.value} and ${right.value}`);
}

export function optimizeExpression(
  _context: Context,
  expression: Expression
): Expression {
  switch (expression.type) {
    case "Plus":
      if (
        expression.left.type == "Literal" &&
        expression.right.type == "Literal"
      ) {
        return constantAdd(expression.left, expression.right);
      }
    default:
      return expression;
  }
}

export function optimizeStatement(
  context: Context,
  statement: Statement
): Statement {
  switch (statement.type) {
    case "BlockStatement":
      return optimize(statement);
    case "DeclareStatement":
      statement.value = optimizeExpression(context, statement.value);
      return statement;
    case "ReturnStatement":
      if (statement.value != null) {
        statement.value = optimizeExpression(context, statement.value);
      }
      return statement;
    case "ExpressionStatement":
      statement.value = optimizeExpression(context, statement.value);
      return statement;
  }
}

export function optimize(code: BlockStatement): BlockStatement {
  const context = new Context();
  const statements: BlockStatement = {
    type: "BlockStatement",
    body: [],
  };
  for (let i = 0; i < code.body.length; i++) {
    statements.body.push(optimizeStatement(context, code.body[i]));
  }
  return statements;
}
