/**
 * Parse code from string -> ESTree -> AST
 */

import * as ast from "../core/ast";
import { parseScript, ESTree } from "meriyah";

class NotSupported extends Error {
  constructor(readonly message: string) {
    super(message);
  }
}

function assert(condition: boolean, error: Error) {
  if (!condition) throw Error;
}

function isIdentifier(
  declarator: ESTree.VariableDeclarator["id"]
): declarator is ESTree.Identifier {
  return declarator.type == "Identifier";
}

export function parse(code: string): ESTree.Program {
  return parseScript(code, {
    ranges: false,
    loc: false,
    globalReturn: true,
    preserveParens: false,
    jsx: true,
    module: true,
  });
}

export function programToAst(program: ESTree.Program): ast.Block {
  return {
    type: "Block",
    body: program.body.map((statement) => statementToAst(statement)),
  };
}

export function parseToAst(code: string): ast.Block {
  return programToAst(parse(code));
}

export function statementToAst(statement: ESTree.Statement): ast.Statement {
  switch (statement.type) {
    case "BlockStatement":
      return {
        type: "Block",
        body: statement.body.map((subStatement) =>
          statementToAst(subStatement)
        ),
      };
    case "VariableDeclaration":
      if (statement.kind != "let") {
        throw new NotSupported(
          `Only let declarations are supported, not ${statement.kind}`
        );
      }
      const declarations = statement.declarations;
      assert(
        declarations.length == 1,
        new NotSupported("Only 1 variable can be declared at once")
      );
      const declarator = declarations[0];
      if (!isIdentifier(declarator.id)) {
        throw new NotSupported("Variable declarators must be identifiers");
      }
      const name = declarator.id.name;
      if (declarator.init == null) {
        throw new NotSupported(
          "Variable declarator expressions must be non-null"
        );
      }
      const expression = expressionToAst(declarator.init);
      return { type: "Declare", name, value: expression };
    case "ReturnStatement":
      if (statement.argument == null) {
        // Null return value
        return {
          type: "Return",
          value: null,
        };
      }
      return {
        type: "Return",
        value: expressionToAst(statement.argument),
      };
  }
  throw new NotSupported(`Unsupported statement: ${statement.type}`);
}

export function expressionToAst(expression: ESTree.Expression): ast.Expression {
  switch (expression.type) {
    case "Literal":
      return {
        type: "Literal",
        value: literalToAst(expression.value),
      };
    case "Identifier":
      return {
        type: "Identifier",
        name: expression.name,
      };
    case "BinaryExpression":
      return binaryExpressionToAst(expression);
    case "ArrayExpression":
      return {
        type: "List",
        value: expression.elements.map((element) => {
          if (element == null) {
            throw new NotSupported("Empty array elements not yet supported");
          }
          return expressionToAst(element);
        }),
      };
    case "JSXElement":
      const openingElementName = expression.openingElement.name;
      if (openingElementName.type != "JSXIdentifier") {
        throw new NotSupported(
          "Only simple identifiers are supported as tag names"
        );
      }
      if (expression.openingElement.attributes.length > 0) {
        throw new NotSupported("JSX attributes are not yet supported");
      }
      const children: ast.Expression[] = [];
      for (const child of expression.children) {
        const transformedChild = JSXChildToAst(child);
        if (transformedChild == null) {
          // Skip empty children
          continue;
        }
        children.push(transformedChild);
      }
      return {
        type: "Element",
        tag: openingElementName.name,
        children,
      };
    case "ArrowFunctionExpression":
      if (expression.async) {
        throw new NotSupported("Async arrow functions not yet supported");
      }
      return {
        type: "Func",
        params: expression.params.map((identifier) =>
          extractIdentifierName(identifier)
        ),
        body: functionBodyToAst(expression.body),
      };
    case "CallExpression":
      return {
        type: "Call",
        func: expressionToAst(expression.callee as ESTree.Expression), // ESTree.CallExpression.callee is typed as any in meriyah
        arguments: expression.arguments.map((subExpression) =>
          expressionToAst(subExpression)
        ),
      };
  }
  throw new NotSupported(`Unsupported expression: ${expression.type}`);
}

export function extractIdentifierName(
  expression: ESTree.Expression | ESTree.Parameter
): string {
  if (expression.type == "Identifier") {
    return expression.name;
  }
  throw new NotSupported(`Expected identifier, got ${expression.type}`);
}

export function functionBodyToAst(
  body: ESTree.Expression | ESTree.BlockStatement
): ast.Statement {
  if (body.type == "BlockStatement") {
    return {
      type: "Block",
      body: body.body.map((statement) => statementToAst(statement)),
    };
  }
  return {
    type: "Return",
    value: expressionToAst(body),
  };
}

export function literalToAst(
  expression: ESTree.Literal["value"]
): ast.Literal["value"] {
  if (expression == null)
    return {
      type: "NullLiteral",
    };
  switch (typeof expression) {
    case "string":
      return {
        type: "StringLiteral",
        value: expression,
      };
    case "number":
      return {
        type: "NumberLiteral",
        value: expression,
      };
  }
  throw new NotSupported(
    `Unsupported literal ${expression} (${typeof expression})`
  );
}

export function binaryExpressionToAst(
  expression: ESTree.BinaryExpression
): ast.Expression {
  switch (expression.operator) {
    case "+":
      return {
        type: "Plus",
        left: expressionToAst(expression.left),
        right: expressionToAst(expression.right),
      };
  }
  throw new NotSupported(
    `Unsupported binary expression (${expression.operator})`
  );
}

export function JSXChildToAst(child: ESTree.JSXChild): ast.Expression | null {
  switch (child.type) {
    case "JSXEmptyExpression":
      return null;
    case "JSXElement":
      return expressionToAst(child);
    case "JSXText":
      return {
        type: "Literal",
        value: {
          type: "StringLiteral",
          value: child.value,
        },
      };
    case "JSXExpressionContainer":
      if (child.expression.type == "JSXEmptyExpression") {
        // Empty expressions evaluate to null
        return null;
      }
      return expressionToAst(child.expression);
    case "JSXFragment":
      throw new NotSupported("JSX fragments not yet supported");
    case "JSXSpreadChild":
      throw new NotSupported("JSX spread children not yet supported");
  }
}
